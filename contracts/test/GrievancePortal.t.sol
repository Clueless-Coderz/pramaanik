// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/GrievancePortal.sol";

/// @title Grievance Portal Tests
/// @notice Tests the GrievancePortal contract, specifically the new
///         Assisted Anonymous Grievance feature using ZK nullifiers.
contract GrievancePortalTest is Test {
    GrievancePortal public portal;

    address public admin = address(0x1);
    address public citizen = address(0x2);
    address public cscAgent = address(0x3);
    address public unauthorized = address(0x4);

    bytes32 public schemeId = keccak256("test_scheme");
    bytes32 public disbId = keccak256("test_disbursement");

    function setUp() public {
        portal = new GrievancePortal();
        portal.initialize(admin);

        // Grant roles
        vm.startPrank(admin);
        portal.grantRole(portal.CITIZEN_ROLE(), citizen);
        portal.grantRole(portal.CSC_AGENT_ROLE(), cscAgent);
        vm.stopPrank();
    }

    // ═════════════════════════════════════════════════════════════════
    // NORMAL GRIEVANCE (SELF-FILED)
    // ═════════════════════════════════════════════════════════════════

    function test_GP_FileGrievance() public {
        vm.prank(citizen);
        bytes32 grievanceId = portal.fileGrievance(
            schemeId,
            disbId,
            "Funds not received",
            "ipfs://evidence"
        );

        GrievancePortal.Grievance memory g = portal.getGrievance(grievanceId);
        assertEq(g.schemeId, schemeId);
        assertEq(g.disbursementId, disbId);
        assertEq(g.filedBy, citizen);
        assertEq(g.isAssisted, false);
        assertEq(uint8(g.status), uint8(GrievancePortal.GrievanceStatus.Filed));
        assertEq(g.nullifierHash, bytes32(0));
    }

    // ═════════════════════════════════════════════════════════════════
    // ASSISTED ANONYMOUS GRIEVANCE (PROXY/CSC)
    // ═════════════════════════════════════════════════════════════════

    function test_GP_FileAssistedGrievance() public {
        bytes32 nullifier = keccak256("biometric_zk_proof_123");

        vm.prank(cscAgent);
        bytes32 grievanceId = portal.fileGrievanceAssisted(
            schemeId,
            disbId,
            "Corruption observed at block office",
            "ipfs://video_evidence",
            nullifier
        );

        GrievancePortal.Grievance memory g = portal.getGrievance(grievanceId);
        
        // Ensure the agent is marked as the filer, NOT the citizen
        assertEq(g.filedBy, cscAgent);
        
        // Ensure the ZK nullifier is recorded
        assertEq(g.nullifierHash, nullifier);
        
        // Ensure it's marked as an assisted filing
        assertEq(g.isAssisted, true);
        
        // Verify nullifier is marked as used
        assertTrue(portal.usedNullifiers(nullifier));
    }

    function test_GP_AssistedGrievance_RevertsOnDuplicateNullifier() public {
        bytes32 nullifier = keccak256("biometric_zk_proof_456");

        vm.startPrank(cscAgent);
        
        // First submission succeeds
        portal.fileGrievanceAssisted(
            schemeId,
            disbId,
            "First complaint",
            "ipfs://evi1",
            nullifier
        );

        // Second submission with exact same fingerprint/nullifier should revert to prevent spam
        vm.expectRevert(abi.encodeWithSelector(GrievancePortal.NullifierAlreadyUsed.selector, nullifier));
        portal.fileGrievanceAssisted(
            schemeId,
            disbId,
            "Spam complaint",
            "ipfs://evi2",
            nullifier
        );
        
        vm.stopPrank();
    }

    function test_GP_AssistedGrievance_Unauthorized() public {
        bytes32 nullifier = keccak256("biometric_zk_proof_789");

        // Normal citizen shouldn't be able to file assisted proxy grievances
        vm.prank(citizen);
        vm.expectRevert();
        portal.fileGrievanceAssisted(
            schemeId,
            disbId,
            "Complaint",
            "ipfs://evi",
            nullifier
        );

        // Unauthorized shouldn't either
        vm.prank(unauthorized);
        vm.expectRevert();
        portal.fileGrievanceAssisted(
            schemeId,
            disbId,
            "Complaint",
            "ipfs://evi",
            nullifier
        );
    }
}
