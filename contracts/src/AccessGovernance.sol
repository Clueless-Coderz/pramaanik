// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title AccessGovernance
/// @notice Tri-role DID-based access governance for PRAMAANIK.
///         Roles: ADMIN (treasury officials), AUDITOR (CAG/parliamentary), PUBLIC (citizens).
///         Integrates with Privado ID verifiable credentials off-chain; on-chain role management
///         uses OpenZeppelin AccessControl with UUPS upgradeability and TimelockController-ready admin.
contract AccessGovernance is AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    // ─── Role Constants ──────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── DID Registry ────────────────────────────────────────────────────
    struct Identity {
        string did;             // W3C DID string (e.g. did:polygonid:...)
        bytes32 vcHash;         // SHA-256 hash of the verifiable credential
        bytes32 grantedRole;    // Role granted at registration (for revocation on deactivation)
        uint64 registeredAt;
        uint64 lastActiveAt;
        bool active;
    }

    mapping(address => Identity) public identities;
    address[] public registeredAddresses;

    // ─── Events ──────────────────────────────────────────────────────────
    event IdentityRegistered(address indexed account, string did, bytes32 role);
    event IdentityDeactivated(address indexed account, string did);
    event IdentityReactivated(address indexed account, string did);

    // ─── Errors ──────────────────────────────────────────────────────────
    error AlreadyRegistered(address account);
    error NotRegistered(address account);
    error IdentityInactive(address account);
    error InvalidDID();
    error InvalidRole(bytes32 role);

    // ─── Initializer ─────────────────────────────────────────────────────
    function initialize(address _defaultAdmin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(ADMIN_ROLE, _defaultAdmin);
        _grantRole(UPGRADER_ROLE, _defaultAdmin);

        // ADMIN_ROLE manages AUDITOR_ROLE and CITIZEN_ROLE
        _setRoleAdmin(AUDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(CITIZEN_ROLE, ADMIN_ROLE);
    }

    // ─── Identity Management ─────────────────────────────────────────────

    /// @notice Register an identity with a DID and assign a role.
    /// @param _account The Ethereum address to register.
    /// @param _did The W3C DID string.
    /// @param _vcHash SHA-256 hash of the off-chain verifiable credential.
    /// @param _role The role to grant (ADMIN_ROLE, AUDITOR_ROLE, or CITIZEN_ROLE).
    function registerIdentity(
        address _account,
        string calldata _did,
        bytes32 _vcHash,
        bytes32 _role
    ) external onlyRole(ADMIN_ROLE) {
        if (identities[_account].registeredAt != 0) revert AlreadyRegistered(_account);
        if (bytes(_did).length == 0) revert InvalidDID();
        // Whitelist: only allow safe operational roles — never UPGRADER or DEFAULT_ADMIN
        if (_role != ADMIN_ROLE && _role != AUDITOR_ROLE && _role != CITIZEN_ROLE) revert InvalidRole(_role);

        identities[_account] = Identity({
            did: _did,
            vcHash: _vcHash,
            grantedRole: _role,
            registeredAt: uint64(block.timestamp),
            lastActiveAt: uint64(block.timestamp),
            active: true
        });
        registeredAddresses.push(_account);

        _grantRole(_role, _account);
        emit IdentityRegistered(_account, _did, _role);
    }

    /// @notice Deactivate an identity (soft-delete — DPDP compliance).
    ///         Also revokes the granted OpenZeppelin role so the account loses all permissions.
    function deactivateIdentity(address _account) external onlyRole(ADMIN_ROLE) {
        Identity storage id = identities[_account];
        if (id.registeredAt == 0) revert NotRegistered(_account);
        id.active = false;
        // Revoke the OpenZeppelin role — deactivation is no longer cosmetic
        _revokeRole(id.grantedRole, _account);
        emit IdentityDeactivated(_account, id.did);
    }

    /// @notice Reactivate a previously deactivated identity.
    ///         Restores the original granted role.
    function reactivateIdentity(address _account) external onlyRole(ADMIN_ROLE) {
        Identity storage id = identities[_account];
        if (id.registeredAt == 0) revert NotRegistered(_account);
        id.active = true;
        // Restore the OpenZeppelin role
        _grantRole(id.grantedRole, _account);
        emit IdentityReactivated(_account, id.did);
    }

    /// @notice Check if an address has an active identity.
    function isActiveIdentity(address _account) external view returns (bool) {
        return identities[_account].active;
    }

    /// @notice Update last-active timestamp (called by other contracts on interaction).
    /// @dev Restricted to ADMIN_ROLE to prevent unauthorized timestamp manipulation.
    function touchActivity(address _account) external onlyRole(ADMIN_ROLE) {
        Identity storage id = identities[_account];
        if (id.registeredAt != 0 && id.active) {
            id.lastActiveAt = uint64(block.timestamp);
        }
    }

    /// @notice Get total registered identity count.
    function registeredCount() external view returns (uint256) {
        return registeredAddresses.length;
    }

    // ─── Modifiers for downstream contracts ──────────────────────────────

    /// @notice Modifier to require an active registered identity.
    modifier onlyActiveIdentity() {
        if (!identities[msg.sender].active) revert IdentityInactive(msg.sender);
        _;
    }

    // ─── UUPS ────────────────────────────────────────────────────────────
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
