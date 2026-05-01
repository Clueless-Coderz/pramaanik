"use client";

import { useState, useEffect } from "react";
import {
  getFundFlow,
  getSchemeRegistry,
  getAnchor,
  formatStage,
  formatPaisa,
  shortenHash,
  timeAgo,
} from "./contracts";

// ─── Types ───────────────────────────────────────────────────────────────
export interface DisbursementView {
  id: string;
  scheme: string;
  stage: string;
  amount: string;
  recipient: string;
  time: string;
  status: "active" | "flagged" | "frozen" | "pending";
  gst: boolean;
  bank: boolean;
  geo: boolean;
}

export interface SchemeView {
  name: string;
  ministry: string;
  budget: string;
  beneficiaries: string;
  disbursed: string;
  disbursedPct: number;
}

export interface AnchorView {
  chain: string;
  root: string;
  seq: number;
  time: string;
  status: string;
}

export interface ChainStats {
  totalSanctioned: string;
  activeSchemes: number;
  disbursementCount: number;
  flaggedCount: number;
}

export type Severity = "critical" | "high" | "medium";

export interface FlagView {
  id: string;
  type: string;
  scheme: string;
  risk: number;
  severity: Severity;
  amountRaw: number;
  amount: string;
  txId: string;
  proofVerified: boolean;
  timeMs: number;
  time: string;
  proof: string;
  explanation: string;
  motif?: string;
  model?: string;
  disbursementId?: string;
}

export interface GrievanceView {
  id: string;
  scheme: string;
  filer: string;
  title: string;
  description: string;
  status: "open" | "investigating" | "resolved";
  filedAt: string;
  lastUpdated: string;
  txHash: string;
  responseCount: number;
}

export type FreezeStatus = "Frozen" | "Under Review" | "Released";

export interface FrozenAsset {
  id: string;
  txId: string;
  scheme: string;
  amountRaw: number;
  amount: string;
  reason: string;
  flag: string;
  frozenAt: string;
  frozenBy: string;
  status: FreezeStatus;
  daysLocked: number;
}

export interface TrailEvent {
  seq: number;
  title: string;
  actor: string;
  actorId: string;
  txId: string;
  when: string;
  description: string;
  verified: boolean;
}

// ─── Seeded Fallback Data (mirrors SeedDemo.s.sol) ───────────────────────
// All figures sourced from Union Budget 2025-26, PM-KISAN, MGNREGA MIS,
// Ayushman Bharat NHA, and CAG reports 2024-25.

const SEEDED_SCHEMES: SchemeView[] = [
  {
    name: "PM-KISAN FY2025-26 Installment-19",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    budget: "₹714.0 Cr",
    beneficiaries: "5",
    disbursed: "100%",
    disbursedPct: 100,
  },
  {
    name: "MGNREGA FY2025-26 Bihar-Q1",
    ministry: "Ministry of Rural Development",
    budget: "₹2,408.0 Cr",
    beneficiaries: "3",
    disbursed: "4%",
    disbursedPct: 4,
  },
  {
    name: "Ayushman Bharat PMJAY FY2025-26 MP",
    ministry: "Ministry of Health & Family Welfare",
    budget: "₹307.5 Cr",
    beneficiaries: "3",
    disbursed: "6%",
    disbursedPct: 6,
  },
  {
    name: "PMAY-G FY2025-26 Odisha Phase-3",
    ministry: "Ministry of Rural Development",
    budget: "₹2,125.5 Cr",
    beneficiaries: "2",
    disbursed: "1%",
    disbursedPct: 1,
  },
];

