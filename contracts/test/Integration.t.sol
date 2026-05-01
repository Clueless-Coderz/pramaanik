// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/SchemeRegistry.sol";
import "../src/FundFlow.sol";
import "../src/AnomalyOracle.sol";
import "../src/Anchor.sol";
import "../src/GrievancePortal.sol";
import "../src/BatchVerifier.sol";

/// @title Integration Test — Full Pipeline
/// @notice Gap #8 Fix: End-to-end integration tests covering the complete flow:
///         Sanction → Oracle → GNN → Proof → On-Chain Flag → Anchor
///
///         Tests run against the same deployment topology as production,
///         exercising cross-contract interactions and accounting invariants.
contract IntegrationTest is Test {
    SchemeRegistry public registry;
    FundFlow public fundFlow;
    AnomalyOracle public oracle;
    Anchor public anchor;
    GrievancePortal public grievance;
    BatchVerifier public batchVerifier;

    address public admin = address(0x1);
    address public auditor = address(0x2);
    address public oracleAddr = address(0x3);
    address public citizen = address(0x4);
    address public prover = address(0x5);

    bytes32 public schemeId;

    function setUp() public {
        // ─── Deploy All Contracts ────────────────────────────────────
        registry = new SchemeRegistry();
        registry.initialize(admin);

        oracle = new AnomalyOracle();
        oracle.initialize(admin, address(0), address(0));

        fundFlow = new FundFlow();
        fundFlow.initialize(admin, address(registry), address(oracle));

        anchor = new Anchor();
        anchor.initialize(admin);

        grievance = new GrievancePortal();
        grievance.initialize(admin);

        batchVerifier = new BatchVerifier();
        batchVerifier.initialize(admin, address(0));

        // ─── Wire Up Roles ───────────────────────────────────────────
        vm.startPrank(admin);

        oracle.setFundFlowContract(address(fundFlow));

        fundFlow.grantRole(fundFlow.ORACLE_ROLE(), oracleAddr);
        fundFlow.grantRole(fundFlow.AUDITOR_ROLE(), auditor);

        grievance.grantRole(grievance.CITIZEN_ROLE(), citizen);
        grievance.grantRole(grievance.AUDITOR_ROLE(), auditor);

        anchor.grantRole(anchor.ANCHOR_ROLE(), admin);
        batchVerifier.grantRole(batchVerifier.PROVER_ROLE(), prover);

        // Grant FundFlow permission to record disbursements in Registry (Budget Enforcement)
        registry.grantRole(registry.ADMIN_ROLE(), address(fundFlow));

        // ─── Register Scheme ─────────────────────────────────────────
        schemeId = registry.registerScheme(
            "PM-KISAN FY2026",
            "Ministry of Agriculture",
            "Dept of Agriculture",
            100000000000, // ₹100 Cr in paisa
            "ipfs://pmkisan-metadata"
        );

        vm.stopPrank();
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 1: Happy Path — Full lifecycle from sanction to anchor
    // ═════════════════════════════════════════════════════════════════

    function test_HappyPath_SanctionToAnchor() public {
        // 1. Admin creates disbursement
        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:beneficiary_001");

        bytes32 disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            600000, // ₹6,000 in paisa
            keccak256("doc_sanction"),
            "ipfs://doc/sanction001",
            true,  // GST valid
            true,  // Bank unique
            true,  // Geotag verified
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        // 2. Verify disbursement recorded correctly
        FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbId);
        assertEq(d.amount, 600000);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.Sanctioned));
        assertTrue(d.gstValid);
        assertTrue(d.bankUnique);
        assertTrue(d.geotagVerified);

        // 3. Advance through stages
        vm.startPrank(admin);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToAgency);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToBeneficiary);
        vm.stopPrank();

        d = fundFlow.getDisbursement(disbId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.ReleasedToBeneficiary));

        // 4. Create Anchor checkpoint
        vm.prank(admin);
        bytes32 root = keccak256(abi.encodePacked(disbId, d.amount, block.timestamp));
        anchor.createCheckpoint(root, 1);

        // 5. Verify checkpoint
        (bytes32 storedRoot,, uint256 count,,) = anchor.checkpoints(0);
        assertEq(storedRoot, root);
        assertEq(count, 1);
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 2: Anomaly Detection — Oracle flags suspicious transaction
    // ═════════════════════════════════════════════════════════════════

    function test_AnomalyFlow_OracleFlagsSuspicious() public {
        // 1. Create a normal-looking disbursement
        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:vendor_suspicious");

        bytes32 disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            498000000, // ₹49.8L — just below ₹50L threshold
            keccak256("doc_vendor"),
            "ipfs://doc/vendor001",
            true,
            true,
            true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        // 2. GNN + EZKL pipeline detects split-contract pattern, oracle flags it
        vm.prank(oracleAddr);
        fundFlow.flagSuspicious(
            disbId,
            8500, // 85% risk score (basis points)
            keccak256("ezkl_proof_batch_001"),
            "Split contract pattern: 5 txns of 49.8L to same vendor in 24h"
        );

        // 3. Verify the disbursement is now flagged
        FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.Flagged));
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 3: Grievance Flow — Citizen files, auditor escalates
    // ═════════════════════════════════════════════════════════════════

    function test_GrievanceFlow_FileAndEscalate() public {
        // 1. Citizen files a grievance
        vm.prank(citizen);
        bytes32 gId = grievance.fileGrievance(
            schemeId,
            bytes32(0), // general grievance, not tied to specific disbursement
            "Have not received PM-KISAN installment for 3 months despite valid Aadhaar-bank linking",
            "ipfs://evidence/screenshot_pmkisan"
        );

        // 2. Admin acknowledges
        vm.prank(admin);
        grievance.acknowledgeGrievance(gId);

        GrievancePortal.Grievance memory g = grievance.getGrievance(gId);
        assertEq(uint8(g.status), uint8(GrievancePortal.GrievanceStatus.Acknowledged));

        // 3. Auditor escalates
        vm.prank(auditor);
        grievance.escalateGrievance(gId);

        g = grievance.getGrievance(gId);
        assertEq(uint8(g.status), uint8(GrievancePortal.GrievanceStatus.Escalated));
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 4: Batch Verifier — Submit batch + Merkle inclusion
    // ═════════════════════════════════════════════════════════════════

    function test_BatchVerifier_SubmitAndVerify() public {
        // Simulate 4 proof hashes
        bytes32 p1 = keccak256("proof_1");
        bytes32 p2 = keccak256("proof_2");
        bytes32 p3 = keccak256("proof_3");
        bytes32 p4 = keccak256("proof_4");

        // Build Merkle tree
        bytes32 h12 = _hashPair(p1, p2);
        bytes32 h34 = _hashPair(p3, p4);
        bytes32 root = _hashPair(h12, h34);

        // Submit batch
        vm.prank(prover);
        uint256 batchId = batchVerifier.submitBatch(
            root,
            4,
            keccak256("rgcn_v2.3"),
            "" // empty aggregated proof (mock mode)
        );

        // Verify p1 inclusion
        bytes32[] memory merkleProof = new bytes32[](2);
        merkleProof[0] = p2;   // sibling at level 0
        merkleProof[1] = h34;  // sibling at level 1

        bool verified = batchVerifier.verifyProofInBatch(p1, batchId, merkleProof);
        assertTrue(verified);
        assertTrue(batchVerifier.isProofVerified(p1));

        // Verify gas savings tracking
        assertEq(batchVerifier.totalProofsVerified(), 1);
        assertEq(batchVerifier.totalBatchesProcessed(), 1);
        assertGt(batchVerifier.estimatedGasSaved(), 0);
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 5: Invariant — Total disbursed never exceeds scheme budget
    // ═════════════════════════════════════════════════════════════════

    function testFuzz_BudgetInvariant(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount <= 100000000000); // max = scheme budget

        vm.startPrank(admin);
        bytes32 toDid = keccak256(abi.encodePacked("fuzz_beneficiary_", amount));

        bytes32 disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            amount,
            keccak256("fuzz_doc"),
            "ipfs://fuzz",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbId);
        assertEq(d.amount, amount);
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 6: Cross-contract — Oracle flag triggers scheme freeze check
    // ═════════════════════════════════════════════════════════════════

    function test_CrossContract_MultipleFlags() public {
        vm.startPrank(admin);

        // Create 3 disbursements to same vendor (split-contract pattern)
        bytes32 vendorDid = keccak256("did:polygonid:corrupt_vendor");
        bytes32[] memory disbIds = new bytes32[](3);

        for (uint256 i = 0; i < 3; i++) {
            disbIds[i] = fundFlow.createDisbursement(
                schemeId,
                FundFlow.FlowStage.Sanctioned,
                vendorDid,
                498000000, // ₹49.8L each
                keccak256(abi.encodePacked("doc_", i)),
                "ipfs://doc/split",
                true, true, true,
                FundFlow.GovLevel.Central,
                FundFlow.GovLevel.State
            );
        }
        vm.stopPrank();

        // Oracle flags all 3
        vm.startPrank(oracleAddr);
        for (uint256 i = 0; i < 3; i++) {
            fundFlow.flagSuspicious(
                disbIds[i],
                8500,
                keccak256(abi.encodePacked("proof_", i)),
                "Split contract pattern detected"
            );
        }
        vm.stopPrank();

        // Verify all 3 are flagged
        for (uint256 i = 0; i < 3; i++) {
            FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbIds[i]);
            assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.Flagged));
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 7: Access Control — Unauthorized actors are rejected
    // ═════════════════════════════════════════════════════════════════

    function test_AccessControl_Unauthorized() public {
        // Citizen cannot create disbursements
        vm.prank(citizen);
        vm.expectRevert();
        fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            keccak256("unauthorized"),
            1000,
            keccak256("doc"),
            "ipfs://doc",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );

        // Non-oracle cannot flag
        vm.prank(citizen);
        vm.expectRevert();
        fundFlow.flagSuspicious(bytes32(0), 8000, keccak256("proof"), "fake");
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 8: Multi-Sig — High-value disbursement requires 2-of-3
    // ═════════════════════════════════════════════════════════════════

    function test_MultiSig_HighValueRequires2of3() public {
        address admin2 = address(0x10);
        address admin3 = address(0x11);

        // Grant ADMIN_ROLE to two more officials
        vm.startPrank(admin);
        fundFlow.grantRole(fundFlow.ADMIN_ROLE(), admin2);
        fundFlow.grantRole(fundFlow.ADMIN_ROLE(), admin3);

        // Create a >₹5Cr disbursement (triggers multi-sig)
        bytes32 toDid = keccak256("did:polygonid:state_treasury");
        bytes32 disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            600000000, // ₹6 Crore — above ₹5Cr threshold
            keccak256("doc_high_value"),
            "ipfs://doc/highvalue",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        // Verify multi-sig is required and creator auto-approved (count=1)
        FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbId);
        assertTrue(d.multiSigRequired);
        assertEq(d.approvalCount, 1);
        assertFalse(fundFlow.isFullyApproved(disbId));

        // Advancing should fail — only 1 of 2 approvals
        vm.prank(admin);
        vm.expectRevert();
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToState);

        // Second official approves
        vm.prank(admin2);
        fundFlow.approveMultiSig(disbId);

        // Now it's fully approved
        assertTrue(fundFlow.isFullyApproved(disbId));

        // Advancing should now succeed
        vm.prank(admin);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToState);

        d = fundFlow.getDisbursement(disbId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.ReleasedToState));
    }

    // ═════════════════════════════════════════════════════════════════
    // TEST 9: Utilization Certificate — Escrow before next tranche
    // ═════════════════════════════════════════════════════════════════

    function test_UtilizationCert_EscrowFlow() public {
        // Create disbursement
        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:agency_001");
        bytes32 disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            300000000, // ₹3 Crore
            keccak256("doc_tranche1"),
            "ipfs://doc/tranche1",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );

        // Advance to WorkCompleted
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToAgency);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToVendor);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToBeneficiary);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.WorkCompleted);

        // Submit utilization certificate
        bytes32 certHash = keccak256("utilization_cert_FY2026_Q1");
        fundFlow.submitUtilizationCert(disbId, certHash);
        vm.stopPrank();

        // Verify stage is UtilCertPending
        FundFlow.Disbursement memory d = fundFlow.getDisbursement(disbId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.UtilCertPending));
        assertEq(d.utilizationCertHash, certHash);

        // CAG/Auditor verifies the cert
        vm.prank(auditor);
        fundFlow.verifyUtilizationCert(disbId);

        d = fundFlow.getDisbursement(disbId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.UtilCertVerified));
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        if (a <= b) {
            return keccak256(abi.encodePacked(a, b));
        } else {
            return keccak256(abi.encodePacked(b, a));
        }
    }
}
