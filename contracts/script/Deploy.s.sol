// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/AccessGovernance.sol";
import "../src/SchemeRegistry.sol";
import "../src/AnomalyOracle.sol";
import "../src/FundFlow.sol";
import "../src/Anchor.sol";
import "../src/GrievancePortal.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. AccessGovernance
        AccessGovernance access = new AccessGovernance();
        access.initialize(admin);

        // 2. SchemeRegistry
        SchemeRegistry registry = new SchemeRegistry();
        registry.initialize(admin);

        // 3. AnomalyOracle (FundFlow address will be updated after deployment)
        AnomalyOracle oracle = new AnomalyOracle();
        oracle.initialize(admin, address(0), address(0));

        // 4. FundFlow
        FundFlow fundFlow = new FundFlow();
        fundFlow.initialize(admin, address(registry), address(oracle));

        // Link Oracle to FundFlow
        oracle.setFundFlowContract(address(fundFlow));

        // 5. Anchor
        Anchor anchor = new Anchor();
        anchor.initialize(admin);

        // 6. GrievancePortal
        GrievancePortal grievance = new GrievancePortal();
        grievance.initialize(admin);

        vm.stopBroadcast();

        // Output deployed addresses (can be captured in CI/CD)
        console.log("AccessGovernance:", address(access));
        console.log("SchemeRegistry:", address(registry));
        console.log("AnomalyOracle:", address(oracle));
        console.log("FundFlow:", address(fundFlow));
        console.log("Anchor:", address(anchor));
        console.log("GrievancePortal:", address(grievance));
    }
}
