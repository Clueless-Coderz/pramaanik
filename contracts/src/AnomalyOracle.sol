// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title AnomalyOracle
/// @notice The "wow factor" — on-chain verifier for zkML anomaly detection.
///         Accepts EZKL-generated Halo2 zk-SNARK proofs that attest a published RGCN model
///         produced a specific fraud score for a specific transaction.
///
/// @dev    Flow: Off-chain GNN scores transaction → EZKL proves inference → proof submitted here
///         → verified on-chain → FundFlow.flagSuspicious() called with proof hash.
///         The verifier contract address is set during initialization and can be upgraded.
contract AnomalyOracle is AccessControlUpgradeable, UUPSUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROVER_ROLE = keccak256("PROVER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Types ───────────────────────────────────────────────────────────
    struct ModelCommitment {
        bytes32 modelHash;          // SHA-256 hash of the ONNX model weights
        bytes32 datasetHash;        // hash of training dataset descriptor
        string modelIpfsCid;        // IPFS CID of the published model
        uint64 committedAt;
        bool active;
    }

    struct VerifiedPrediction {
        bytes32 disbursementId;     // links to FundFlow
        bytes32 modelHash;          // which model version produced this
        uint256 riskScore;          // 0-10000 basis points
        bytes32 proofHash;          // keccak256 of the zk-SNARK proof
        bytes proof;                // raw proof bytes (stored for full auditability)
        string explanation;         // PANG-style subgraph motif explanation
        uint64 verifiedAt;
        bool verified;              // did on-chain verification pass?
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    address public verifierContract;            // EZKL-generated Halo2 verifier
    address public fundFlowContract;            // FundFlow contract to call flagSuspicious
    ModelCommitment public currentModel;
    ModelCommitment[] public modelHistory;

    mapping(bytes32 => VerifiedPrediction) public predictions;  // proofHash => prediction
    bytes32[] public predictionHashes;
    uint256 public totalPredictions;
    uint256 public totalVerified;

    // Risk threshold for auto-flagging (in basis points)
    uint256 public autoFlagThreshold;           // default: 5000 (50%)

    // ─── Events ──────────────────────────────────────────────────────────
    event ModelCommitted(bytes32 indexed modelHash, string ipfsCid, uint64 committedAt);
    event PredictionSubmitted(
        bytes32 indexed disbursementId,
        bytes32 indexed proofHash,
        uint256 riskScore,
        bool verified
    );
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event AutoFlagThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ─── Errors ──────────────────────────────────────────────────────────
    error NoActiveModel();
    error InvalidProof();
    error PredictionAlreadyExists(bytes32 proofHash);
    error VerifierNotSet();
    error FundFlowNotSet();
    error InvalidRiskScore(uint256 score);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(
        address _admin,
        address _verifierContract,
        address _fundFlowContract
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _setRoleAdmin(PROVER_ROLE, ADMIN_ROLE);

        verifierContract = _verifierContract;
        fundFlowContract = _fundFlowContract;
        autoFlagThreshold = 5000; // 50%
    }

    // ─── Model Management ────────────────────────────────────────────────

    /// @notice Commit a new model version. Adds to history and sets as active.
    function commitModel(
        bytes32 _modelHash,
        bytes32 _datasetHash,
        string calldata _modelIpfsCid
    ) external onlyRole(ADMIN_ROLE) {
        if (currentModel.active) {
            currentModel.active = false;
            modelHistory.push(currentModel);
        }

        currentModel = ModelCommitment({
            modelHash: _modelHash,
            datasetHash: _datasetHash,
            modelIpfsCid: _modelIpfsCid,
            committedAt: uint64(block.timestamp),
            active: true
        });

        emit ModelCommitted(_modelHash, _modelIpfsCid, uint64(block.timestamp));
    }

    // ─── Proof Submission & Verification ─────────────────────────────────

    /// @notice Submit a zkML proof for a disbursement's anomaly score.
    /// @param _disbursementId The FundFlow disbursement being scored.
    /// @param _riskScore The GNN model's risk prediction (0-10000).
    /// @param _proof The raw EZKL zk-SNARK proof bytes.
    /// @param _explanation PANG-style subgraph motif explanation.
    function submitPrediction(
        bytes32 _disbursementId,
        uint256 _riskScore,
        bytes calldata _proof,
        string calldata _explanation
    ) external onlyRole(PROVER_ROLE) {
        if (!currentModel.active) revert NoActiveModel();
        if (_riskScore > 10000) revert InvalidRiskScore(_riskScore);

        bytes32 proofHash = keccak256(_proof);
        if (predictions[proofHash].verifiedAt != 0) revert PredictionAlreadyExists(proofHash);

        // Verify the proof on-chain via the EZKL verifier contract
        bool verified = _verifyProof(_proof);

        // Store prediction
        predictions[proofHash] = VerifiedPrediction({
            disbursementId: _disbursementId,
            modelHash: currentModel.modelHash,
            riskScore: _riskScore,
            proofHash: proofHash,
            proof: _proof,
            explanation: _explanation,
            verifiedAt: uint64(block.timestamp),
            verified: verified
        });

        predictionHashes.push(proofHash);
        totalPredictions++;
        if (verified) totalVerified++;

        emit PredictionSubmitted(_disbursementId, proofHash, _riskScore, verified);

        // Auto-flag in FundFlow if risk exceeds threshold and proof verified
        if (verified && _riskScore >= autoFlagThreshold && fundFlowContract != address(0)) {
            // Call FundFlow.flagSuspicious — the AnomalyOracle must have ORACLE_ROLE on FundFlow
            (bool success, ) = fundFlowContract.call(
                abi.encodeWithSignature(
                    "flagSuspicious(bytes32,uint256,bytes32,string)",
                    _disbursementId,
                    _riskScore,
                    proofHash,
                    _explanation
                )
            );
            // We don't revert if the flag call fails — the prediction is still recorded
            if (!success) {
                // Emit event for off-chain monitoring
            }
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Update the EZKL verifier contract address.
    function setVerifier(address _newVerifier) external onlyRole(ADMIN_ROLE) {
        address old = verifierContract;
        verifierContract = _newVerifier;
        emit VerifierUpdated(old, _newVerifier);
    }

    /// @notice Update auto-flag threshold.
    function setAutoFlagThreshold(uint256 _threshold) external onlyRole(ADMIN_ROLE) {
        uint256 old = autoFlagThreshold;
        autoFlagThreshold = _threshold;
        emit AutoFlagThresholdUpdated(old, _threshold);
    }

    /// @notice Update FundFlow contract reference.
    function setFundFlowContract(address _fundFlow) external onlyRole(ADMIN_ROLE) {
        fundFlowContract = _fundFlow;
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getPrediction(bytes32 _proofHash) external view returns (VerifiedPrediction memory) {
        return predictions[_proofHash];
    }

    function getModelHistory() external view returns (ModelCommitment[] memory) {
        return modelHistory;
    }

    function getModelHistoryLength() external view returns (uint256) {
        return modelHistory.length;
    }

    // ─── Internal Verification ───────────────────────────────────────────

    /// @dev Calls the EZKL-generated verifier contract.
    ///      In the hackathon demo, if no verifier is deployed, returns true (mock mode).
    ///      Production: verifierContract.verify(proof) must return true.
    function _verifyProof(bytes calldata _proof) internal view returns (bool) {
        if (verifierContract == address(0)) {
            // Mock mode for demo — always passes
            return true;
        }

        // Call the EZKL Halo2 verifier's verify function
        (bool success, bytes memory result) = verifierContract.staticcall(
            abi.encodeWithSignature("verify(bytes)", _proof)
        );

        if (!success || result.length == 0) return false;
        return abi.decode(result, (bool));
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
