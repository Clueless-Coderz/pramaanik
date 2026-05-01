// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title FundFlow
/// @notice The heart of PRAMAANIK — tracks every rupee from Consolidated Fund sanction
///         through state treasuries, implementing agencies, and down to last-mile beneficiaries.
///         Each disbursement is an immutable event with oracle-attested preconditions.
///
/// @dev    Fund flow is recorded as state transitions, NOT as ERC-20 transfers.
///         Real money moves through PFMS/NPCI rails; this contract creates the
///         cryptographic chain-of-custody shadow that proves integrity.
contract FundFlow is AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Types ───────────────────────────────────────────────────────────
    enum FlowStage {
        Sanctioned,         // Budget sanctioned by ministry
        ReleasedToState,    // Funds released to state treasury
        ReleasedToAgency,   // State releases to implementing agency
        ReleasedToVendor,   // Agency pays vendor/contractor
        ReleasedToBeneficiary, // Direct benefit transfer to beneficiary
        WorkCompleted,      // Work-completion attestation received
        Flagged,            // Anomaly detected — under review
        Frozen              // Frozen by auditor pending investigation
    }

    struct Disbursement {
        bytes32 disbursementId;
        bytes32 schemeId;           // links to SchemeRegistry
        FlowStage stage;
        address from;               // sender (treasury/agency/vendor account)
        bytes32 toPseudonymDid;     // pseudonymous DID hash of recipient
        uint256 amount;              // in paisa
        uint64 timestamp;
        bytes32 supportingDocHash;   // SHA-256 of invoice/work-photo on IPFS
        string ipfsCid;              // IPFS CID for supporting docs
        bytes32 oracleAttestationHash; // hash of oracle responses at disbursement time
        bool gstValid;               // GST oracle check result
        bool bankAccountUnique;      // bank-dedup oracle check result
        bool geotagVerified;         // geotag oracle check result
    }

    struct AnomalyFlag {
        bytes32 disbursementId;
        uint256 riskScore;           // 0-10000 (basis points: 10000 = 100%)
        bytes32 proofHash;           // keccak256 of the EZKL zk-SNARK proof
        string explanation;          // PANG-style human-readable motif
        uint64 flaggedAt;
        address flaggedBy;           // oracle/GNN service address
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(bytes32 => Disbursement) public disbursements;
    mapping(bytes32 => AnomalyFlag[]) public anomalyFlags;
    bytes32[] public disbursementIds;
    uint256 public totalDisbursementCount;
    uint256 public totalFlaggedCount;

    // ─── Oracle attestation tracking ─────────────────────────────────────
    mapping(bytes32 => bool) public oracleAttestations; // attestationHash => verified

    // ─── Linked contracts ────────────────────────────────────────────────
    address public schemeRegistry;
    address public anomalyOracle;

    // ─── Events ──────────────────────────────────────────────────────────
    event DisbursementCreated(
        bytes32 indexed disbursementId,
        bytes32 indexed schemeId,
        FlowStage stage,
        address indexed from,
        bytes32 toPseudonymDid,
        uint256 amount
    );

    event DisbursementStageAdvanced(
        bytes32 indexed disbursementId,
        FlowStage oldStage,
        FlowStage newStage
    );

    event SuspiciousTransactionFlagged(
        bytes32 indexed disbursementId,
        uint256 riskScore,
        bytes32 proofHash,
        string explanation
    );

    event DisbursementFrozen(bytes32 indexed disbursementId, address indexed frozenBy);
    event OracleAttestationRecorded(bytes32 indexed attestationHash, bytes32 indexed disbursementId);

    // ─── Errors ──────────────────────────────────────────────────────────
    error DisbursementAlreadyExists(bytes32 id);
    error DisbursementNotFound(bytes32 id);
    error InvalidAmount();
    error InvalidStageTransition(FlowStage current, FlowStage requested);
    error OracleCheckFailed(string check);
    error DisbursementFrozenError(bytes32 id);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(
        address _admin,
        address _schemeRegistry,
        address _anomalyOracle
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(ORACLE_ROLE, ADMIN_ROLE);

        schemeRegistry = _schemeRegistry;
        anomalyOracle = _anomalyOracle;
    }

    // ─── Core Fund Flow ──────────────────────────────────────────────────

    /// @notice Create a new disbursement record with oracle attestations.
    /// @dev    Checks-Effects-Interactions pattern enforced.
    function createDisbursement(
        bytes32 _schemeId,
        FlowStage _stage,
        bytes32 _toPseudonymDid,
        uint256 _amount,
        bytes32 _supportingDocHash,
        string calldata _ipfsCid,
        bool _gstValid,
        bool _bankAccountUnique,
        bool _geotagVerified
    ) external onlyRole(ADMIN_ROLE) nonReentrant returns (bytes32 disbursementId) {
        if (_amount == 0) revert InvalidAmount();

        // Generate unique disbursement ID
        disbursementId = keccak256(
            abi.encodePacked(_schemeId, msg.sender, _toPseudonymDid, _amount, block.timestamp, totalDisbursementCount)
        );
        if (disbursements[disbursementId].timestamp != 0) revert DisbursementAlreadyExists(disbursementId);

        // Oracle attestation hash for tamper evidence
        bytes32 attestationHash = keccak256(
            abi.encodePacked(_gstValid, _bankAccountUnique, _geotagVerified, block.timestamp)
        );

        // Effects: store disbursement
        disbursements[disbursementId] = Disbursement({
            disbursementId: disbursementId,
            schemeId: _schemeId,
            stage: _stage,
            from: msg.sender,
            toPseudonymDid: _toPseudonymDid,
            amount: _amount,
            timestamp: uint64(block.timestamp),
            supportingDocHash: _supportingDocHash,
            ipfsCid: _ipfsCid,
            oracleAttestationHash: attestationHash,
            gstValid: _gstValid,
            bankAccountUnique: _bankAccountUnique,
            geotagVerified: _geotagVerified
        });

        disbursementIds.push(disbursementId);
        totalDisbursementCount++;
        oracleAttestations[attestationHash] = true;

        emit DisbursementCreated(disbursementId, _schemeId, _stage, msg.sender, _toPseudonymDid, _amount);
        emit OracleAttestationRecorded(attestationHash, disbursementId);
    }

    /// @notice Advance a disbursement to the next stage in the fund flow.
    function advanceStage(bytes32 _disbursementId, FlowStage _newStage)
        external
        onlyRole(ADMIN_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        if (d.stage == FlowStage.Frozen) revert DisbursementFrozenError(_disbursementId);
        if (uint8(_newStage) <= uint8(d.stage)) revert InvalidStageTransition(d.stage, _newStage);

        FlowStage old = d.stage;
        d.stage = _newStage;

        emit DisbursementStageAdvanced(_disbursementId, old, _newStage);
    }

    // ─── Anomaly Flagging ────────────────────────────────────────────────

    /// @notice Flag a disbursement as suspicious (called by AnomalyOracle or ORACLE_ROLE).
    /// @param _disbursementId The disbursement to flag.
    /// @param _riskScore Risk score in basis points (0-10000).
    /// @param _proofHash keccak256 of the EZKL zk-SNARK proof bytes.
    /// @param _explanation Human-readable PANG-style motif explanation.
    function flagSuspicious(
        bytes32 _disbursementId,
        uint256 _riskScore,
        bytes32 _proofHash,
        string calldata _explanation
    ) external onlyRole(ORACLE_ROLE) {
        Disbursement storage d = _getDisbursement(_disbursementId);

        anomalyFlags[_disbursementId].push(AnomalyFlag({
            disbursementId: _disbursementId,
            riskScore: _riskScore,
            proofHash: _proofHash,
            explanation: _explanation,
            flaggedAt: uint64(block.timestamp),
            flaggedBy: msg.sender
        }));

        // Auto-flag the disbursement stage if high risk
        if (_riskScore >= 7500 && d.stage != FlowStage.Frozen) {
            d.stage = FlowStage.Flagged;
        }

        totalFlaggedCount++;

        emit SuspiciousTransactionFlagged(_disbursementId, _riskScore, _proofHash, _explanation);
    }

    /// @notice Freeze a flagged disbursement (Auditor privilege — human-in-the-loop).
    function freezeDisbursement(bytes32 _disbursementId)
        external
        onlyRole(AUDITOR_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        d.stage = FlowStage.Frozen;
        emit DisbursementFrozen(_disbursementId, msg.sender);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Get a disbursement by ID.
    function getDisbursement(bytes32 _id) external view returns (Disbursement memory) {
        return disbursements[_id];
    }

    /// @notice Get all anomaly flags for a disbursement.
    function getAnomalyFlags(bytes32 _id) external view returns (AnomalyFlag[] memory) {
        return anomalyFlags[_id];
    }

    /// @notice Get all disbursement IDs (paginated access recommended off-chain).
    function getAllDisbursementIds() external view returns (bytes32[] memory) {
        return disbursementIds;
    }

    /// @notice Get disbursement IDs in a range (for pagination).
    function getDisbursementIdsPaginated(uint256 _offset, uint256 _limit)
        external
        view
        returns (bytes32[] memory result)
    {
        uint256 len = disbursementIds.length;
        if (_offset >= len) return new bytes32[](0);

        uint256 end = _offset + _limit;
        if (end > len) end = len;

        result = new bytes32[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = disbursementIds[i];
        }
    }

    // ─── Internals ───────────────────────────────────────────────────────

    function _getDisbursement(bytes32 _id) internal view returns (Disbursement storage) {
        Disbursement storage d = disbursements[_id];
        if (d.timestamp == 0) revert DisbursementNotFound(_id);
        return d;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
