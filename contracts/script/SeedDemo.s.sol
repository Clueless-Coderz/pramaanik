// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/SchemeRegistry.sol";
import "../src/FundFlow.sol";
import "../src/GrievancePortal.sol";

/// @title  SeedDemoScript
/// @notice Seeds the blockchain with realistic demo data for PRAMAANIK.
///
/// @dev    Budget figures sourced from:
///           - Union Budget 2025-26 (Ministry of Finance)
///           - PM-KISAN portal (pmkisan.gov.in) — Installment 19
///           - MGNREGA MIS (nreganarayan.nic.in) — Bihar FY26 wage notification
///           - Ayushman Bharat NHA dashboard (nha.gov.in) — HBP 2.0 package codes
///           - CAG Report No. 14 of 2024 — split-contract audit finding
///           - DBT Mission audit 2024 — ghost beneficiary statistics
///
/// @dev    All monetary values are stored in paisa (1 ₹ = 100 paisa).
///         Constants use the `_PAISA` suffix where the scale might be ambiguous.
///
///         Run:
///           forge script script/SeedDemo.s.sol \
///             --broadcast \
///             --rpc-url $BESU_RPC_URL \
///             --private-key $PRIVATE_KEY
contract SeedDemoScript is Script {

    // ─────────────────────────────────────────────────────────────────────────
    // Monetary constants — FY 2025-26 Union Budget state tranches (in paisa)
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev PM-KISAN: ₹21,000 Cr total; Rajasthan ~3.4% → ₹714 Cr
    uint256 constant PMKISAN_RJ_TRANCHE_PAISA   = 71_400_000_000_000;

    /// @dev MGNREGA: ₹86,000 Cr total; Bihar ~2.8% → ₹2,408 Cr
    uint256 constant MGNREGA_BR_TRANCHE_PAISA   = 240_800_000_000_000;

    /// @dev Ayushman Bharat PMJAY: ₹7,500 Cr total; MP ~4.1% → ₹307.5 Cr
    uint256 constant AYUSHMAN_MP_TRANCHE_PAISA  = 30_750_000_000_000;

    /// @dev PMAY-G: ₹54,500 Cr total; Odisha ~3.9% → ₹2,125.5 Cr
    uint256 constant PMAY_G_OD_TRANCHE_PAISA    = 212_550_000_000_000;

    // Disbursement amounts
    /// @dev PM-KISAN: ₹2,000 per installment (₹6,000/yr in 3 tranches)
    uint256 constant PMKISAN_INSTALLMENT_PAISA  = 200_000;

    /// @dev MGNREGA: Bihar FY26 notified wage rate ₹228/day
    uint256 constant MGNREGA_DAILY_RATE_PAISA   = 22_800;

    /// @dev PMAY-G: ₹40k foundation + ₹60k lintel + ₹20k completion = ₹1.2 Lakh
    uint256 constant PMAY_INST_FOUNDATION_PAISA = 4_000_000;
    uint256 constant PMAY_INST_LINTEL_PAISA     = 6_000_000;
    uint256 constant PMAY_INST_COMPLETION_PAISA = 2_000_000;

    // Ayushman Bharat HBP 2.0 package rates (National Health Authority standardised)
    /// @dev HBP code C14008: Coronary Artery Bypass Grafting → ₹1,70,000
    uint256 constant AYUSHMAN_CABG_PAISA        = 17_000_000;
    /// @dev HBP code C01007: Cataract surgery → ₹15,000
    uint256 constant AYUSHMAN_CATARACT_PAISA    = 1_500_000;
    /// @dev HBP code C06001: Normal delivery → ₹9,000
    uint256 constant AYUSHMAN_DELIVERY_PAISA    = 900_000;

    // Fraud simulation amounts
    /// @dev Split-contract amount: ₹49.8L — just below the ₹50L e-tender threshold
    uint256 constant SPLIT_CONTRACT_PAISA       = 4_980_000_000;
    /// @dev High-value PMJAY quarterly state-pool release: ₹50 Cr
    uint256 constant PMJAY_POOL_RELEASE_PAISA   = 5_000_000_000_000;

    // ─────────────────────────────────────────────────────────────────────────
    // Beneficiary DIDs
    // Fictitious but structurally consistent with Privado ID DID format.
    // Derived from Aadhaar-linked programme IDs (PM-KISAN, MGNREGA, PMJAY, PMAY-G).
    // ─────────────────────────────────────────────────────────────────────────

    // Rajasthan farmers — PM-KISAN Installment 19 (Apr 2025)
    bytes32 constant FARMER_RJ_001 = keccak256("did:polygonid:farmer:RJ:2025:RJ01AA001234567");
    bytes32 constant FARMER_RJ_002 = keccak256("did:polygonid:farmer:RJ:2025:RJ02BB002345678");
    bytes32 constant FARMER_RJ_003 = keccak256("did:polygonid:farmer:RJ:2025:RJ03CC003456789");
    bytes32 constant FARMER_RJ_004 = keccak256("did:polygonid:farmer:RJ:2025:RJ04DD004567890");
    bytes32 constant FARMER_RJ_005 = keccak256("did:polygonid:farmer:RJ:2025:RJ05EE005678901");

    // Bihar MGNREGA workers — Q1 FY26 wage payments, Aurangabad district
    bytes32 constant WORKER_BR_001 = keccak256("did:polygonid:worker:BR:2025:BR01NW001122334");
    bytes32 constant WORKER_BR_002 = keccak256("did:polygonid:worker:BR:2025:BR02NW002233445");
    bytes32 constant WORKER_BR_003 = keccak256("did:polygonid:worker:BR:2025:BR03NW003344556");

    // MP Ayushman Bharat PMJAY — hospital empanelment IDs
    bytes32 constant HOSPITAL_MP_001 = keccak256("did:polygonid:hospital:MP:PMJAY:HAAB0001234");
    bytes32 constant HOSPITAL_MP_002 = keccak256("did:polygonid:hospital:MP:PMJAY:HAAB0005678");
    bytes32 constant HOSPITAL_MP_003 = keccak256("did:polygonid:hospital:MP:PMJAY:HAAB0009012");

    // Odisha PMAY-G beneficiaries — SECC-2011 priority list, Koraput district
    bytes32 constant BENEFICIARY_OD_001 = keccak256("did:polygonid:beneficiary:OD:PMAYG:OD16KRP001");
    bytes32 constant BENEFICIARY_OD_002 = keccak256("did:polygonid:beneficiary:OD:PMAYG:OD16KRP002");

    // Ghost beneficiary — deceased farmer, Aadhaar not delinked after death
    // Based on DBT Mission audit 2024: 19.7L ineligible beneficiaries identified
    bytes32 constant FARMER_RJ_GHOST = keccak256("did:polygonid:farmer:RJ:deceased:RJ09ZZ999999999");

    // MP State Health Agency — recipient of quarterly PMJAY pool release
    bytes32 constant MP_STATE_HEALTH_AGENCY = keccak256("did:polygonid:government:MP:SHA:MPSHA001");

    // ─────────────────────────────────────────────────────────────────────────
    // Shell companies used in the split-contract fraud simulation
    // Based on CAG Report No. 14 of 2024 (Para 3.2.1): ₹1,243 Cr siphoned via
    // split contracts in road schemes across UP & Jharkhand.
    // Note: ALPHA and GAMMA share the PAN prefix AABCS → linked-entity signal for GNN.
    // ─────────────────────────────────────────────────────────────────────────
    bytes32 constant SHELL_CO_ALPHA = keccak256("did:polygonid:vendor:GST:09AABCS1234P1ZX"); // UP
    bytes32 constant SHELL_CO_BETA  = keccak256("did:polygonid:vendor:GST:20AADCF5678Q2ZY"); // Jharkhand
    bytes32 constant SHELL_CO_GAMMA = keccak256("did:polygonid:vendor:GST:09AABCS9999R3ZZ"); // UP (Alpha subsidiary)

    // ─────────────────────────────────────────────────────────────────────────
    // Contract references (set in run())
    // ─────────────────────────────────────────────────────────────────────────
    SchemeRegistry   private registry;
    FundFlow         private fundFlow;
    GrievancePortal  private grievancePortal;

    // ─────────────────────────────────────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────────────────────────────────────
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        _loadAndValidateContracts();

        vm.startBroadcast(deployerKey);

        (
            bytes32 pmkisan,
            bytes32 mgnrega,
            bytes32 ayushman,
            bytes32 pmayg
        ) = _registerSchemes();

        _seedPmkisan(pmkisan);
        _seedMgnrega(mgnrega);
        _seedAyushman(ayushman);
        _seedPmayg(pmayg);
        _seedFraudSplitContract(mgnrega);
        _seedFraudGhostBeneficiary(pmkisan);
        _seedHighValueMultiSig(ayushman);
        _seedGrievances(pmkisan, mgnrega, pmayg);

        vm.stopBroadcast();

        _printSummary();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Loads contract addresses from env and reverts with a descriptive
    ///      message if any address is zero — prevents silent failures where
    ///      `vm.envAddress` returns address(0) for a missing variable.
    function _loadAndValidateContracts() private {
        address registryAddr       = vm.envAddress("SCHEME_REGISTRY_ADDRESS");
        address fundFlowAddr       = vm.envAddress("FUND_FLOW_ADDRESS");
        address grievanceAddr      = vm.envAddress("GRIEVANCE_PORTAL_ADDRESS");

        require(registryAddr  != address(0), "SeedDemo: SCHEME_REGISTRY_ADDRESS not set");
        require(fundFlowAddr  != address(0), "SeedDemo: FUND_FLOW_ADDRESS not set");
        require(grievanceAddr != address(0), "SeedDemo: GRIEVANCE_PORTAL_ADDRESS not set");

        registry        = SchemeRegistry(registryAddr);
        fundFlow        = FundFlow(fundFlowAddr);
        grievancePortal = GrievancePortal(grievanceAddr);
    }

    /// @dev Registers the four FY 2025-26 welfare schemes and returns their IDs.
    function _registerSchemes()
        private
        returns (
            bytes32 pmkisan,
            bytes32 mgnrega,
            bytes32 ayushman,
            bytes32 pmayg
        )
    {
        // PM-KISAN: Pradhan Mantri Kisan Samman Nidhi
        // Budget ₹21,000 Cr | ~11 Cr farmers | ₹6,000/yr in 3 installments
        pmkisan = registry.registerScheme(
            "PM-KISAN FY2025-26 Installment-19",
            "Ministry of Agriculture & Farmers Welfare",
            "Department of Agriculture, Cooperation & Farmers Welfare",
            PMKISAN_RJ_TRANCHE_PAISA,
            "ipfs://QmPMKISAN2526RajasthanQ1"
        );
        console.log("Registered: PM-KISAN (Rajasthan tranche, Rs.714 Cr)");

        // MGNREGA: Mahatma Gandhi National Rural Employment Guarantee Act
        // Budget ₹86,000 Cr | Bihar wage rate ₹228/day (FY26 notification)
        mgnrega = registry.registerScheme(
            "MGNREGA FY2025-26 Bihar-Q1",
            "Ministry of Rural Development",
            "Department of Rural Development",
            MGNREGA_BR_TRANCHE_PAISA,
            "ipfs://QmMGNREGA2526BiharQ1Aurangabad"
        );
        console.log("Registered: MGNREGA (Bihar tranche, Rs.2408 Cr)");

        // Ayushman Bharat PMJAY: Pradhan Mantri Jan Arogya Yojana
        // Budget ₹7,500 Cr | ₹5L/family/yr cover | ~55 Cr beneficiaries
        ayushman = registry.registerScheme(
            "Ayushman Bharat PMJAY FY2025-26 MP",
            "Ministry of Health & Family Welfare",
            "National Health Authority",
            AYUSHMAN_MP_TRANCHE_PAISA,
            "ipfs://QmAYUSHMAN2526MPHospitalPool"
        );
        console.log("Registered: Ayushman Bharat PMJAY (MP tranche, Rs.307.5 Cr)");

        // PMAY-G: Pradhan Mantri Awas Yojana (Gramin)
        // Budget ₹54,500 Cr | Per-unit: ₹1.2L (plain) / ₹1.3L (hilly)
        pmayg = registry.registerScheme(
            "PMAY-G FY2025-26 Odisha Phase-3",
            "Ministry of Rural Development",
            "Department of Rural Development",
            PMAY_G_OD_TRANCHE_PAISA,
            "ipfs://QmPMAYG2526OdishaKoraputPhase3"
        );
        console.log("Registered: PMAY-G (Odisha tranche, Rs.2125.5 Cr)");
    }

    /// @dev PM-KISAN Installment-19 — 5 Rajasthan farmers, ₹2,000 each via DBT.
    ///      Full pipeline: Central → State DBT → farmer bank account (PFMS route).
    function _seedPmkisan(bytes32 schemeId) private {
        bytes32[5] memory farmers = [
            FARMER_RJ_001, FARMER_RJ_002, FARMER_RJ_003, FARMER_RJ_004, FARMER_RJ_005
        ];
        string[5] memory docs = [
            "ipfs://pmkisan/i19/RJ01AA001234567",
            "ipfs://pmkisan/i19/RJ02BB002345678",
            "ipfs://pmkisan/i19/RJ03CC003456789",
            "ipfs://pmkisan/i19/RJ04DD004567890",
            "ipfs://pmkisan/i19/RJ05EE005678901"
        ];

        for (uint256 i = 0; i < 5; i++) {
            bytes32 disbId = _createAndRelease(
                schemeId,
                farmers[i],
                PMKISAN_INSTALLMENT_PAISA,
                keccak256(abi.encodePacked("pmkisan_i19_rj_", i)),
                docs[i],
                FundFlow.GovLevel.Central,
                FundFlow.GovLevel.State
            );
            // Suppress unused variable warning in older Solidity versions
            disbId;
        }
        console.log("5 PM-KISAN Installment-19 payments (Rs.2,000 each, DBT to bank)");
    }

    /// @dev MGNREGA wages — Aurangabad, Bihar.
    ///      Bihar FY26 notified rate: ₹228/day via NeFMS.
    function _seedMgnrega(bytes32 schemeId) private {
        bytes32[3] memory workers = [WORKER_BR_001, WORKER_BR_002, WORKER_BR_003];

        // Days worked: 14, 13, 15 — amounts computed from the daily rate constant
        // so a single rate update propagates everywhere.
        uint256[3] memory wages = [
            MGNREGA_DAILY_RATE_PAISA * 14,  // ₹3,192
            MGNREGA_DAILY_RATE_PAISA * 13,  // ₹2,964
            MGNREGA_DAILY_RATE_PAISA * 15   // ₹3,420 (15-day period)
        ];

        for (uint256 i = 0; i < 3; i++) {
            bytes32 disbId = _createAndRelease(
                schemeId,
                workers[i],
                wages[i],
                keccak256(abi.encodePacked("mgnrega_br_aurangabad_q1_", i)),
                "ipfs://mgnrega/FY2526/BR/Aurangabad/JC-2025-04",
                FundFlow.GovLevel.State,
                FundFlow.GovLevel.District
            );
            disbId;
        }
        console.log("3 MGNREGA wage payments (Bihar rate Rs.228/day via NeFMS)");
    }

    /// @dev Ayushman Bharat PMJAY hospital claim reimbursements — Madhya Pradesh.
    ///      Uses HBP 2.0 package codes (NHA standardised rates).
    function _seedAyushman(bytes32 schemeId) private {
        bytes32[3] memory hospitals = [HOSPITAL_MP_001, HOSPITAL_MP_002, HOSPITAL_MP_003];
        uint256[3] memory claims    = [AYUSHMAN_CABG_PAISA, AYUSHMAN_CATARACT_PAISA, AYUSHMAN_DELIVERY_PAISA];
        string[3] memory  docs = [
            "ipfs://ayushman/PMJAY/MP/claim/C14008-CABG-2025-04-001",
            "ipfs://ayushman/PMJAY/MP/claim/C01007-Cataract-2025-04-087",
            "ipfs://ayushman/PMJAY/MP/claim/C06001-NormalDelivery-2025-04-213"
        ];

        for (uint256 i = 0; i < 3; i++) {
            bytes32 disbId = _createAndRelease(
                schemeId,
                hospitals[i],
                claims[i],
                keccak256(abi.encodePacked("ayushman_mp_claim_", i)),
                docs[i],
                FundFlow.GovLevel.Central,
                FundFlow.GovLevel.State
            );
            disbId;
        }
        console.log("3 Ayushman PMJAY hospital claims (HBP 2.0: CABG/Cataract/Delivery)");
    }

    /// @dev PMAY-G house construction installments — Koraput, Odisha.
    ///      3-instalment structure: foundation ₹40k + lintel ₹60k + completion ₹20k.
    ///      Beneficiary 2 is intentionally stalled at lintel stage (partial-progress demo).
    function _seedPmayg(bytes32 schemeId) private {
        bytes32[2] memory beneficiaries = [BENEFICIARY_OD_001, BENEFICIARY_OD_002];
        uint256[3] memory amounts = [
            PMAY_INST_FOUNDATION_PAISA,
            PMAY_INST_LINTEL_PAISA,
            PMAY_INST_COMPLETION_PAISA
        ];
        string[3] memory docs = [
            "ipfs://pmayg/OD/Koraput/2025/foundation",
            "ipfs://pmayg/OD/Koraput/2025/lintel",
            "ipfs://pmayg/OD/Koraput/2025/completion"
        ];

        for (uint256 b = 0; b < 2; b++) {
            for (uint256 inst = 0; inst < 3; inst++) {
                bytes32 disbId = fundFlow.createDisbursement(
                    schemeId,
                    FundFlow.FlowStage.Sanctioned,
                    beneficiaries[b],
                    amounts[inst],
                    keccak256(abi.encodePacked("pmayg_od_koraput_", b, "_inst_", inst)),
                    docs[inst],
                    true, true, true,
                    FundFlow.GovLevel.Central,
                    FundFlow.GovLevel.State
                );

                // Beneficiary 2 (b==1) is stalled: release only foundation + lintel,
                // not the completion instalment. Demonstrates mid-pipeline audit view.
                bool shouldRelease = (b == 0) || (inst < 2);
                if (shouldRelease) {
                    _advanceToLastMile(disbId);
                }
            }
        }
        console.log("PMAY-G: 6 installments created; beneficiary 2 stalled at lintel stage");
    }

    /// @dev Fraud scenario 1 — split-contract pattern.
    ///      5 × ₹49.8L orders to linked shell companies, all below the ₹50L
    ///      e-tender threshold. Total exposure: ₹2.49 Cr.
    ///      Detection signals for GNN: threshold proximity, same-vendor repeats,
    ///      linked-entity cluster (ALPHA/GAMMA share PAN prefix AABCS).
    ///      Source: CAG Report No. 14 of 2024, Para 3.2.1.
    function _seedFraudSplitContract(bytes32 schemeId) private {
        bytes32[5] memory vendors = [
            SHELL_CO_ALPHA,   // Order 1
            SHELL_CO_BETA,    // Order 2 (related entity)
            SHELL_CO_GAMMA,   // Order 3 (Alpha subsidiary)
            SHELL_CO_ALPHA,   // Order 4 — repeat order, 2nd tranche
            SHELL_CO_BETA     // Order 5 — parallel order
        ];
        string[5] memory workOrders = [
            "ipfs://mgnrega/UP/Prayagraj/WO-2025-0441-SplitA",
            "ipfs://mgnrega/JH/Dhanbad/WO-2025-0112-SplitB",
            "ipfs://mgnrega/UP/Prayagraj/WO-2025-0442-SplitC",
            "ipfs://mgnrega/UP/Prayagraj/WO-2025-0443-SplitD",
            "ipfs://mgnrega/JH/Dhanbad/WO-2025-0113-SplitE"
        ];

        for (uint256 i = 0; i < 5; i++) {
            // Deliberately NOT calling _advanceToLastMile — these are flagged,
            // not legitimately disbursed.
            fundFlow.createDisbursement(
                schemeId,
                FundFlow.FlowStage.Sanctioned,
                vendors[i],
                SPLIT_CONTRACT_PAISA,
                keccak256(abi.encodePacked("fraud_splitcontract_", i)),
                workOrders[i],
                true, true, true,   // Checks spoofed — GNN should catch the pattern
                FundFlow.GovLevel.State,
                FundFlow.GovLevel.District
            );
        }
        console.log("5 split-contract fraud disbursements (Rs.49.8L x5, CAG pattern)");
        console.log("  Vendors: ALPHA x2, BETA x2, GAMMA x1 (ALPHA/GAMMA share PAN prefix)");
        console.log("  Expected GNN signals: threshold proximity, repeat vendor, linked cluster");
    }

    /// @dev Fraud scenario 2 — ghost beneficiary.
    ///      Deceased farmer whose Aadhaar was not delinked after death.
    ///      eKYC flag is false (annual KYC lapsed) — primary detection signal.
    ///      Source: DBT Mission audit 2024 (19.7L ineligible beneficiaries found).
    function _seedFraudGhostBeneficiary(bytes32 schemeId) private {
        fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            FARMER_RJ_GHOST,
            PMKISAN_INSTALLMENT_PAISA,
            keccak256("pmkisan_i19_ghost_RJ09ZZ999999999"),
            "ipfs://pmkisan/i19/RJ09ZZ999999999",
            true,   // Aadhaar seed: true — Aadhaar NOT delinked after death
            false,  // eKYC: false — annual KYC lapsed (primary detection signal)
            true,   // Land record: true — Patwari records not updated
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        console.log("Ghost beneficiary created (deceased farmer, eKYC lapsed, Aadhaar active)");
    }

    /// @dev High-value disbursement requiring dual approval (NHA + MP SHA).
    ///      ₹50 Cr quarterly PMJAY pool release — intentionally left at Sanctioned
    ///      stage to demonstrate the multi-sig pending state in the demo UI.
    function _seedHighValueMultiSig(bytes32 schemeId) private {
        fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            MP_STATE_HEALTH_AGENCY,
            PMJAY_POOL_RELEASE_PAISA,
            keccak256("ayushman_mp_sha_q1fy26_pool_release"),
            "ipfs://ayushman/PMJAY/MP/SHA/PoolRelease-Q1-FY2526",
            true, true, true,
            FundFlow.GovLevel.Central,
            FundFlow.GovLevel.State
        );
        console.log("High-value multi-sig created: Rs.50 Cr PMJAY pool -> MP SHA");
        console.log("  Status: PENDING 2nd approval (NHA central admin must co-sign)");
    }

    /// @dev Files three CPGRAMS-style citizen grievances for the demo.
    function _seedGrievances(
        bytes32 pmkisan,
        bytes32 mgnrega,
        bytes32 pmayg
    ) private {
        // PM-KISAN: installment not credited despite valid Aadhaar-bank seeding
        grievancePortal.fileGrievance(
            pmkisan,
            FARMER_RJ_003,
            "Installment-19 not credited. Aadhaar-bank seeding done on 12-Mar-2025 at CSC "
            "Sikar. PFMS shows 'Pending at State'. Contact: 9414XXXXXX. "
            "Reference: CPGRAMS/2025/DAKL/100234.",
            "ipfs://evidence_pmkisan"
        );

        // MGNREGA: wages overdue beyond the 15-day statutory limit (Section 3(3))
        grievancePortal.fileGrievance(
            mgnrega,
            WORKER_BR_001,
            "Job Card No. BR-02-005-001-000/1234. Work completed 01-Apr-2025 to 14-Apr-2025 "
            "(Muster Roll No. MR/BR/AUR/2025/04/0087). Wages not credited as of 02-May-2025. "
            "Section 3(3) MIS delay: 18 days. Compensation claim pending.",
            "ipfs://evidence_mgnrega"
        );

        // PMAY-G: quality complaint — JE certified completion without site visit
        grievancePortal.fileGrievance(
            pmayg,
            BENEFICIARY_OD_001,
            "House ID: OD-16-KRP-2025-001. Foundation complete but wall cracks visible within "
            "15 days. JE Suresh Nayak certified completion without site visit per AwaasSoft. "
            "Request geo-tagged photo re-verification under PMAY-G monitoring framework.",
            "ipfs://evidence_pmayg"
        );

        console.log("3 grievances filed (PM-KISAN delay, MGNREGA overdue wages, PMAY-G quality)");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private utilities
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Creates a disbursement and immediately advances it through the full
    ///      pipeline: Sanctioned → ReleasedToState → ReleasedToAgency → ReleasedToBeneficiary.
    ///      Used for legitimate, fully-completed payment flows.
    function _createAndRelease(
        bytes32             schemeId,
        bytes32             beneficiary,
        uint256             amountPaisa,
        bytes32             referenceId,
        string memory       documentUri,
        FundFlow.GovLevel   fromLevel,
        FundFlow.GovLevel   toLevel
    ) private returns (bytes32 disbId) {
        disbId = fundFlow.createDisbursement(
            schemeId,
            FundFlow.FlowStage.Sanctioned,
            beneficiary,
            amountPaisa,
            referenceId,
            documentUri,
            true, true, true,
            fromLevel,
            toLevel
        );
        _advanceToLastMile(disbId);
    }

    /// @dev Advances a disbursement through the three post-sanction stages.
    function _advanceToLastMile(bytes32 disbId) private {
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToState);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToAgency);
        fundFlow.advanceStage(disbId, FundFlow.FlowStage.ReleasedToBeneficiary);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary output
    // ─────────────────────────────────────────────────────────────────────────

    function _printSummary() private pure {
        console.log("\n==========================================================");
        console.log("             DEMO SEED COMPLETE -- FY 2025-26");
        console.log("==========================================================");
        console.log("");
        console.log("SCHEMES REGISTERED (4):");
        console.log("  PM-KISAN       Rajasthan     Rs.714 Cr");
        console.log("  MGNREGA        Bihar         Rs.2,408 Cr");
        console.log("  Ayushman PMJAY Madhya Pradesh Rs.307.5 Cr");
        console.log("  PMAY-G         Odisha (Koraput) Rs.2,125.5 Cr");
        console.log("");
        console.log("NORMAL DISBURSEMENTS (14):");
        console.log("  5x PM-KISAN Installment-19 (Rs.2,000 each, Rajasthan DBT)");
        console.log("  3x MGNREGA wages (Rs.228/day Bihar rate, Aurangabad NeFMS)");
        console.log("  3x Ayushman claims (HBP 2.0: CABG / Cataract / Delivery)");
        console.log("  3x PMAY-G instalments x2 beneficiaries (Koraput, Odisha)");
        console.log("");
        console.log("ANOMALY CASES (7):");
        console.log("  5x Split-contract (Rs.49.8L x5, CAG pattern, 3 linked vendors)");
        console.log("  1x Ghost beneficiary (deceased farmer, eKYC=false)");
        console.log("  1x High-value multi-sig pending (Rs.50 Cr PMJAY, awaiting NHA)");
        console.log("");
        console.log("GRIEVANCES (3):");
        console.log("  PM-KISAN payment delay (PFMS stuck at State level)");
        console.log("  MGNREGA wages overdue >15 days (Section 3(3) violation)");
        console.log("  PMAY-G quality complaint (JE certification without site visit)");
        console.log("");
        console.log("NEXT STEPS:");
        console.log("  1. Run GNN anomaly detection on split-contract cluster");
        console.log("  2. Oracle re-check on ghost beneficiary (eKYC=false signal)");
        console.log("  3. Submit 2nd admin approval for Rs.50 Cr PMJAY multi-sig");
        console.log("  4. PMAY-G geo-tagged re-verification for grievance OD-16-KRP");
        console.log("==========================================================");
    }
}
