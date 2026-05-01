// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title GrievancePortal
/// @notice On-chain citizen grievance system — any citizen can raise a grievance
///         tied to a specific disbursement, with gasless submission via ERC-4337.
///         Grievances are tracked through resolution lifecycle and are publicly auditable.
contract GrievancePortal is AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant CSC_AGENT_ROLE = keccak256("CSC_AGENT_ROLE"); // For proxy filing (CSC)
    uint64 public constant SLA_HOURS = 72; // 72 hours auto-escalation SLA

    // ─── Types ───────────────────────────────────────────────────────────
    enum GrievanceStatus { Filed, Acknowledged, UnderReview, Resolved, Escalated, Rejected }

    struct Grievance {
        bytes32 grievanceId;
        bytes32 disbursementId;       // linked disbursement (optional)
        bytes32 schemeId;             // linked scheme
        address filedBy;              // citizen address OR agent address
        bool isAssisted;              // true if filed by CSC agent
        bytes32 nullifierHash;        // ZK-nullifier to prevent spam, preserves anonymity
        string description;
        string evidenceIpfsCid;
        GrievanceStatus status;
        string resolution;
        uint64 filedAt;
        uint64 resolvedAt;
        uint64 lastUpdatedAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(bytes32 => Grievance) public grievances;
    bytes32[] public grievanceIds;
    uint256 public grievanceCount;

    // Per-citizen grievance tracking (only for self-filed)
    mapping(address => bytes32[]) public citizenGrievances;

    // Per-scheme grievance tracking
    mapping(bytes32 => bytes32[]) public schemeGrievances;

    // To prevent spam in anonymous assisted filings
    mapping(bytes32 => bool) public usedNullifiers;

    // ─── Events ──────────────────────────────────────────────────────────
    event GrievanceFiled(
        bytes32 indexed grievanceId,
        bytes32 indexed schemeId,
        bytes32 indexed disbursementId,
        address filedBy
    );
    event AssistedGrievanceFiled(
        bytes32 indexed grievanceId,
        bytes32 indexed schemeId,
        address indexed agent,
        bytes32 nullifierHash
    );
    event GrievanceStatusChanged(bytes32 indexed grievanceId, GrievanceStatus oldStatus, GrievanceStatus newStatus);
    event GrievanceResolved(bytes32 indexed grievanceId, string resolution);
    event GrievanceEscalated(bytes32 indexed grievanceId, address escalatedBy);

    // ─── Errors ──────────────────────────────────────────────────────────
    error GrievanceNotFound(bytes32 id);
    error EmptyDescription();
    error AlreadyResolved(bytes32 id);
    error NullifierAlreadyUsed(bytes32 nullifier);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _setRoleAdmin(CITIZEN_ROLE, ADMIN_ROLE);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CSC_AGENT_ROLE, ADMIN_ROLE);
    }

    // ─── File Grievance ──────────────────────────────────────────────────

    /// @notice File a new grievance (Self-filed). Open to CITIZEN_ROLE.
    function fileGrievance(
        bytes32 _schemeId,
        bytes32 _disbursementId,
        string calldata _description,
        string calldata _evidenceCid
    ) external onlyRole(CITIZEN_ROLE) nonReentrant returns (bytes32 grievanceId) {
        if (bytes(_description).length == 0) revert EmptyDescription();

        grievanceId = keccak256(
            abi.encodePacked(msg.sender, _schemeId, _disbursementId, block.timestamp, grievanceCount)
        );

        grievances[grievanceId] = Grievance({
            grievanceId: grievanceId,
            disbursementId: _disbursementId,
            schemeId: _schemeId,
            filedBy: msg.sender,
            isAssisted: false,
            nullifierHash: bytes32(0),
            description: _description,
            evidenceIpfsCid: _evidenceCid,
            status: GrievanceStatus.Filed,
            resolution: "",
            filedAt: uint64(block.timestamp),
            resolvedAt: 0,
            lastUpdatedAt: uint64(block.timestamp)
        });

        grievanceIds.push(grievanceId);
        citizenGrievances[msg.sender].push(grievanceId);
        schemeGrievances[_schemeId].push(grievanceId);
        grievanceCount++;

        emit GrievanceFiled(grievanceId, _schemeId, _disbursementId, msg.sender);
    }

    /// @notice File an anonymous grievance on behalf of an uneducated/elderly citizen.
    ///         Uses a ZK-nullifier derived from biometric/Aadhaar signature.
    /// @dev Open to CSC_AGENT_ROLE. Protects citizen identity entirely.
    function fileGrievanceAssisted(
        bytes32 _schemeId,
        bytes32 _disbursementId,
        string calldata _description,
        string calldata _evidenceCid,
        bytes32 _nullifierHash
    ) external onlyRole(CSC_AGENT_ROLE) nonReentrant returns (bytes32 grievanceId) {
        if (bytes(_description).length == 0) revert EmptyDescription();
        if (usedNullifiers[_nullifierHash]) revert NullifierAlreadyUsed(_nullifierHash);

        usedNullifiers[_nullifierHash] = true;

        grievanceId = keccak256(
            abi.encodePacked(msg.sender, _schemeId, _nullifierHash, block.timestamp, grievanceCount)
        );

        grievances[grievanceId] = Grievance({
            grievanceId: grievanceId,
            disbursementId: _disbursementId,
            schemeId: _schemeId,
            filedBy: msg.sender, // The agent's address, NOT the citizen
            isAssisted: true,
            nullifierHash: _nullifierHash,
            description: _description,
            evidenceIpfsCid: _evidenceCid,
            status: GrievanceStatus.Filed,
            resolution: "",
            filedAt: uint64(block.timestamp),
            resolvedAt: 0,
            lastUpdatedAt: uint64(block.timestamp)
        });

        grievanceIds.push(grievanceId);
        schemeGrievances[_schemeId].push(grievanceId);
        grievanceCount++;

        emit AssistedGrievanceFiled(grievanceId, _schemeId, msg.sender, _nullifierHash);
    }

    // ─── Status Management ───────────────────────────────────────────────

    /// @notice Acknowledge a grievance (Admin).
    function acknowledgeGrievance(bytes32 _grievanceId) external onlyRole(ADMIN_ROLE) {
        Grievance storage g = _getGrievance(_grievanceId);
        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.Acknowledged;
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.Acknowledged);
    }

    /// @notice Move grievance to under-review (Admin).
    function markUnderReview(bytes32 _grievanceId) external onlyRole(ADMIN_ROLE) {
        Grievance storage g = _getGrievance(_grievanceId);
        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.UnderReview;
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.UnderReview);
    }

    /// @notice Resolve a grievance with a resolution note (Admin).
    function resolveGrievance(bytes32 _grievanceId, string calldata _resolution)
        external
        onlyRole(ADMIN_ROLE)
    {
        Grievance storage g = _getGrievance(_grievanceId);
        if (g.status == GrievanceStatus.Resolved) revert AlreadyResolved(_grievanceId);
        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.Resolved;
        g.resolution = _resolution;
        g.resolvedAt = uint64(block.timestamp);
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.Resolved);
        emit GrievanceResolved(_grievanceId, _resolution);
    }

    /// @notice Escalate a grievance (Auditor privilege).
    function escalateGrievance(bytes32 _grievanceId) external onlyRole(AUDITOR_ROLE) {
        Grievance storage g = _getGrievance(_grievanceId);
        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.Escalated;
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.Escalated);
        emit GrievanceEscalated(_grievanceId, msg.sender);
    }

    /// @notice Auto-escalate a grievance if the SLA is breached (Public).
    function autoEscalateIfSLABreached(bytes32 _grievanceId) external {
        Grievance storage g = _getGrievance(_grievanceId);
        if (g.status == GrievanceStatus.Resolved || g.status == GrievanceStatus.Rejected || g.status == GrievanceStatus.Escalated) {
            revert("Grievance already closed or escalated");
        }
        
        if (block.timestamp <= g.filedAt + (SLA_HOURS * 1 hours)) {
            revert("SLA not breached yet");
        }

        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.Escalated;
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.Escalated);
        emit GrievanceEscalated(_grievanceId, address(0)); // address(0) implies auto-escalation
    }

    /// @notice Reject a grievance with reason (Admin).
    function rejectGrievance(bytes32 _grievanceId, string calldata _reason)
        external
        onlyRole(ADMIN_ROLE)
    {
        Grievance storage g = _getGrievance(_grievanceId);
        GrievanceStatus old = g.status;
        g.status = GrievanceStatus.Rejected;
        g.resolution = _reason;
        g.lastUpdatedAt = uint64(block.timestamp);
        emit GrievanceStatusChanged(_grievanceId, old, GrievanceStatus.Rejected);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getGrievance(bytes32 _id) external view returns (Grievance memory) {
        return grievances[_id];
    }

    function getCitizenGrievances(address _citizen) external view returns (bytes32[] memory) {
        return citizenGrievances[_citizen];
    }

    function getAllGrievanceIds() external view returns (bytes32[] memory) {
        return grievanceIds;
    }

    function getGrievancesByScheme(bytes32 _schemeId) external view returns (bytes32[] memory) {
        return schemeGrievances[_schemeId];
    }

    function getGrievancesByStatus(GrievanceStatus _status) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < grievanceIds.length; i++) {
            if (grievances[grievanceIds[i]].status == _status) {
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < grievanceIds.length; i++) {
            if (grievances[grievanceIds[i]].status == _status) {
                result[index] = grievanceIds[i];
                index++;
            }
        }
        return result;
    }

    // ─── Internals ───────────────────────────────────────────────────────

    function _getGrievance(bytes32 _id) internal view returns (Grievance storage) {
        Grievance storage g = grievances[_id];
        if (g.filedAt == 0) revert GrievanceNotFound(_id);
        return g;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
