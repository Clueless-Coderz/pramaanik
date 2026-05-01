"use client";

import { motion } from "framer-motion";
import {
  IndianRupee,
  FileText,
  AlertTriangle,
  Shield,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Anchor,
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────
const stats = [
  {
    label: "Total Sanctioned",
    value: "₹247.3 Cr",
    change: "+12.4%",
    icon: IndianRupee,
    color: "var(--accent-primary)",
  },
  {
    label: "Active Schemes",
    value: "14",
    change: "+2 this quarter",
    icon: FileText,
    color: "var(--accent-secondary)",
  },
  {
    label: "Disbursements",
    value: "12,847",
    change: "432 today",
    icon: Activity,
    color: "var(--accent-success)",
  },
  {
    label: "Anomaly Flags",
    value: "23",
    change: "3 critical",
    icon: AlertTriangle,
    color: "var(--accent-danger)",
  },
];

const recentDisbursements = [
  {
    id: "0x3a7f...c291",
    scheme: "PM-KISAN FY2026",
    stage: "ReleasedToBeneficiary",
    amount: "₹6,000",
    recipient: "did:polygonid:0x8f2...a1d",
    time: "2 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0xb12e...f843",
    scheme: "MGNREGA Dahod",
    stage: "ReleasedToVendor",
    amount: "₹4,98,000",
    recipient: "did:polygonid:0x1c9...e3f",
    time: "8 min ago",
    status: "flagged",
    gst: true,
    bank: false,
    geo: false,
  },
  {
    id: "0x91dc...2a17",
    scheme: "PMKVY 3.0",
    stage: "Sanctioned",
    amount: "₹15,000",
    recipient: "did:polygonid:0x4d2...b7c",
    time: "15 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
  {
    id: "0x5ef0...d6b2",
    scheme: "Ayushman Bharat",
    stage: "ReleasedToAgency",
    amount: "₹2,50,000",
    recipient: "did:polygonid:0x7a3...f2e",
    time: "23 min ago",
    status: "frozen",
    gst: false,
    bank: true,
    geo: true,
  },
  {
    id: "0xc8a3...e109",
    scheme: "PM-KISAN FY2026",
    stage: "WorkCompleted",
    amount: "₹6,000",
    recipient: "did:polygonid:0x9b1...c4a",
    time: "31 min ago",
    status: "active",
    gst: true,
    bank: true,
    geo: true,
  },
];

const anomalyAlerts = [
  {
    id: "FLAG-001",
    type: "Split Contract Pattern",
    scheme: "MGNREGA Dahod",
    risk: 8500,
    proof: "0x7c2f...a3d1",
    explanation: "5 transactions of ₹4.98L to same vendor within 24h — threshold avoidance motif",
    time: "8 min ago",
  },
  {
    id: "FLAG-002",
    type: "Bank Account Reuse",
    scheme: "PMKVY 3.0",
    risk: 9200,
    proof: "0x1a9e...b7f4",
    explanation: "Account ACC_11111111 linked to 23 distinct beneficiary DIDs — PMKVY-pattern duplicate",
    time: "42 min ago",
  },
  {
    id: "FLAG-003",
    type: "Deceased Beneficiary",
    scheme: "Ayushman Bharat",
    risk: 9800,
    proof: "0x4b3c...d2e5",
    explanation: "Multi-source oracle: Aadhaar status = INACTIVE, death registry match confirmed",
    time: "1h ago",
  },
];

const anchorStatus = [
  { chain: "Polygon Amoy", root: "0x8f2a...c3d1", seq: 847, time: "3 min ago", status: "confirmed" },
  { chain: "Ethereum Sepolia", root: "0x8f2a...c3d1", seq: 84, time: "2h ago", status: "confirmed" },
];

function StatusBadge({ status }: { status: string }) {
  const cls = status === "active" ? "badge-active" : status === "flagged" ? "badge-flagged" : status === "frozen" ? "badge-frozen" : "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function OracleCheck({ passed }: { passed: boolean }) {
  return passed ? (
    <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
  ) : (
    <XCircle className="w-4 h-4" style={{ color: "var(--accent-danger)" }} />
  );
}

export default function AdminDashboard() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Real-time fund flow monitoring · Last updated: just now
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <div className="glow-dot" /> Besu QBFT Connected
          </div>
          <button className="btn-primary text-sm">
            + New Disbursement
          </button>
        </div>
      </div>

      {/* Stat Cards */}
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
              {s.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two-column: Recent Disbursements + Anomaly Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Disbursements (2/3 width) */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
              Recent Disbursements
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Live feed
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Scheme</th>
                  <th>Stage</th>
                  <th>Amount</th>
                  <th>Oracle</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentDisbursements.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td>{d.scheme}</td>
                    <td className="text-xs">{d.stage}</td>
                    <td className="font-semibold">{d.amount}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <OracleCheck passed={d.gst} />
                        <OracleCheck passed={d.bank} />
                        <OracleCheck passed={d.geo} />
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {d.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anomaly Alerts (1/3 width) */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent-danger)" }} />
              Anomaly Alerts
            </h2>
            <span className="badge badge-flagged text-xs">{anomalyAlerts.length} active</span>
          </div>
          <div className="p-4 space-y-4">
            {anomalyAlerts.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-lg border transition-all hover:border-red-500/30"
                style={{
                  background: "rgba(239,68,68,0.04)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: "var(--accent-danger)" }}>
                    {a.type}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    Risk: {(a.risk / 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                  {a.explanation}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                    Proof: {a.proof}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {a.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anchor Status */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Anchor className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          Dual Public Anchor Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {anchorStatus.map((a) => (
            <div
              key={a.chain}
              className="p-4 rounded-lg border flex items-center justify-between"
              style={{ borderColor: "var(--border-subtle)", background: "rgba(99,102,241,0.04)" }}
            >
              <div>
                <div className="font-semibold text-sm mb-1">{a.chain}</div>
                <div className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                  Root: {a.root} · Seq #{a.seq}
                </div>
              </div>
              <div className="text-right">
                <div className="badge badge-active mb-1">{a.status}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {a.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
