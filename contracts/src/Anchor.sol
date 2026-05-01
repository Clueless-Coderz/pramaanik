// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Anchor
/// @notice Merkle-root checkpointing contract — posts state digests to Polygon Amoy (every 15 min)
///         and Ethereum Sepolia (daily). Provides tamper-evidence even against full Besu validator collusion.
///
/// @dev    On the Besu consortium, this contract stores the Merkle root.
///         The anchor-publisher service reads these events and posts them to public chains.
///         On public chains, a mirror contract stores roots for independent verification.
contract Anchor is AccessControlUpgradeable, UUPSUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Types ───────────────────────────────────────────────────────────
    struct Checkpoint {
        bytes32 merkleRoot;          // Merkle root of all disbursement hashes since last checkpoint
        bytes32 previousCheckpoint;  // hash of the previous checkpoint (chain link)
        uint256 disbursementCount;   // number of disbursements included
        uint256 blockNumber;         // Besu block number at checkpoint time
        uint64 timestamp;
        uint256 sequenceNumber;      // monotonic checkpoint counter
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    Checkpoint[] public checkpoints;
    uint256 public checkpointCount;
    bytes32 public latestMerkleRoot;

    // Anchoring status tracking (set by the anchor-publisher service)
    mapping(uint256 => bytes32) public polygonAnchors;   // sequenceNumber => polygon tx hash
    mapping(uint256 => bytes32) public sepoliaAnchors;   // sequenceNumber => sepolia tx hash
    // Root validation: tracks all checkpointed Merkle roots
    mapping(bytes32 => bool) public isCheckpointRoot;

    // ─── Events ──────────────────────────────────────────────────────────
    event CheckpointCreated(
        uint256 indexed sequenceNumber,
        bytes32 indexed merkleRoot,
        uint256 disbursementCount,
        uint256 blockNumber,
        uint64 timestamp
    );

    event AnchorConfirmed(
        uint256 indexed sequenceNumber,
        string chain,               // "polygon_amoy" or "ethereum_sepolia"
        bytes32 txHash
    );

    // ─── Errors ──────────────────────────────────────────────────────────
    error InvalidMerkleRoot();
    error CheckpointNotFound(uint256 sequenceNumber);
    error RootNotCheckpointed(bytes32 root);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(ANCHOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _setRoleAdmin(ANCHOR_ROLE, ADMIN_ROLE);
    }

    // ─── Checkpoint Creation ─────────────────────────────────────────────

    /// @notice Create a new Merkle-root checkpoint.
    /// @param _merkleRoot The Merkle root computed from recent disbursement hashes.
    /// @param _disbursementCount Number of disbursements included in this root.
    function createCheckpoint(
        bytes32 _merkleRoot,
        uint256 _disbursementCount
    ) external onlyRole(ANCHOR_ROLE) returns (uint256 sequenceNumber) {
        if (_merkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        bytes32 prevCheckpoint = checkpointCount > 0
            ? keccak256(abi.encodePacked(checkpoints[checkpointCount - 1].merkleRoot, checkpoints[checkpointCount - 1].sequenceNumber))
            : bytes32(0);

        sequenceNumber = checkpointCount;

        checkpoints.push(Checkpoint({
            merkleRoot: _merkleRoot,
            previousCheckpoint: prevCheckpoint,
            disbursementCount: _disbursementCount,
            blockNumber: block.number,
            timestamp: uint64(block.timestamp),
            sequenceNumber: sequenceNumber
        }));

        latestMerkleRoot = _merkleRoot;
        isCheckpointRoot[_merkleRoot] = true;
        checkpointCount++;

        emit CheckpointCreated(sequenceNumber, _merkleRoot, _disbursementCount, block.number, uint64(block.timestamp));
    }

    /// @notice Record that a checkpoint has been anchored to a public chain.
    /// @param _sequenceNumber The checkpoint sequence number.
    /// @param _chain The public chain name ("polygon_amoy" or "ethereum_sepolia").
    /// @param _txHash The transaction hash on the public chain.
    function confirmAnchor(
        uint256 _sequenceNumber,
        string calldata _chain,
        bytes32 _txHash
    ) external onlyRole(ANCHOR_ROLE) {
        if (_sequenceNumber >= checkpointCount) revert CheckpointNotFound(_sequenceNumber);

        bytes32 chainHash = keccak256(bytes(_chain));
        if (chainHash == keccak256("polygon_amoy")) {
            polygonAnchors[_sequenceNumber] = _txHash;
        } else if (chainHash == keccak256("ethereum_sepolia")) {
            sepoliaAnchors[_sequenceNumber] = _txHash;
        }

        emit AnchorConfirmed(_sequenceNumber, _chain, _txHash);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Get a checkpoint by sequence number.
    function getCheckpoint(uint256 _seq) external view returns (Checkpoint memory) {
        if (_seq >= checkpointCount) revert CheckpointNotFound(_seq);
        return checkpoints[_seq];
    }

    /// @notice Get the latest checkpoint.
    function getLatestCheckpoint() external view returns (Checkpoint memory) {
        if (checkpointCount == 0) revert CheckpointNotFound(0);
        return checkpoints[checkpointCount - 1];
    }

    /// @notice Verify a Merkle proof for a specific disbursement hash against a checkpoint.
    /// @param _leaf The hash of the disbursement to verify.
    /// @param _proof The Merkle proof (array of sibling hashes).
    /// @param _root The Merkle root to verify against. Must be a previously checkpointed root.
    function verifyInclusion(
        bytes32 _leaf,
        bytes32[] calldata _proof,
        bytes32 _root
    ) external view returns (bool) {
        if (!isCheckpointRoot[_root]) revert RootNotCheckpointed(_root);
        bytes32 computedHash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == _root;
    }

    // ─── UUPS ────────────────────────────────────────────────────────────
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
