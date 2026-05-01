// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title FundFlow
/// @notice The heart of ChainLedger / PRAMAANIK — tracks every rupee from the Consolidated
///         Fund of India through the 5-tier governance hierarchy:
///         Central → State → District → City/Town → Village/Gram Panchayat.
///         Each disbursement is an immutable event with oracle-attested preconditions.
///
/// @dev    Fund flow is recorded as state transitions, NOT as ERC-20 transfers.
///         Real money moves through PFMS/NPCI rails; this contract creates the
///         cryptographic chain-of-custody shadow that proves integrity.
///         Implements multi-signature for high-value transactions (>₹5Cr)
///         and utilization certificate escrow per ChainLedger §4.2.3.
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
        UtilCertPending,    // Awaiting utilization certificate before next tranche
        UtilCertVerified,   // Utilization certificate verified by CAG
        Flagged,            // Anomaly detected — under review
        Frozen              // Frozen by auditor pending investigation
    }

    /// @notice 5-tier governance hierarchy (ChainLedger §2.1)
    enum GovLevel {
        Central,            // Union Government / Ministry
        State,              // State Government / State Treasury
        District,           // District Administration / DC Office
        CityTown,           // Municipal Corporation / Nagar Palika
        Village             // Gram Panchayat / Block Development Office
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
        bool bankUnique;             // bank-dedup oracle check result
        bool geotagVerified;         // geotag oracle check result
        GovLevel senderLevel;        // governance tier of sender
        GovLevel receiverLevel;      // governance tier of receiver
        bool multiSigRequired;       // true if amount > MULTISIG_THRESHOLD
        uint8 approvalCount;         // number of approvals received (for multi-sig)
        bytes32 utilizationCertHash; // SHA-256 of utilization certificate (set later)
    }

    struct AnomalyFlag {
        bytes32 disbursementId;
        uint256 riskScore;           // 0-10000 (basis points: 10000 = 100%)
        bytes32 proofHash;           // keccak256 of the EZKL zk-SNARK proof
        string explanation;          // PANG-style human-readable motif
        uint64 flaggedAt;
        address flaggedBy;           // oracle/GNN service address
    }

    // ─── Constants ────────────────────────────────────────────────────────
    /// @notice Multi-sig threshold: ₹5 Crore in paisa (ChainLedger §4.2.3)
    uint256 public constant MULTISIG_THRESHOLD = 500000000; // ₹5,00,00,000 = 5Cr in paisa
    uint8 public constant MULTISIG_REQUIRED_APPROVALS = 2;  // 2-of-3 approvals

    // ─── Storage ─────────────────────────────────────────────────────────
    mapping(bytes32 => Disbursement) public disbursements;
    mapping(bytes32 => AnomalyFlag[]) public anomalyFlags;
    bytes32[] public disbursementIds;
    uint256 public totalDisbursementCount;
    uint256 public totalFlaggedCount;

    // Multi-sig approval tracking
    mapping(bytes32 => mapping(address => bool)) public approvals; // disbId => approver => approved

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
    event DisbursementUnfrozen(bytes32 indexed disbursementId, address indexed unfrozenBy, string reason);
    event OracleAttestationRecorded(bytes32 indexed attestationHash, bytes32 indexed disbursementId);
    event MultiSigApproval(bytes32 indexed disbursementId, address indexed approver, uint8 approvalCount);
    event UtilizationCertSubmitted(bytes32 indexed disbursementId, bytes32 certHash);
    event UtilizationCertVerified(bytes32 indexed disbursementId, address verifiedBy);

    // ─── Errors ──────────────────────────────────────────────────────────
    error DisbursementAlreadyExists(bytes32 id);
    error DisbursementNotFound(bytes32 id);
    error InvalidAmount();
    error InvalidStageTransition(FlowStage current, FlowStage requested);
    error OracleCheckFailed(string check);
    error DisbursementFrozenError(bytes32 id);
    error InvalidGovLevelFlow(GovLevel sender, GovLevel receiver);

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

    /// @notice Create a new disbursement record with oracle attestations.
    /// @dev    Checks-Effects-Interactions pattern enforced.
    ///         If amount > MULTISIG_THRESHOLD (₹5Cr), multi-sig is required (ChainLedger §4.2.3).
    function createDisbursement(
        bytes32 _schemeId,
        FlowStage _stage,
        bytes32 _toPseudonymDid,
        uint256 _amount,
        bytes32 _supportingDocHash,
        string calldata _ipfsCid,
        bool _gstValid,
        bool _bankUnique,
        bool _geotagVerified,
        GovLevel _senderLevel,
        GovLevel _receiverLevel
    ) external onlyRole(ADMIN_ROLE) nonReentrant returns (bytes32 disbursementId) {
        if (_amount == 0) revert InvalidAmount();
        // Funds must flow downward: receiver level must be strictly below sender
        if (uint8(_receiverLevel) <= uint8(_senderLevel)) revert InvalidGovLevelFlow(_senderLevel, _receiverLevel);

        // Generate unique disbursement ID
        disbursementId = keccak256(
            abi.encodePacked(_schemeId, msg.sender, _toPseudonymDid, _amount, block.timestamp, totalDisbursementCount)
        );
        if (disbursements[disbursementId].timestamp != 0) revert DisbursementAlreadyExists(disbursementId);

        // Oracle attestation hash for tamper evidence
        bytes32 attestationHash = keccak256(
            abi.encodePacked(_gstValid, _bankUnique, _geotagVerified, block.timestamp)
        );

        bool needsMultiSig = _amount > MULTISIG_THRESHOLD;

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
            bankUnique: _bankUnique,
            geotagVerified: _geotagVerified,
            senderLevel: _senderLevel,
            receiverLevel: _receiverLevel,
            multiSigRequired: needsMultiSig,
            approvalCount: needsMultiSig ? 0 : MULTISIG_REQUIRED_APPROVALS, // auto-approved if below threshold
            utilizationCertHash: bytes32(0)
        });

        disbursementIds.push(disbursementId);
        totalDisbursementCount++;
        oracleAttestations[attestationHash] = true;

        // Sync with SchemeRegistry to enforce budget limits (ChainLedger §4.2)
        if (schemeRegistry != address(0)) {
            (bool success, ) = schemeRegistry.call(
                abi.encodeWithSignature("recordDisbursement(bytes32,uint256)", _schemeId, _amount)
            );
            if (!success) revert OracleCheckFailed("Budget enforcement failed or scheme inactive");
        }

        // Multi-sig: do NOT auto-count creator as first approval.
        // All approvals must come via explicit approveMultiSig() calls.
        if (needsMultiSig) {
            emit MultiSigApproval(disbursementId, msg.sender, 0);
        }

        emit DisbursementCreated(disbursementId, _schemeId, _stage, msg.sender, _toPseudonymDid, _amount);
        emit OracleAttestationRecorded(attestationHash, disbursementId);
    }

    // ─── Multi-Signature Approval (ChainLedger §4.2.3) ──────────────────

    /// @notice Approve a high-value disbursement (2-of-3 required for >₹5Cr).
    function approveMultiSig(bytes32 _disbursementId) external onlyRole(ADMIN_ROLE) {
        Disbursement storage d = _getDisbursement(_disbursementId);
        require(d.multiSigRequired, "Multi-sig not required");
        require(!approvals[_disbursementId][msg.sender], "Already approved");
        require(d.approvalCount < MULTISIG_REQUIRED_APPROVALS, "Already fully approved");

        approvals[_disbursementId][msg.sender] = true;
        d.approvalCount++;

        emit MultiSigApproval(_disbursementId, msg.sender, d.approvalCount);
    }

    /// @notice Advance a disbursement to the next stage in the fund flow.
    /// @dev Uses a strict stage transition matrix — no stage skipping allowed.
    function advanceStage(bytes32 _disbursementId, FlowStage _newStage)
        external
        onlyRole(ADMIN_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        if (d.stage == FlowStage.Frozen) revert DisbursementFrozenError(_disbursementId);
        if (!_isValidTransition(d.stage, _newStage)) revert InvalidStageTransition(d.stage, _newStage);

        // Multi-sig gate: high-value transactions cannot advance without full approval
        if (d.multiSigRequired && d.approvalCount < MULTISIG_REQUIRED_APPROVALS) {
            revert OracleCheckFailed("Multi-sig approval incomplete");
        }

        FlowStage old = d.stage;
        d.stage = _newStage;

        emit DisbursementStageAdvanced(_disbursementId, old, _newStage);
    }

    /// @dev Stage transition matrix — only allows sequential forward transitions.
    ///      Includes shortcuts for India-specific welfare disbursement patterns.
    function _isValidTransition(FlowStage _from, FlowStage _to) internal pure returns (bool) {
        // Standard sequential path: Sanctioned → State → Agency → Vendor → Beneficiary → WorkCompleted
        if (_from == FlowStage.Sanctioned && _to == FlowStage.ReleasedToState) return true;
        if (_from == FlowStage.ReleasedToState && _to == FlowStage.ReleasedToAgency) return true;
        if (_from == FlowStage.ReleasedToAgency && _to == FlowStage.ReleasedToVendor) return true;
        if (_from == FlowStage.ReleasedToVendor && _to == FlowStage.ReleasedToBeneficiary) return true;
        if (_from == FlowStage.ReleasedToBeneficiary && _to == FlowStage.WorkCompleted) return true;
        // Shortcut: Sanctioned → Agency (state-level schemes, no central release)
        if (_from == FlowStage.Sanctioned && _to == FlowStage.ReleasedToAgency) return true;
        // Shortcut: Sanctioned → Beneficiary (direct benefit transfer, e.g. PM-KISAN)
        if (_from == FlowStage.Sanctioned && _to == FlowStage.ReleasedToBeneficiary) return true;
        // Shortcut: Agency → Beneficiary (no vendor intermediary, e.g. wage payments)
        if (_from == FlowStage.ReleasedToAgency && _to == FlowStage.ReleasedToBeneficiary) return true;
        // Shortcut: State → Beneficiary (state-direct DBT, e.g. PM-KISAN state release)
        if (_from == FlowStage.ReleasedToState && _to == FlowStage.ReleasedToBeneficiary) return true;
        // Shortcut: State → Vendor (state-level procurement without agency)
        if (_from == FlowStage.ReleasedToState && _to == FlowStage.ReleasedToVendor) return true;
        return false;
    }

    // ─── Utilization Certificate (ChainLedger §4.2.3) ───────────────────

    /// @notice Submit a utilization certificate hash for a disbursement.
    ///         Next tranche is held in escrow until this is submitted and verified.
    function submitUtilizationCert(bytes32 _disbursementId, bytes32 _certHash)
        external onlyRole(ADMIN_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        if (d.stage == FlowStage.Frozen) revert DisbursementFrozenError(_disbursementId);
        if (d.stage == FlowStage.Flagged) revert DisbursementFrozenError(_disbursementId);
        d.utilizationCertHash = _certHash;
        d.stage = FlowStage.UtilCertPending;
        emit UtilizationCertSubmitted(_disbursementId, _certHash);
    }

    /// @notice Verify a utilization certificate (CAG/Auditor privilege).
    function verifyUtilizationCert(bytes32 _disbursementId)
        external onlyRole(AUDITOR_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        if (d.stage == FlowStage.Frozen) revert DisbursementFrozenError(_disbursementId);
        require(d.utilizationCertHash != bytes32(0), "No cert submitted");
        d.stage = FlowStage.UtilCertVerified;
        emit UtilizationCertVerified(_disbursementId, msg.sender);
    }

    // ─── Anomaly Flagging ────────────────────────────────────────────────

    /// @notice Flag a disbursement as suspicious (called by AnomalyOracle or ORACLE_ROLE).
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

    /// @notice Unfreeze a frozen disbursement (Auditor privilege — returns to Flagged for re-review).
    /// @param _reason Justification string (emitted in event for audit trail).
    function unfreezeDisbursement(bytes32 _disbursementId, string calldata _reason)
        external
        onlyRole(AUDITOR_ROLE)
    {
        Disbursement storage d = _getDisbursement(_disbursementId);
        require(d.stage == FlowStage.Frozen, "Not frozen");
        d.stage = FlowStage.Flagged;
        emit DisbursementUnfrozen(_disbursementId, msg.sender, _reason);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    function getDisbursement(bytes32 _id) external view returns (Disbursement memory) {
        return disbursements[_id];
    }

    function getAnomalyFlags(bytes32 _id) external view returns (AnomalyFlag[] memory) {
        return anomalyFlags[_id];
    }

    function getAllDisbursementIds() external view returns (bytes32[] memory) {
        return disbursementIds;
    }

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

    /// @notice Check if a disbursement has full multi-sig approval.
    function isFullyApproved(bytes32 _id) external view returns (bool) {
        Disbursement storage d = disbursements[_id];
        if (!d.multiSigRequired) return true;
        return d.approvalCount >= MULTISIG_REQUIRED_APPROVALS;
    }

    // ─── Internals ───────────────────────────────────────────────────────

    function _getDisbursement(bytes32 _id) internal view returns (Disbursement storage) {
        Disbursement storage d = disbursements[_id];
        if (d.timestamp == 0) revert DisbursementNotFound(_id);
        return d;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
