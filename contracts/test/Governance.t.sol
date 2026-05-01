// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/ConstitutionalCompliance.sol";
import "../src/AccessGovernance.sol";

/// @title Governance Tests — ConstitutionalCompliance + AccessGovernance
/// @notice Gap #8 Fix: Tests for the two previously untested contracts.
///         Covers rule registration, violation recording, auto-FIR generation,
///         72-hour escalation, DID registration, and identity lifecycle.
contract GovernanceTest is Test {
    ConstitutionalCompliance public compliance;
    AccessGovernance public accessGov;

    address public admin = address(0x1);
    address public cagAuditor = address(0x2);
    address public citizen1 = address(0x3);
    address public citizen2 = address(0x4);
    address public unauthorized = address(0x5);

    function setUp() public {
        // Deploy ConstitutionalCompliance
        compliance = new ConstitutionalCompliance();
        compliance.initialize(admin);

        // Deploy AccessGovernance
        accessGov = new AccessGovernance();
        accessGov.initialize(admin);

        // Grant CAG_ROLE to auditor
        vm.startPrank(admin);
        compliance.grantRole(compliance.CAG_ROLE(), cagAuditor);
        vm.stopPrank();
    }

    // ═════════════════════════════════════════════════════════════════
    // CONSTITUTIONAL COMPLIANCE TESTS
    // ═════════════════════════════════════════════════════════════════

    function test_CC_PreregisteredRules() public view {
        // 5 rules are pre-registered in initialize()
        bytes32[] memory ids = compliance.getAllViolationIds();
        // No violations yet, but rules should exist
        assertEq(ids.length, 0);

        // Check a known rule exists (Article 275)
        bytes32 ruleId = keccak256(
            abi.encodePacked(
                "Article 275 \xE2\x80\x94 Grants to States",
                "Constitution of India, Article 275"
            )
        );
        (bytes32 storedId, , , bool active) = compliance.rules(ruleId);
        assertEq(storedId, ruleId);
        assertTrue(active);
    }

    function test_CC_RegisterNewRule() public {
        vm.prank(admin);
        bytes32 ruleId = compliance.registerRule(
            "Right to Education Act",
            "Article 21A, Constitution of India"
        );
        assertTrue(ruleId != bytes32(0));

        (bytes32 storedId, , , bool active) = compliance.rules(ruleId);
        assertEq(storedId, ruleId);
        assertTrue(active);
    }

    function test_CC_RegisterRule_Unauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        compliance.registerRule("Fake Rule", "No basis");
    }

    function test_CC_RecordViolation() public {
        // Get a valid rule ID
        bytes32 ruleId = keccak256(
            abi.encodePacked(
                "Article 282 \xE2\x80\x94 Expenditure from CFI",
                "Constitution of India, Article 282"
            )
        );

        bytes32 disbId = keccak256("test_disbursement");

        vm.prank(cagAuditor);
        bytes32 violationId = compliance.recordViolation(
            disbId,
            ruleId,
            ConstitutionalCompliance.Severity.MEDIUM,
            "Expenditure exceeded Article 282 limits for state grants"
        );

        ConstitutionalCompliance.ComplianceViolation memory v = compliance.getViolation(violationId);
        assertEq(v.disbursementId, disbId);
        assertEq(v.ruleId, ruleId);
        assertEq(uint8(v.severity), uint8(ConstitutionalCompliance.Severity.MEDIUM));
        assertFalse(v.resolved);
    }

    function test_CC_HighSeverity_NotifiesLokpal() public {
        bytes32 ruleId = keccak256(
            abi.encodePacked(
                "FRBM Act \xE2\x80\x94 Fiscal Deficit Limit",
                "Fiscal Responsibility and Budget Management Act, 2003"
            )
        );
        bytes32 disbId = keccak256("critical_disbursement");

        vm.prank(cagAuditor);
        compliance.recordViolation(
            disbId,
            ruleId,
            ConstitutionalCompliance.Severity.CRITICAL,
            "Fiscal deficit breach"
        );

        // Verify Lokpal was notified
        assertTrue(compliance.lokpalNotified(disbId));
    }

    function test_CC_LowSeverity_NoLokpalNotification() public {
        bytes32 ruleId = keccak256(
            abi.encodePacked(
                "Article 275 \xE2\x80\x94 Grants to States",
                "Constitution of India, Article 275"
            )
        );
        bytes32 disbId = keccak256("low_severity_disb");

        vm.prank(cagAuditor);
        compliance.recordViolation(
            disbId,
            ruleId,
            ConstitutionalCompliance.Severity.LOW,
            "Minor procedural deviation"
        );

        assertFalse(compliance.lokpalNotified(disbId));
    }

    function test_CC_GenerateAutoFIR() public {
        bytes32 disbId = keccak256("fir_test_disbursement");
        bytes32 accusedDid = keccak256("did:polygonid:corrupt_official");

        vm.prank(cagAuditor);
        bytes32 firId = compliance.generateAutoFIR(
            disbId,
            accusedDid,
            500000000, // Rs 50 Lakh
            "IPC 409, 420; Prevention of Corruption Act S.13",
            "0xabc123"
        );

        ConstitutionalCompliance.AutoFIR memory fir = compliance.getFIR(firId);
        assertEq(fir.disbursementId, disbId);
        assertEq(fir.accusedDid, accusedDid);
        assertEq(fir.amount, 500000000);
        assertEq(uint8(fir.status), uint8(ConstitutionalCompliance.FIRStatus.AutoGenerated));
        assertEq(uint8(fir.severity), uint8(ConstitutionalCompliance.Severity.CRITICAL));
        assertEq(fir.escalationDeadline, fir.generatedAt + 72 hours);
        assertEq(compliance.firCount(), 1);
    }

    function test_CC_UpdateFIRStatus() public {
        bytes32 disbId = keccak256("fir_status_test");
        bytes32 accusedDid = keccak256("did:polygonid:accused");

        vm.startPrank(cagAuditor);
        bytes32 firId = compliance.generateAutoFIR(
            disbId, accusedDid, 100000000,
            "IPC 409", "0xdef456"
        );

        compliance.updateFIRStatus(firId, ConstitutionalCompliance.FIRStatus.SubmittedToPolice);
        vm.stopPrank();

        ConstitutionalCompliance.AutoFIR memory fir = compliance.getFIR(firId);
        assertEq(uint8(fir.status), uint8(ConstitutionalCompliance.FIRStatus.SubmittedToPolice));
    }

    function test_CC_72HourEscalationWindow() public {
        bytes32 disbId = keccak256("escalation_test");
        bytes32 accusedDid = keccak256("did:polygonid:accused2");

        vm.prank(cagAuditor);
        bytes32 firId = compliance.generateAutoFIR(
            disbId, accusedDid, 200000000,
            "IPC 420", "0x789abc"
        );

        ConstitutionalCompliance.AutoFIR memory fir = compliance.getFIR(firId);

        // Verify the 72-hour window is correctly set
        assertEq(fir.escalationDeadline - fir.generatedAt, 72 hours);

        // Should revert before deadline
        vm.prank(cagAuditor);
        vm.expectRevert("Escalation window not expired");
        compliance.triggerEscalation(firId);

        // Warp past the escalation deadline
        vm.warp(block.timestamp + 73 hours);
        assertTrue(block.timestamp > fir.escalationDeadline);

        // Now triggerEscalation should succeed
        vm.prank(cagAuditor);
        compliance.triggerEscalation(firId);

        // Verify FIR is now SubmittedToPolice
        ConstitutionalCompliance.AutoFIR memory escalatedFir = compliance.getFIR(firId);
        assertEq(uint8(escalatedFir.status), uint8(ConstitutionalCompliance.FIRStatus.SubmittedToPolice));
    }

    function test_CC_RecordViolation_Unauthorized() public {
        bytes32 ruleId = keccak256(
            abi.encodePacked(
                "Article 275 \xE2\x80\x94 Grants to States",
                "Constitution of India, Article 275"
            )
        );

        vm.prank(unauthorized);
        vm.expectRevert();
        compliance.recordViolation(
            keccak256("unauth"), ruleId,
            ConstitutionalCompliance.Severity.HIGH, "Unauthorized"
        );
    }

    // ═════════════════════════════════════════════════════════════════
    // ACCESS GOVERNANCE TESTS
    // ═════════════════════════════════════════════════════════════════

    function test_AG_RegisterIdentity() public {
        vm.prank(admin);
        accessGov.registerIdentity(
            citizen1,
            "did:polygonid:citizen_001",
            keccak256("vc_hash_citizen1"),
            accessGov.CITIZEN_ROLE()
        );

        assertTrue(accessGov.isActiveIdentity(citizen1));
        assertEq(accessGov.registeredCount(), 1);

        (string memory did, , , uint64 registeredAt, , bool active) = accessGov.identities(citizen1);
        assertEq(did, "did:polygonid:citizen_001");
        assertTrue(active);
        assertGt(registeredAt, 0);
    }

    function test_AG_DeactivateRevokesRole() public {
        vm.startPrank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );
        assertTrue(accessGov.hasRole(accessGov.CITIZEN_ROLE(), citizen1));

        accessGov.deactivateIdentity(citizen1);
        // Role should be revoked — not just cosmetic
        assertFalse(accessGov.hasRole(accessGov.CITIZEN_ROLE(), citizen1));
        vm.stopPrank();
    }

    function test_AG_ReactivateRestoresRole() public {
        vm.startPrank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.AUDITOR_ROLE()
        );
        accessGov.deactivateIdentity(citizen1);
        assertFalse(accessGov.hasRole(accessGov.AUDITOR_ROLE(), citizen1));

        accessGov.reactivateIdentity(citizen1);
        assertTrue(accessGov.hasRole(accessGov.AUDITOR_ROLE(), citizen1));
        vm.stopPrank();
    }

    function test_AG_RegisterUpgraderRoleReverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AccessGovernance.InvalidRole.selector, accessGov.UPGRADER_ROLE()));
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.UPGRADER_ROLE()
        );
    }

    function test_AG_RegisterIdentity_DuplicateReverts() public {
        vm.startPrank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );

        vm.expectRevert(abi.encodeWithSelector(AccessGovernance.AlreadyRegistered.selector, citizen1));
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1_dup",
            keccak256("vc1_dup"), accessGov.CITIZEN_ROLE()
        );
        vm.stopPrank();
    }

    function test_AG_RegisterIdentity_EmptyDIDReverts() public {
        vm.prank(admin);
        vm.expectRevert(AccessGovernance.InvalidDID.selector);
        accessGov.registerIdentity(
            citizen1, "", keccak256("vc"), accessGov.CITIZEN_ROLE()
        );
    }

    function test_AG_DeactivateIdentity() public {
        vm.startPrank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );

        assertTrue(accessGov.isActiveIdentity(citizen1));

        accessGov.deactivateIdentity(citizen1);
        assertFalse(accessGov.isActiveIdentity(citizen1));
        vm.stopPrank();
    }

    function test_AG_ReactivateIdentity() public {
        vm.startPrank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );

        accessGov.deactivateIdentity(citizen1);
        assertFalse(accessGov.isActiveIdentity(citizen1));

        accessGov.reactivateIdentity(citizen1);
        assertTrue(accessGov.isActiveIdentity(citizen1));
        vm.stopPrank();
    }

    function test_AG_DeactivateUnregistered_Reverts() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AccessGovernance.NotRegistered.selector, citizen2));
        accessGov.deactivateIdentity(citizen2);
    }

    function test_AG_RegisterMultipleRoles() public {
        vm.startPrank(admin);

        accessGov.registerIdentity(
            citizen1, "did:polygonid:citizen",
            keccak256("vc_citizen"), accessGov.CITIZEN_ROLE()
        );

        accessGov.registerIdentity(
            citizen2, "did:polygonid:auditor",
            keccak256("vc_auditor"), accessGov.AUDITOR_ROLE()
        );

        vm.stopPrank();

        assertTrue(accessGov.hasRole(accessGov.CITIZEN_ROLE(), citizen1));
        assertTrue(accessGov.hasRole(accessGov.AUDITOR_ROLE(), citizen2));
        assertEq(accessGov.registeredCount(), 2);
    }

    function test_AG_TouchActivity() public {
        vm.prank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );

        // Warp forward 1 day
        vm.warp(block.timestamp + 1 days);

        // touchActivity now requires ADMIN_ROLE
        vm.prank(admin);
        accessGov.touchActivity(citizen1);

        (, , , , uint64 lastActive, ) = accessGov.identities(citizen1);
        assertEq(lastActive, uint64(block.timestamp));
    }

    function test_AG_TouchActivity_Unauthorized() public {
        vm.prank(admin);
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );

        vm.prank(unauthorized);
        vm.expectRevert();
        accessGov.touchActivity(citizen1);
    }

    function test_AG_Unauthorized_CannotRegister() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        accessGov.registerIdentity(
            citizen1, "did:polygonid:c1",
            keccak256("vc1"), accessGov.CITIZEN_ROLE()
        );
    }
}
