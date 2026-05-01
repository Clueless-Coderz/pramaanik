// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AccessGovernance.sol";
import "../src/SchemeRegistry.sol";
import "../src/AnomalyOracle.sol";
import "../src/FundFlow.sol";
import "../src/Anchor.sol";
import "../src/GrievancePortal.sol";
import "../src/BatchVerifier.sol";
import "../src/ConstitutionalCompliance.sol";

/// @title Deploy — One-click deployment of the entire ChainLedger/PRAMAANIK system
/// @notice Deploys all 8 contracts, wires cross-references, and outputs addresses.
///         Usage: forge script script/Deploy.s.sol --broadcast --rpc-url $BESU_RPC_URL
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // ─── 1. AccessGovernance (DID-based RBAC) ────────────────────────
        AccessGovernance access = new AccessGovernance();
        access.initialize(admin);

        // ─── 2. SchemeRegistry (welfare scheme database) ─────────────────
        SchemeRegistry registry = new SchemeRegistry();
        registry.initialize(admin);

        // ─── 3. AnomalyOracle (zkML proof verifier) ─────────────────────
        AnomalyOracle oracle = new AnomalyOracle();
        oracle.initialize(admin, address(0), address(0));

        // ─── 4. FundFlow (core fund tracking with multi-sig) ─────────────
        FundFlow fundFlow = new FundFlow();
        fundFlow.initialize(admin, address(registry), address(oracle));

        // Link Oracle ↔ FundFlow
        oracle.setFundFlowContract(address(fundFlow));

        // ─── 5. Anchor (dual-chain Merkle root checkpointing) ────────────
        Anchor anchor = new Anchor();
        anchor.initialize(admin);

        // ─── 6. GrievancePortal (citizen complaint system) ───────────────
        GrievancePortal grievance = new GrievancePortal();
        grievance.initialize(admin);

        // ─── 7. BatchVerifier (O(1) proof aggregation) ──────────────────
        BatchVerifier batchVerifier = new BatchVerifier();
        batchVerifier.initialize(admin, address(oracle));

        // ─── 8. ConstitutionalCompliance (Article 275/282, Auto-FIR) ─────
        ConstitutionalCompliance compliance = new ConstitutionalCompliance();
        compliance.initialize(admin);

        vm.stopBroadcast();

        // ─── Output deployed addresses ───────────────────────────────────
        console.log("=== ChainLedger/PRAMAANIK Deployment Complete ===");
        console.log("AccessGovernance:          ", address(access));
        console.log("SchemeRegistry:            ", address(registry));
        console.log("AnomalyOracle:             ", address(oracle));
        console.log("FundFlow:                  ", address(fundFlow));
        console.log("Anchor:                    ", address(anchor));
        console.log("GrievancePortal:           ", address(grievance));
        console.log("BatchVerifier:             ", address(batchVerifier));
        console.log("ConstitutionalCompliance:  ", address(compliance));
    }
}