const SEEDED_DISBURSEMENTS: DisbursementView[] = [
  // PM-KISAN Installment-19 (5 farmers × ₹2,000)
  {
    id: "0xa1b2...c3d4",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ01AA",
    time: "2 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xe5f6...g7h8",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ02BB",
    time: "3 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xi9j0...k1l2",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ03CC",
    time: "4 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xm3n4...o5p6",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ04DD",
    time: "5 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xq7r8...s9t0",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ05EE",
    time: "6 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  // MGNREGA wages (3 workers, Bihar ₹228/day)
  {
    id: "0xb12e...f843",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "ReleasedToBeneficiary",
    amount: "₹3,192",
    recipient: "did:polygonid:worker:BR01NW",
    time: "8 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xc23f...d456",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "ReleasedToBeneficiary",
    amount: "₹2,964",
    recipient: "did:polygonid:worker:BR02NW",
    time: "9 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xd34a...e567",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "ReleasedToBeneficiary",
    amount: "₹3,420",
    recipient: "did:polygonid:worker:BR03NW",
    time: "10 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  // Ayushman Bharat hospital claims (HBP 2.0 packages)
  {
    id: "0xe45b...f678",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    stage: "ReleasedToBeneficiary",
    amount: "₹1.7 L",
    recipient: "did:polygonid:hospital:MP:HAAB0001",
    time: "12 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xf56c...a789",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    stage: "ReleasedToBeneficiary",
    amount: "₹15,000",
    recipient: "did:polygonid:hospital:MP:HAAB0005",
    time: "13 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xa67d...b890",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    stage: "ReleasedToBeneficiary",
    amount: "₹9,000",
    recipient: "did:polygonid:hospital:MP:HAAB0009",
    time: "14 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  // Split-contract fraud (5 × ₹49.8L)
  {
    id: "0x7c2f...a3d1",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "Sanctioned",
    amount: "₹49.8 L",
    recipient: "did:polygonid:vendor:GST:09AABCS1234",
    time: "18 min ago",
    status: "flagged",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0x8d3a...b4e2",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "Sanctioned",
    amount: "₹49.8 L",
    recipient: "did:polygonid:vendor:GST:20AADCF5678",
    time: "19 min ago",
    status: "flagged",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0x9e4b...c5f3",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "Sanctioned",
    amount: "₹49.8 L",
    recipient: "did:polygonid:vendor:GST:09AABCS9999",
    time: "20 min ago",
    status: "flagged",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xaf5c...d6a4",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "Sanctioned",
    amount: "₹49.8 L",
    recipient: "did:polygonid:vendor:GST:09AABCS1234",
    time: "21 min ago",
    status: "flagged",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xba6d...e7b5",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    stage: "Sanctioned",
    amount: "₹49.8 L",
    recipient: "did:polygonid:vendor:GST:20AADCF5678",
    time: "22 min ago",
    status: "flagged",
    gst: true,
    bank: true,
    geo: true,
  },
  // Ghost beneficiary
  {
    id: "0xcb7e...f8c6",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    stage: "Sanctioned",
    amount: "₹2,000",
    recipient: "did:polygonid:farmer:RJ:deceased",
    time: "25 min ago",
    status: "flagged",
    gst: true,
    bank: false,
    geo: true,
  },
  // High-value pending (₹50 Cr)
  {
    id: "0xdc8f...a9d7",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    stage: "Sanctioned",
    amount: "₹50.0 Cr",
    recipient: "did:polygonid:government:MP:SHA",
    time: "30 min ago",
    status: "pending",
    gst: true,
    bank: true,
    geo: true,
  },
];

const SEEDED_FLAGS: FlagView[] = [
  {
    id: "FLAG-001",
    type: "Split Contract Pattern",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    risk: 8500,
    severity: "high",
    amountRaw: 24900000,
    amount: "₹2.49 Cr",
    txId: "0x7c2f...a3d1",
    proofVerified: true,
    timeMs: Date.now() - 18 * 60 * 1000,
    time: "18 min ago",
    proof: "0x7c2f...a3d1",
    explanation:
      "5 transactions of ₹49.8L to 3 linked vendors within 24h — CAG Report No.14 threshold-avoidance motif. Vendors share PAN prefix AABCS.",
    motif: "Temporal burst: Agency → Vendor (×5 in 24h, amount clustering at ₹49.8L)",
    model: "RGCN v2.3",
    disbursementId: "0x7c2f...a3d1",
  },
  {
    id: "FLAG-002",
    type: "Ghost Beneficiary",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    risk: 9800,
    severity: "critical",
    amountRaw: 2000,
    amount: "₹2,000",
    txId: "0xcb7e...f8c6",
    proofVerified: true,
    timeMs: Date.now() - 25 * 60 * 1000,
    time: "25 min ago",
    proof: "0xcb7e...f8c6",
    explanation:
      "Deceased farmer RJ09ZZ999999999 — Aadhaar status INACTIVE, death registry match confirmed. e-KYC lapsed (annual KYC not renewed). ₹2,000 routing to operator-controlled account.",
    motif: "Deceased-beneficiary subgraph: Treasury → Agency → [DECEASED_DID]",
    model: "RGCN v2.3",
    disbursementId: "0xcb7e...f8c6",
  },
  {
    id: "FLAG-003",
    type: "Multi-sig Pending",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    risk: 5400,
    severity: "medium",
    amountRaw: 5000000000,
    amount: "₹50.0 Cr",
    txId: "0xdc8f...a9d7",
    proofVerified: false,
    timeMs: Date.now() - 30 * 60 * 1000,
    time: "30 min ago",
    proof: "0xdc8f...a9d7",
    explanation:
      "₹50 Cr quarterly pool release to MP State Health Agency requires dual NHA+SHA co-approval. Awaiting 2nd admin signature.",
    motif: "Multi-sig threshold: High-value release pending co-approval",
    model: "RGCN v2.3",
    disbursementId: "0xdc8f...a9d7",
  },
];

const SEEDED_GRIEVANCES: GrievanceView[] = [
  {
    id: "GRV-001",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    title: "Installment-19 not credited",
    filer: "did:polygonid:farmer:RJ03CC",
    description:
      "Installment-19 not credited. Aadhaar-bank seeding done on 12-Mar-2025 at CSC Sikar. PFMS shows 'Pending at State'. Reference: CPGRAMS/2025/DAKL/100234.",
    status: "open",
    filedAt: "2026-04-30",
    lastUpdated: "2026-04-30",
    txHash: "0x9d4ae7f1c3b2a1d0e9f8c7b6a5d4e3f2",
    responseCount: 0,
  },
  {
    id: "GRV-002",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    title: "Wages delayed beyond 15 days",
    filer: "did:polygonid:worker:BR01NW",
    description:
      "Job Card No. BR-02-005-001-000/1234. Work completed 01-Apr-2025 to 14-Apr-2025 (Muster Roll MR/BR/AUR/2025/04/0087). Wages not credited as of 02-May-2025. Section 3(3) delay: 18 days.",
    status: "investigating",
    filedAt: "2026-05-01",
    lastUpdated: "2026-05-01",
    txHash: "0x7c2fa3d1b4e5c6d7e8f9a0b1c2d3e4f5",
    responseCount: 2,
  },
  {
    id: "GRV-003",
    scheme: "PMAY-G FY2025-26 Odisha Phase-3",
    title: "Poor construction quality",
    filer: "did:polygonid:beneficiary:OD:PMAYG:OD16KRP001",
    description:
      "House ID OD-16-KRP-2025-001. Foundation work completed but wall cracks visible within 15 days. Junior Engineer certified completion without site visit per AwaasSoft upload. Request geo-tagged re-verification.",
    status: "open",
    filedAt: "2026-05-01",
    lastUpdated: "2026-05-01",
    txHash: "0x4b3c5e2f1a8d9c7b6e5f4d3c2b1a0987",
    responseCount: 1,
  },
];

const SEEDED_FROZEN: FrozenAsset[] = [
  {
    id: "FRZ-001",
    txId: "0xcb7e...f8c6",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    amountRaw: 2000,
    amount: "₹2,000",
    reason: "Deceased beneficiary detected by zkML oracle — Aadhaar status INACTIVE, death registry match confirmed.",
    flag: "FLAG-002",
    frozenAt: "2026-04-30 18:42 IST",
    frozenBy: "Auditor 0xcag…01",
    status: "Frozen",
    daysLocked: 1,
  },
  {
    id: "FRZ-002",
    txId: "0x7c2f...a3d1",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    amountRaw: 24900000,
    amount: "₹2.49 Cr",
    reason: "Split-contract pattern — five transactions of ₹49.8L to linked vendors within 24 hours, threshold-avoidance motif.",
    flag: "FLAG-001",
    frozenAt: "2026-04-29 09:32 IST",
    frozenBy: "Auditor 0xcag…02",
    status: "Under Review",
    daysLocked: 2,
  },
];

const SEEDED_ANCHORS: AnchorView[] = [
  {
    chain: "Polygon Amoy",
    root: "0x7f4c5e...2b9d1a4c",
    seq: 482901,
    time: "just now",
    status: "confirmed",
  },
  {
    chain: "Ethereum Sepolia",
    root: "0xa1c9e2...8b7c6d5e",
    seq: 241450,
    time: "3 min ago",
    status: "confirmed",
  },
];

const SEEDED_TRAIL: TrailEvent[] = [
  {
    seq: 1,
    title: "Scheme Sanctioned",
    actor: "Ministry of Rural Development",
    actorId: "did:polygonid:ministry:rural",
    txId: "0x0a1b2c3d4e5f6a7b8c9d0e1f",
    when: "2025-04-01 09:14 IST",
    description: "Scheme `MGNREGA FY2025-26 Bihar-Q1` registered with sanctioned budget ₹2,408.0 Cr. SchemeRegistry event emitted.",
    verified: true,
  },
  {
    seq: 2,
    title: "Disbursement Initiated",
    actor: "Agency 0x1c9e",
    actorId: "did:polygonid:agency:1c9e",
    txId: "0x7c2fa3d1b4e5c6d7e8f9a0b1c2d3e4f5",
    when: "2025-04-30 11:23 IST",
    description: "Disbursement of ₹49.8 L created targeting vendor 0xv1. GST/Bank/Geo oracles invoked.",
    verified: true,
  },
  {
    seq: 3,
    title: "Oracle Attestation",
    actor: "Chainlink Functions",
    actorId: "fn:chainlink:gst+npci+geo",
    txId: "0xa1c9e29f8b7c6d5e4a3b2c1d",
    when: "2025-04-30 11:24 IST",
    description: "GST: VALID · Bank: UNIQUE · Geo: WITHIN-POLYGON. Attestation hash anchored in AnomalyOracle.",
    verified: true,
  },
  {
    seq: 4,
    title: "zkML Anomaly Flag",
    actor: "RGCN v2.3",
    actorId: "model:RGCN-v2.3",
    txId: "0x4b3c5e2f1a8d9c7b6e5f4d3c",
    when: "2025-04-30 11:25 IST",
    description: "Pattern matched: 5 consecutive ₹49.8L disbursements to linked vendors in 24h. Risk = 8500 / 10000.",
    verified: true,
  },
  {
    seq: 5,
    title: "Frozen by Auditor",
    actor: "Auditor 0xcag…02",
    actorId: "did:polygonid:auditor:cag02",
    txId: "0x9d4ae7f1c3b2a1d0e9f8c7b6",
    when: "2025-04-30 11:32 IST",
    description: "Auditor invoked `freezeDisbursement(0x7c2f…)`. Funds locked pending CAG review.",
    verified: true,
  },
  {
    seq: 6,
    title: "Anchored to Polygon Amoy",
    actor: "Anchor Service",
    actorId: "service:anchor",
    txId: "0x7f4c5e2b9d1a4c8e7f1a3b5c",
    when: "2025-04-30 11:35 IST",
    description: "Merkle root containing this trail anchored to Polygon Amoy at sequence #482,901.",
    verified: true,
  },
];

const SEEDED_STATS: ChainStats = {
  totalSanctioned: "₹5,555.0 Cr",
  activeSchemes: 4,
  disbursementCount: 21,
  flaggedCount: 7,
};

// ─── Hook: useChainData ──────────────────────────────────────────────────
export function useChainData() {
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [disbursements, setDisbursements] = useState<DisbursementView[]>([]);
  const [schemes, setSchemes] = useState<SchemeView[]>([]);
  const [anchors, setAnchors] = useState<AnchorView[]>([]);
  const [flags, setFlags] = useState<FlagView[]>([]);
  const [grievances, setGrievances] = useState<GrievanceView[]>([]);
  const [frozen, setFrozen] = useState<FrozenAsset[]>([]);
  const [trail, setTrail] = useState<TrailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const fundFlow = getFundFlow();
      const registry = getSchemeRegistry();
      const anchor = getAnchor();

      // If contracts not configured, use seeded fallback data
      if (!fundFlow || !registry) {
        if (!cancelled) {
          setStats(SEEDED_STATS);
          setSchemes(SEEDED_SCHEMES);
          setDisbursements(SEEDED_DISBURSEMENTS);
          setAnchors(SEEDED_ANCHORS);
          setFlags(SEEDED_FLAGS);
          setGrievances(SEEDED_GRIEVANCES);
          setFrozen(SEEDED_FROZEN);
          setTrail(SEEDED_TRAIL);
          setConnected(false);
          setLoading(false);
        }
        return;
      }

      try {
        // ── Fetch schemes ──────────────────────────────────
        const schemeIds: string[] = await registry.getAllSchemeIds();
        const schemeCount = schemeIds.length;
        let totalBudget = BigInt(0);

        const schemeViews: SchemeView[] = [];
        for (const sid of schemeIds) {
          const s = await registry.getScheme(sid);
          totalBudget += s.sanctionedBudget;
          const pct = Number(s.sanctionedBudget) > 0
            ? Math.round((Number(s.disbursed) / Number(s.sanctionedBudget)) * 100)
            : 0;
          schemeViews.push({
            name: s.name,
            ministry: s.ministry,
            budget: formatPaisa(s.sanctionedBudget),
            beneficiaries: s.beneficiaryCount.toString(),
            disbursed: `${pct}%`,
            disbursedPct: pct,
          });
        }

        // ── Fetch disbursements (latest 20) ────────────────
        const totalDisb = Number(await fundFlow.totalDisbursementCount());
        const totalFlagged = Number(await fundFlow.totalFlaggedCount());
        const offset = Math.max(0, totalDisb - 20);
        const ids: string[] = await fundFlow.getDisbursementIdsPaginated(offset, 20);

        const disbViews: DisbursementView[] = [];
        for (const did of ids.reverse()) {
          const d = await fundFlow.getDisbursement(did);
          const stageNum = Number(d.stage);
          let status: DisbursementView["status"] = "active";
          if (stageNum === 8) status = "flagged";
          else if (stageNum === 9) status = "frozen";

          disbViews.push({
            id: shortenHash(did),
            scheme: schemeViews.find((_s, i) => schemeIds[i] && d.schemeId === schemeIds[i])?.name || shortenHash(d.schemeId),
            stage: formatStage(stageNum),
            amount: formatPaisa(d.amount),
            recipient: shortenHash(d.toPseudonymDid),
            time: timeAgo(d.timestamp),
            status,
            gst: d.gstValid,
            bank: d.bankUnique,
            geo: d.geotagVerified,
          });
        }

        // ── Fetch anchor status ────────────────────────────
        const anchorViews: AnchorView[] = [];
        if (anchor) {
          try {
            const count = Number(await anchor.checkpointCount());
            if (count > 0) {
              const latest = await anchor.getLatestCheckpoint();
              const polyHash = await anchor.polygonAnchors(latest.sequenceNumber);
              const sepHash = await anchor.sepoliaAnchors(latest.sequenceNumber);

              anchorViews.push({
                chain: "Polygon Amoy",
                root: shortenHash(latest.merkleRoot),
                seq: Number(latest.sequenceNumber),
                time: timeAgo(latest.timestamp),
                status: polyHash !== "0x" + "0".repeat(64) ? "confirmed" : "pending",
              });
              anchorViews.push({
                chain: "Ethereum Sepolia",
                root: shortenHash(latest.merkleRoot),
                seq: Math.floor(Number(latest.sequenceNumber) / 10),
                time: timeAgo(latest.timestamp),
                status: sepHash !== "0x" + "0".repeat(64) ? "confirmed" : "pending",
              });
            }
          } catch { /* anchor not deployed yet */ }
        }

        if (!cancelled) {
          setStats({
            totalSanctioned: formatPaisa(totalBudget),
            activeSchemes: schemeCount,
            disbursementCount: totalDisb,
            flaggedCount: totalFlagged,
          });
          setDisbursements(disbViews);
          setSchemes(schemeViews);
          setAnchors(anchorViews.length > 0 ? anchorViews : SEEDED_ANCHORS);
          setFlags(SEEDED_FLAGS); // Flags come from zkML, always seeded for demo
          setGrievances(SEEDED_GRIEVANCES); // Grievances seeded for demo
          setFrozen(SEEDED_FROZEN); // Frozen assets seeded for demo
          setTrail(SEEDED_TRAIL); // Trace trail seeded for demo
          setConnected(true);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[useChainData] Failed to fetch on-chain data, using seeded fallback:", err);
        if (!cancelled) {
          setStats(SEEDED_STATS);
          setSchemes(SEEDED_SCHEMES);
          setDisbursements(SEEDED_DISBURSEMENTS);
          setAnchors(SEEDED_ANCHORS);
          setFlags(SEEDED_FLAGS);
          setGrievances(SEEDED_GRIEVANCES);
          setFrozen(SEEDED_FROZEN);
          setTrail(SEEDED_TRAIL);
          setConnected(false);
          setLoading(false);
        }
      }
    }

    fetchData();
    // Refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { stats, disbursements, schemes, anchors, flags, grievances, frozen, trail, loading, connected };
}
