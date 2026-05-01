"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  Lock,
  FileSearch,
  CheckCircle2,
  XCircle,
  Microscope,
  Brain,
  Fingerprint,
  MapPin,
} from "lucide-react";

const stats = [
  {
    label: "Active Flags",
    value: "23",
    subtitle: "3 critical / 8 high",
    icon: AlertTriangle,
    color: "var(--accent-danger)",
  },
  {
    label: "Proofs Verified",
    value: "847",
    subtitle: "100% pass rate",
    icon: ShieldCheck,
    color: "var(--accent-success)",
  },
  {
    label: "Frozen Disbursements",
    value: "7",
    subtitle: "₹3.2 Cr held",
    icon: Lock,
    color: "var(--accent-primary)",
  },
  {
    label: "Audit Reports Filed",
    value: "12",
    subtitle: "This quarter",
    icon: FileSearch,
    color: "var(--accent-secondary)",
  },
];

const flaggedTransactions = [
  {
    id: "FLAG-003",
    type: "Deceased Beneficiary",
    scheme: "Ayushman Bharat",
    risk: 9800,
    disbursementId: "0x4b3c...d2e5",
    amount: "₹2,50,000",
    explanation: "Multi-source oracle: Aadhaar status = INACTIVE, death registry match confirmed. Payment to already-deceased patient mirroring CAG-documented PMJAY pattern.",
    proofHash: "0x4b3c...d2e5",
    proofVerified: true,
    modelVersion: "RGCN v2.3",
    motif: "Deceased-beneficiary subgraph: Treasury → Agency → Hospital → [DECEASED_DID]",
    time: "1h ago",
  },
  {
    id: "FLAG-002",
    type: "Bank Account Reuse",
    scheme: "PMKVY 3.0",
    risk: 9200,
    disbursementId: "0x1a9e...b7f4",
    amount: "₹3,45,000",
    explanation: "Account ACC_11111111 linked to 23 distinct beneficiary DIDs. Exact replication of PMKVY CAG Report No. 20/2025 pattern: 12,122 accounts shared across 52,381 participants.",
    proofHash: "0x1a9e...b7f4",
    proofVerified: true,
    modelVersion: "RGCN v2.3",
    motif: "Star-topology subgraph: 23 DIDs → 1 Bank Account (fan-in anomaly)",
    time: "42 min ago",
  },
  {
    id: "FLAG-001",
    type: "Split Contract Pattern",
    scheme: "MGNREGA Dahod",
    risk: 8500,
    disbursementId: "0x7c2f...a3d1",
    amount: "₹24,90,000",
    explanation: "5 transactions of ₹4.98L to same vendor within 24h. All just below ₹5L approval threshold. Matches Gujarat Dahod FIR pattern exactly.",
    proofHash: "0x7c2f...a3d1",
    proofVerified: true,
    modelVersion: "RGCN v2.3",
    motif: "Temporal burst: Agency → Vendor (×5 in 24h, amount clustering at ₹4.98L)",
    time: "8 min ago",
  },
];

function RiskBar({ risk }: { risk: number }) {
  const pct = risk / 100;
  const color = pct >= 90 ? "var(--accent-danger)" : pct >= 70 ? "var(--accent-warning)" : "var(--accent-success)";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold mono" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export default function AuditorDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Auditor Investigation Console</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            CAG / Parliamentary audit dashboard · All proofs cryptographically verified
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="glow-dot" /> Model: RGCN v2.3 · EZKL Halo2 Active
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label">{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {s.subtitle}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Flagged Transaction Deep-Dive Cards */}
      <h2 className="font-bold text-sm flex items-center gap-2 mb-4" style={{ color: "var(--text-secondary)" }}>
        <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent-danger)" }} />
        Flagged Transactions — Investigation Queue
      </h2>

      <div className="space-y-6">
        {flaggedTransactions.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="glass-card p-0 overflow-hidden"
          >
            {/* Card Header */}
            <div
              className="p-5 flex items-center justify-between border-b"
              style={{ borderColor: "var(--border-subtle)", background: "rgba(239,68,68,0.03)" }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="glow-dot-danger" />
                </div>
                <div>
                  <span className="badge badge-flagged mr-2">{f.type}</span>
                  <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                    {f.id}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn-danger text-xs">
                  <Lock className="w-3 h-3" /> Freeze Disbursement
                </button>
                <button className="btn-secondary text-xs">
                  <FileSearch className="w-3 h-3" /> Full Audit Trail
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Details */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    GNN Explanation (PANG Motif)
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.explanation}
                  </p>
                </div>

                <div className="p-3 rounded-lg" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid var(--border-subtle)" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--accent-primary)" }}>
                    Subgraph Motif
                  </div>
                  <pre className="text-xs mono" style={{ color: "var(--text-secondary)" }}>
                    {f.motif}
                  </pre>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Risk Score
                </div>
                <RiskBar risk={f.risk} />
              </div>

              {/* Right: Proof Verification */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border-subtle)", background: "rgba(16,185,129,0.04)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--accent-success)" }}>
                    <Microscope className="w-3 h-3" />
                    zk-SNARK Proof Status
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {f.proofVerified ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" style={{ color: "var(--accent-success)" }} />
                        <span className="text-sm font-bold" style={{ color: "var(--accent-success)" }}>
                          Verified On-Chain
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" style={{ color: "var(--accent-danger)" }} />
                        <span className="text-sm font-bold" style={{ color: "var(--accent-danger)" }}>
                          Verification Failed
                        </span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <div className="flex justify-between">
                      <span>Proof Hash:</span>
                      <span className="mono">{f.proofHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span>{f.modelVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scheme:</span>
                      <span>{f.scheme}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-bold">{f.amount}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  {f.time}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
