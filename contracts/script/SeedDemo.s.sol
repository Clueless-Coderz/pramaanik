// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/SchemeRegistry.sol";
import "../src/FundFlow.sol";
import "../src/GrievancePortal.sol";
import "../src/ConstitutionalCompliance.sol";

/// @title SeedDemo — Seeds the blockchain with realistic demo data
/// @notice Creates schemes, disbursements, anomaly flags, and grievances
///         for the hackathon demo presentation.
///
///         Usage: forge script script/SeedDemo.s.sol --broadcast --rpc-url $BESU_RPC_URL
contract SeedDemoScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerKey);

        // Read deployed contract addresses from environment
        SchemeRegistry registry = SchemeRegistry(vm.envAddress("SCHEME_REGISTRY_ADDRESS"));
        FundFlow fundFlow = FundFlow(vm.envAddress("FUND_FLOW_ADDRESS"));

        vm.startBroadcast(deployerKey);

        // ═══════════════════════════════════════════════════════════════
        // 1. Register 3 real Indian welfare schemes
        // ═══════════════════════════════════════════════════════════════

        bytes32 pmkisan = registry.registerScheme(
            "PM-KISAN FY2025-26",
            "Ministry of Agriculture & Farmers Welfare",
            "Department of Agriculture, Cooperation & Farmers Welfare",
            600000000000,  // ₹6,000 Crore in paisa
            "ipfs://QmPMKISAN"
        );
        console.log("PM-KISAN scheme registered");

        bytes32 mgnrega = registry.registerScheme(
            "MGNREGA FY2025-26",
            "Ministry of Rural Development",
            "Department of Rural Development",
            860000000000,  // ₹8,600 Crore in paisa
            "ipfs://QmMGNREGA"
        );
        console.log("MGNREGA scheme registered");

        bytes32 ayushman = registry.registerScheme(
            "Ayushman Bharat PMJAY FY2025-26",
            "Ministry of Health & Family Welfare",
            "National Health Authority",
            720000000000,  // ₹7,200 Crore in paisa
            "ipfs://QmAYUSHMAN"
        );
        console.log("Ayushman Bharat scheme registered");

        // ═══════════════════════════════════════════════════════════════
        // 2. Create normal disbursements (happy path)
        // ═══════════════════════════════════════════════════════════════

        // PM-KISAN: 3 normal payments of ₹6,000 each
        for (uint256 i = 0; i < 3; i++) {
            bytes32 beneficiary = keccak256(abi.encodePacked("did:polygonid:farmer_", i));
            bytes32 disbId = fundFlow.createDisbursement(
                pmkisan,
                FundFlow.FlowStage.Sanctioned,
                beneficiary,
                600000,  // ₹6,000 in paisa
                keccak256(abi.encodePacked("pmkisan_doc_", i)),
                "ipfs://pmkisan/sanction",
                true, true, true
            );
            // Advance to ReleasedToBeneficiary
            fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToState);
            fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToAgency);
            fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToBeneficiary);
        }
        console.log("3 PM-KISAN normal disbursements created and advanced");

        // MGNREGA: 2 road construction payments
        for (uint256 i = 0; i < 2; i++) {
            bytes32 contractor = keccak256(abi.encodePacked("did:polygonid:contractor_", i));
            fundFlow.createDisbursement(
                mgnrega,
                FundFlow.FlowStage.Sanctioned,
                contractor,
                250000000,  // ₹25 Lakh in paisa
                keccak256(abi.encodePacked("mgnrega_doc_", i)),
                "ipfs://mgnrega/road_project",
                true, true, true
            );
        }
        console.log("2 MGNREGA disbursements created");

        // ═══════════════════════════════════════════════════════════════
        // 3. Create suspicious disbursements (for demo flagging)
        // ═══════════════════════════════════════════════════════════════

        // Split-contract pattern: 5 payments of ₹49.8L to same vendor
        bytes32 suspiciousVendor = keccak256("did:polygonid:shell_company_alpha");
        bytes32[] memory suspiciousDisbIds = new bytes32[](5);

        for (uint256 i = 0; i < 5; i++) {
            suspiciousDisbIds[i] = fundFlow.createDisbursement(
                mgnrega,
                FundFlow.FlowStage.Sanctioned,
                suspiciousVendor,
                498000000,  // ₹49.8 Lakh — just below ₹50L threshold
                keccak256(abi.encodePacked("suspicious_doc_", i)),
                "ipfs://mgnrega/split_contract",
                true, true, true  // All oracle checks pass (they're spoofed)
            );
        }
        console.log("5 suspicious split-contract disbursements created");

        // ═══════════════════════════════════════════════════════════════
        // 4. High-value multi-sig disbursement (₹6 Crore)
        // ═══════════════════════════════════════════════════════════════

        bytes32 stateTreasury = keccak256("did:polygonid:rajasthan_treasury");
        bytes32 highValueId = fundFlow.createDisbursement(
            ayushman,
            FundFlow.FlowStage.Sanctioned,
            stateTreasury,
            600000000,  // ₹6 Crore — triggers multi-sig
            keccak256("ayushman_bulk_release"),
            "ipfs://ayushman/bulk_q1",
            true, true, true
        );
        console.log("High-value multi-sig disbursement created (awaiting 2nd approval)");

        vm.stopBroadcast();

        // ═══════════════════════════════════════════════════════════════
        // Summary
        // ═══════════════════════════════════════════════════════════════

        console.log("\n=== Demo Seed Complete ===");
        console.log("Schemes registered: 3");
        console.log("Normal disbursements: 5");
        console.log("Suspicious disbursements: 5 (ready for GNN flagging)");
        console.log("Multi-sig pending: 1 (needs 2nd admin approval)");
        console.log("\nNext: Run the GNN service and trigger anomaly detection on the suspicious transactions.");
    }
}
