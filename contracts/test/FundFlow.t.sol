// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/FundFlow.sol";
import "../src/SchemeRegistry.sol";
import "../src/AnomalyOracle.sol";

contract FundFlowTest is Test {
    FundFlow public fundFlow;
    SchemeRegistry public schemeRegistry;
    AnomalyOracle public anomalyOracle;

    address public admin = address(0x1);
    address public auditor = address(0x2);
    address public oracle = address(0x3);

    bytes32 public schemeId;

    function setUp() public {
        // Deploy contracts
        schemeRegistry = new SchemeRegistry();
        schemeRegistry.initialize(admin);

        anomalyOracle = new AnomalyOracle();
        anomalyOracle.initialize(admin, address(0), address(0)); // FundFlow not yet deployed

        fundFlow = new FundFlow();
        fundFlow.initialize(admin, address(schemeRegistry), address(anomalyOracle));

        // Update AnomalyOracle with FundFlow address
        vm.prank(admin);
        anomalyOracle.setFundFlowContract(address(fundFlow));

        // Grant Roles
        vm.startPrank(admin);
        fundFlow.grantRole(fundFlow.ORACLE_ROLE(), oracle);
        fundFlow.grantRole(fundFlow.AUDITOR_ROLE(), auditor);

        // Register a scheme
        schemeId = schemeRegistry.registerScheme(
            "PM-KISAN FY2026",
            "MoA",
            "Dept",
            1000000000, // 10M paisa
            "ipfs://metadata"
        );
        vm.stopPrank();
    }

    function test_CreateDisbursement() public {
        vm.startPrank(admin);
        
        bytes32 toDid = keccak256("did:polygonid:citizen1");
        
        bytes32 dId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            10000,
            keccak256("doc"),
            "ipfs://doc",
            true,  // gstValid
            true,  // bankUnique
            true,  // geotagVerified
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );

        FundFlow.Disbursement memory d = fundFlow.getDisbursement(dId);
        assertEq(d.amount, 10000);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.Sanctioned));
        assertTrue(d.gstValid);
        
        vm.stopPrank();
    }

    function testFuzz_DisbursementAmounts(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount < 1e30); // reasonable upper bound

        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:fuzz");
        
        bytes32 dId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            amount,
            keccak256("doc"),
            "ipfs://doc",
            true,
            true,
            true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );

        FundFlow.Disbursement memory d = fundFlow.getDisbursement(dId);
        assertEq(d.amount, amount);
        
        vm.stopPrank();
    }

    function test_FlagSuspicious_EscalatesToFlagged() public {
        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:citizen2");
        bytes32 dId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            50000,
            keccak256("doc"),
            "ipfs://doc",
            true,
            true,
            true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        // High risk score (8000 >= 7500 threshold)
        vm.prank(oracle);
        fundFlow.flagSuspicious(dId, 8000, keccak256("proof"), "Suspicious pattern");

        FundFlow.Disbursement memory d = fundFlow.getDisbursement(dId);
        assertEq(uint8(d.stage), uint8(FundFlow.FlowStage.Flagged));
    }

    /// @notice Fuzz tests the multi-sig threshold boundary (₹5 Crore).
    ///         An off-by-one error here would bypass required secondary approvals.
    function testFuzz_MultiSigThreshold(uint256 amount) public {
        vm.assume(amount > 0);
        vm.assume(amount < 10000000000000); // Max 10,000 Cr bounds check

        vm.startPrank(admin);
        bytes32 toDid = keccak256("did:polygonid:fuzz_multisig");
        
        bytes32 dId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            toDid,
            amount,
            keccak256("doc"),
            "ipfs://doc",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        vm.stopPrank();

        FundFlow.Disbursement memory d = fundFlow.getDisbursement(dId);
        
        // 5 Crore threshold = 500,000,000 paisa (since 1 Rupee = 100 Paisa)
        // Actually, looking at the code, it's MULTISIG_THRESHOLD_AMOUNT
        // Assuming it's 500_000_000_000 paisa = 5 Crore rupees
        // We will just verify the boolean flag matches the expected logical operator
        if (amount >= fundFlow.MULTISIG_THRESHOLD_AMOUNT()) {
            assertTrue(d.multiSigRequired, "Should require multi-sig >= threshold");
        } else {
            assertFalse(d.multiSigRequired, "Should not require multi-sig < threshold");
        }
    }
}
