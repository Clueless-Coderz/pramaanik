// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title SchemeRegistry
/// @notice On-chain registry of government welfare schemes.
///         Each scheme has a sanctioned budget, implementing agency, and lifecycle state.
///         Only ADMIN_ROLE can register/update schemes; AUDITOR_ROLE can freeze for investigation.
contract SchemeRegistry is AccessControlUpgradeable, UUPSUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Types ───────────────────────────────────────────────────────────
    enum SchemeStatus { Draft, Active, Paused, Frozen, Completed }

    struct Scheme {
        bytes32 schemeId;               // keccak256(name + ministry + FY)
        string name;                    // e.g. "PM-KISAN FY2025-26"
        string ministry;                // e.g. "Ministry of Agriculture"
        string implementingAgency;      // e.g. "Dept of Agriculture, Cooperation & Farmers' Welfare"
        uint256 sanctionedBudget;       // in paisa (1 INR = 100 paisa) for integer math
        uint256 disbursed;              // running total of disbursements
        uint256 beneficiaryCount;       // registered beneficiary count
        SchemeStatus status;
        uint64 createdAt;
        uint64 updatedAt;
        string metadataIpfsCid;         // IPFS CID for extended scheme docs
    }

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(bytes32 => Scheme) public schemes;
    bytes32[] public schemeIds;
    uint256 public schemeCount;

    // ─── Events ──────────────────────────────────────────────────────────
    event SchemeRegistered(bytes32 indexed schemeId, string name, uint256 sanctionedBudget);
    event SchemeStatusChanged(bytes32 indexed schemeId, SchemeStatus oldStatus, SchemeStatus newStatus);
    event SchemeBudgetRevised(bytes32 indexed schemeId, uint256 oldBudget, uint256 newBudget);
    event SchemeFrozen(bytes32 indexed schemeId, address indexed frozenBy, string reason);

    // ─── Errors ──────────────────────────────────────────────────────────
    error SchemeAlreadyExists(bytes32 schemeId);
    error SchemeNotFound(bytes32 schemeId);
    error InvalidBudget();
    error SchemeNotActive(bytes32 schemeId);
    error BudgetExceeded(bytes32 schemeId, uint256 requested, uint256 remaining);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(address _admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
    }

    // ─── Scheme Lifecycle ────────────────────────────────────────────────

    /// @notice Register a new government scheme.
    /// @param _name Human-readable scheme name.
    /// @param _ministry Responsible ministry.
    /// @param _agency Implementing agency.
    /// @param _sanctionedBudget Total sanctioned budget in paisa.
    /// @param _metadataCid IPFS CID for scheme documentation.
    function registerScheme(
        string calldata _name,
        string calldata _ministry,
        string calldata _agency,
        uint256 _sanctionedBudget,
        string calldata _metadataCid
    ) external onlyRole(ADMIN_ROLE) returns (bytes32 schemeId) {
        if (_sanctionedBudget == 0) revert InvalidBudget();

        schemeId = keccak256(abi.encodePacked(_name, _ministry, block.timestamp));
        if (schemes[schemeId].createdAt != 0) revert SchemeAlreadyExists(schemeId);

        schemes[schemeId] = Scheme({
            schemeId: schemeId,
            name: _name,
            ministry: _ministry,
            implementingAgency: _agency,
            sanctionedBudget: _sanctionedBudget,
            disbursed: 0,
            beneficiaryCount: 0,
            status: SchemeStatus.Active,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            metadataIpfsCid: _metadataCid
        });

        schemeIds.push(schemeId);
        schemeCount++;

        emit SchemeRegistered(schemeId, _name, _sanctionedBudget);
    }

    /// @notice Change scheme status (Admin: Draft/Active/Paused/Completed).
    function setSchemeStatus(bytes32 _schemeId, SchemeStatus _newStatus)
        external
        onlyRole(ADMIN_ROLE)
    {
        Scheme storage s = _getScheme(_schemeId);
        SchemeStatus old = s.status;
        s.status = _newStatus;
        s.updatedAt = uint64(block.timestamp);
        emit SchemeStatusChanged(_schemeId, old, _newStatus);
    }

    /// @notice Freeze a scheme for investigation (Auditor privilege).
    function freezeScheme(bytes32 _schemeId, string calldata _reason)
        external
        onlyRole(AUDITOR_ROLE)
    {
        Scheme storage s = _getScheme(_schemeId);
        SchemeStatus old = s.status;
        s.status = SchemeStatus.Frozen;
        s.updatedAt = uint64(block.timestamp);
        emit SchemeFrozen(_schemeId, msg.sender, _reason);
        emit SchemeStatusChanged(_schemeId, old, SchemeStatus.Frozen);
    }

    /// @notice Revise the sanctioned budget (e.g., supplementary demand).
    function reviseBudget(bytes32 _schemeId, uint256 _newBudget)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (_newBudget == 0) revert InvalidBudget();
        Scheme storage s = _getScheme(_schemeId);
        uint256 old = s.sanctionedBudget;
        s.sanctionedBudget = _newBudget;
        s.updatedAt = uint64(block.timestamp);
        emit SchemeBudgetRevised(_schemeId, old, _newBudget);
    }

    // ─── Fund Flow Integration ───────────────────────────────────────────

    /// @notice Record a disbursement against a scheme (called by FundFlow contract).
    /// @dev Only callable by contracts with ADMIN_ROLE (FundFlow will be granted this).
    function recordDisbursement(bytes32 _schemeId, uint256 _amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        Scheme storage s = _getScheme(_schemeId);
        if (s.status != SchemeStatus.Active) revert SchemeNotActive(_schemeId);
        uint256 remaining = s.sanctionedBudget - s.disbursed;
        if (_amount > remaining) revert BudgetExceeded(_schemeId, _amount, remaining);
        s.disbursed += _amount;
        s.updatedAt = uint64(block.timestamp);
    }

    /// @notice Increment beneficiary count for a scheme.
    function incrementBeneficiaryCount(bytes32 _schemeId) external onlyRole(ADMIN_ROLE) {
        Scheme storage s = _getScheme(_schemeId);
        s.beneficiaryCount++;
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @notice Get remaining budget for a scheme.
    function remainingBudget(bytes32 _schemeId) external view returns (uint256) {
        Scheme storage s = _getScheme(_schemeId);
        return s.sanctionedBudget - s.disbursed;
    }

    /// @notice Get scheme details.
    function getScheme(bytes32 _schemeId) external view returns (Scheme memory) {
        return schemes[_schemeId];
    }

    /// @notice Get all scheme IDs (for frontend enumeration).
    function getAllSchemeIds() external view returns (bytes32[] memory) {
        return schemeIds;
    }

    // ─── Internals ───────────────────────────────────────────────────────

    function _getScheme(bytes32 _schemeId) internal view returns (Scheme storage) {
        Scheme storage s = schemes[_schemeId];
        if (s.createdAt == 0) revert SchemeNotFound(_schemeId);
        return s;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
