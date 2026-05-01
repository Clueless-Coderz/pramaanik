// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title BatchVerifier
/// @notice Gap #3 Fix: Batch multiple zk-SNARK proof verifications into a single
///         on-chain transaction to amortize gas costs. At national scale, individual
///         verification (500k-2M gas each) is prohibitive. This contract aggregates
///         proof hashes into a Merkle root, verifies the root once, and allows individual
///         proofs to be verified via Merkle inclusion.
///
/// @dev    Flow: Off-chain batch prover collects N proofs → computes Merkle root of
///         proof hashes → calls submitBatch() once → individual proofs verified via
///         verifyProofInBatch() with Merkle proof.
///         Gas savings: O(N) → O(1) for verification + O(log N) per individual check.
contract BatchVerifier is AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant PROVER_ROLE = keccak256("PROVER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct ProofBatch {
        bytes32 batchRoot;          // Merkle root of all proof hashes in the batch
        uint256 proofCount;         // number of proofs in this batch
        bytes32 modelHash;          // model version that produced all proofs
        uint64 submittedAt;
        bool rootVerified;          // did the aggregated verification pass?
        address submittedBy;
    }

    // ─── Storage ─────────────────────────────────────────────────────
    mapping(uint256 => ProofBatch) public batches;
    uint256 public batchCount;

    // Track which individual proofs have been verified via batch inclusion
    mapping(bytes32 => bool) public proofVerified;  // proofHash => verified

    // Verifier contract (EZKL-generated, verifies the batch aggregation proof)
    address public batchVerifierContract;

    // Gas savings tracker
    uint256 public totalProofsVerified;
    uint256 public totalBatchesProcessed;

    // ─── Events ──────────────────────────────────────────────────────
    event BatchSubmitted(
        uint256 indexed batchId,
        bytes32 indexed batchRoot,
        uint256 proofCount,
        bool verified
    );

    event ProofVerifiedInBatch(
        bytes32 indexed proofHash,
        uint256 indexed batchId
    );

    // ─── Errors ──────────────────────────────────────────────────────
    error InvalidBatchRoot();
    error BatchNotFound(uint256 batchId);
    error BatchNotVerified(uint256 batchId);
    error ProofNotInBatch();
    error ProofAlreadyVerified(bytes32 proofHash);

    // ─── Initializer ─────────────────────────────────────────────────
    function initialize(address _admin, address _batchVerifier) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PROVER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        batchVerifierContract = _batchVerifier;
    }

    // ─── Batch Submission ────────────────────────────────────────────

    /// @notice Submit a batch of proof hashes as a single Merkle root.
    /// @param _batchRoot Merkle root of all proof hashes.
    /// @param _proofCount Number of individual proofs in the batch.
    /// @param _modelHash Model version hash.
    /// @param _aggregatedProof Optional: aggregated proof bytes for on-chain verification.
    function submitBatch(
        bytes32 _batchRoot,
        uint256 _proofCount,
        bytes32 _modelHash,
        bytes calldata _aggregatedProof
    ) external onlyRole(PROVER_ROLE) returns (uint256 batchId) {
        if (_batchRoot == bytes32(0)) revert InvalidBatchRoot();
        require(_proofCount > 0 && _proofCount <= 10000, "Invalid proof count (1-10000)");

        bool verified = _verifyBatchProof(_aggregatedProof, _batchRoot);

        batchId = batchCount;
        batches[batchId] = ProofBatch({
            batchRoot: _batchRoot,
            proofCount: _proofCount,
            modelHash: _modelHash,
            submittedAt: uint64(block.timestamp),
            rootVerified: verified,
            submittedBy: msg.sender
        });

        batchCount++;
        totalBatchesProcessed++;

        emit BatchSubmitted(batchId, _batchRoot, _proofCount, verified);
    }

    /// @notice Verify an individual proof's inclusion in a verified batch.
    /// @param _proofHash The hash of the individual proof.
    /// @param _batchId The batch this proof belongs to.
    /// @param _merkleProof Merkle siblings for inclusion proof.
    function verifyProofInBatch(
        bytes32 _proofHash,
        uint256 _batchId,
        bytes32[] calldata _merkleProof
    ) external returns (bool) {
        if (_batchId >= batchCount) revert BatchNotFound(_batchId);
        ProofBatch storage batch = batches[_batchId];
        if (!batch.rootVerified) revert BatchNotVerified(_batchId);
        if (proofVerified[_proofHash]) revert ProofAlreadyVerified(_proofHash);

        // Verify Merkle inclusion
        bool included = _verifyInclusion(_proofHash, _merkleProof, batch.batchRoot);
        if (!included) revert ProofNotInBatch();

        proofVerified[_proofHash] = true;
        totalProofsVerified++;

        emit ProofVerifiedInBatch(_proofHash, _batchId);
        return true;
    }

    /// @notice Check if a proof has been verified (by any method).
    function isProofVerified(bytes32 _proofHash) external view returns (bool) {
        return proofVerified[_proofHash];
    }

    /// @notice Get estimated gas savings.
    /// @dev    Individual verification: ~1M gas each. Batch: ~1M once + ~50k per inclusion check.
    ///         Savings = totalProofsVerified * 950k gas.
    function estimatedGasSaved() external view returns (uint256) {
        return totalProofsVerified * 950000; // approximate
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _verifyBatchProof(bytes calldata _proof, bytes32 _batchRoot)
        internal
        view
        returns (bool)
    {
        if (batchVerifierContract == address(0)) {
            return true; // Mock mode for demo
        }
        (bool success, bytes memory result) = batchVerifierContract.staticcall(
            abi.encodeWithSignature("verify(bytes,bytes32)", _proof, _batchRoot)
        );
        if (!success || result.length == 0) return false;
        return abi.decode(result, (bool));
    }

    function _verifyInclusion(
        bytes32 _leaf,
        bytes32[] calldata _proof,
        bytes32 _root
    ) internal pure returns (bool) {
        bytes32 computedHash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 sibling = _proof[i];
            if (computedHash <= sibling) {
                computedHash = keccak256(abi.encodePacked(computedHash, sibling));
            } else {
                computedHash = keccak256(abi.encodePacked(sibling, computedHash));
            }
        }
        return computedHash == _root;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
