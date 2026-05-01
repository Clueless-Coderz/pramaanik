"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  FileText,
  AlertTriangle,
  Activity,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Anchor,
  Search,
  Snowflake,
  ExternalLink,
} from "lucide-react";
import { useChainData, type FlagView } from "../lib/useChainData";

// ─── Types ────────────────────────────────────────────────────────────────────

type DisbursementStatus = "active" | "flagged" | "frozen" | "pending";

interface Disbursement {
  id: string;
  scheme: string;
  stage: string;
  amount: string;
  recipient: string;
  time: string;
  status: DisbursementStatus;
  gst: boolean;
  bank: boolean;
  geo: boolean;
}

interface AnomalyAlert {
  id: string;
  type: string;
  scheme: string;
  /** Risk expressed as integer 0–10000 (basis points). e.g. 9800 = 98% */
  risk: number;
  proof: string;
  explanation: string;
  time: string;
}

interface AnchorEntry {
  chain: string;
  root: string;
  seq: number;
  time: string;
  status: string;
}

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ───────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<DisbursementStatus, string> = {
  active: "badge-active",
  flagged: "badge-flagged",
  frozen: "badge-frozen",
  pending: "badge-pending",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASSES[status as DisbursementStatus] ?? "badge-pending";
  return <span className={`badge ${cls}`}>{status}</span>;
}

const ORACLE_LABELS = ["GST", "Bank", "Geo"] as const;

function OracleChecks({
  gst,
  bank,
  geo,
}: {
  gst: boolean;
  bank: boolean;
  geo: boolean;
}) {
  const checks = [gst, bank, geo];
  return (
    <div className="flex items-center gap-1" role="list" aria-label="Oracle checks">
      {ORACLE_LABELS.map((label, i) => (
        <span
          key={label}
          role="listitem"
          title={`${label}: ${checks[i] ? "Passed" : "Failed"}`}
          aria-label={`${label} ${checks[i] ? "passed" : "failed"}`}
        >
          {checks[i] ? (
            <CheckCircle2
              className="w-4 h-4"
              style={{ color: "var(--accent-success)" }}
            />
          ) : (
            <XCircle
              className="w-4 h-4"
              style={{ color: "var(--accent-danger)" }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** Risk score bar: pct derived from basis-point value (0–10000). */
function RiskBar({ risk }: { risk: number }) {
  const pct = risk / 100; // 0–100
  const color =
    pct >= 90
      ? "var(--accent-danger)"
      : pct >= 70
        ? "var(--accent-warning)"
        : "var(--accent-success)";
  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold shrink-0"
        style={{ color }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function AnomalyCard({
  alert,
  onInvestigate,
  onFreeze,
}: {
  alert: AnomalyAlert;
  onInvestigate: (id: string) => void;
  onFreeze: (id: string) => void;
}) {
  return (
    <div
      className="p-4 rounded-lg border transition-all hover:border-red-500/30"
      style={{
        background: "rgba(239,68,68,0.04)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-start justify-between mb-1 gap-2">
        <span
          className="text-xs font-bold leading-tight"
          style={{ color: "var(--accent-danger)" }}
        >
          {alert.type}
        </span>
        <span
          className="text-xs font-mono shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          {alert.id}
        </span>
      </div>

      <p
        className="text-xs leading-relaxed mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {alert.explanation}
      </p>

      <RiskBar risk={alert.risk} />

      <div
        className="flex items-center justify-between mt-3 pt-3 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span
          className="text-xs font-mono truncate max-w-[8rem]"
          style={{ color: "var(--text-muted)" }}
          title={`Proof: ${alert.proof}`}
        >
          Proof: {alert.proof}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onInvestigate(alert.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "var(--accent-primary)",
            }}
            title="Open investigation view"
          >
            <Search className="w-3 h-3" /> Investigate
          </button>
          <button
            onClick={() => onFreeze(alert.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "var(--accent-danger)",
            }}
            title="Freeze linked transactions"
          >
            <Snowflake className="w-3 h-3" /> Freeze
          </button>
        </div>
      </div>

      <div className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {alert.time} · {alert.scheme}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const {
    stats: chainStats,
    disbursements: chainDisb,
    anchors: chainAnchors,
    flags: chainFlags,
    connected,
  } = useChainData();

  const [dismissedFlags, setDismissedFlags] = useState<Set<string>>(new Set());

  // ── Live data (always available — seeded fallback when chain is offline)
  const liveStats = chainStats
    ? [
      {
        label: "Total Sanctioned",
        value: chainStats.totalSanctioned,
        change: connected ? "live" : "seeded",
        icon: IndianRupee,
        color: "var(--accent-primary)",
        trend: "up",
      },
      {
        label: "Active Schemes",
        value: String(chainStats.activeSchemes),
        change: connected ? "on-chain" : "seeded",
        icon: FileText,
        color: "var(--accent-secondary)",
        trend: "up",
      },
      {
        label: "Disbursements",
        value: chainStats.disbursementCount.toLocaleString(),
        change: connected ? "live count" : "seeded",
        icon: Activity,
        color: "var(--accent-success)",
        trend: "up",
      },
      {
        label: "Anomaly Flags",
        value: String(chainStats.flaggedCount),
        change: "detected",
        icon: AlertTriangle,
        color: "var(--accent-danger)",
        trend: "down",
      },
    ]
    : [];

  const liveDisb: Disbursement[] =
    chainDisb.map((d) => ({ ...d, status: d.status as DisbursementStatus }));

  const liveAnchors: AnchorEntry[] = chainAnchors;

  const visibleFlags: FlagView[] = chainFlags.filter(
    (a) => !dismissedFlags.has(a.id)
  );

  function handleInvestigate(id: string) {
    // TODO: navigate to /admin/flags/{id}
    alert(`Demo: opening investigation for ${id}`);
  }

  function handleFreeze(id: string) {
    // TODO: call freezeTransaction() on-chain
    if (confirm(`Freeze all transactions linked to ${id}?`)) {
      setDismissedFlags((prev) => new Set(prev).add(id));
    }
  }

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Real-time fund flow monitoring ·{" "}
            <span
              style={{
                color: connected
                  ? "var(--accent-success)"
                  : "var(--accent-warning)",
              }}
            >
              {connected ? "Live on-chain data" : "Demo mode — mock data"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <div
              className="glow-dot"
              style={
                connected ? {} : { background: "var(--accent-warning)" }
              }
            />
            {connected ? "Besu QBFT Connected" : "Chain Offline"}
          </div>
          <button className="btn-primary text-sm">+ New Disbursement</button>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {liveStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label">{s.label}</span>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div
              className="flex items-center gap-1 text-xs mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              <TrendingUp
                className="w-3 h-3"
                style={{
                  color:
                    s.trend === "up"
                      ? "var(--accent-success)"
                      : "var(--accent-danger)",
                  transform:
                    s.trend === "down" ? "scaleY(-1)" : undefined,
                }}
              />
              {s.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Disbursements + Anomaly Alerts ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Disbursements table (2/3) */}
        <div className="lg:col-span-2 glass-card p-0 overflow-hidden">
          <div
            className="flex items-center justify-between p-5 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Activity
                className="w-4 h-4"
                style={{ color: "var(--accent-secondary)" }}
              />
              Recent Disbursements
            </h2>
            <div className="flex items-center gap-3">
              {/* Oracle legend */}
              <div
                className="hidden sm:flex items-center gap-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span>Oracle:</span>
                <span className="font-mono">GST · Bank · Geo</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Live feed
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Scheme</th>
                  <th>Stage</th>
                  <th>Amount</th>
                  <th title="GST · Bank · Geo oracle checks">Oracle</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {liveDisb.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span
                        className="mono text-xs"
                        title={d.id}
                        style={{ color: "var(--text-muted)" }}
                      >
                        {d.id}
                      </span>
                    </td>
                    <td className="text-sm">{d.scheme}</td>
                    <td>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(99,102,241,0.08)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {d.stage}
                      </span>
                    </td>
                    <td className="font-semibold">{d.amount}</td>
                    <td>
                      <OracleChecks gst={d.gst} bank={d.bank} geo={d.geo} />
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {d.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Anomaly Alerts (1/3) */}
        <div className="glass-card p-0 overflow-hidden">
          <div
            className="flex items-center justify-between p-5 border-b"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <h2 className="font-bold text-sm flex items-center gap-2">
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "var(--accent-danger)" }}
              />
              Anomaly Alerts
            </h2>
            <span className="badge badge-flagged text-xs">
              {visibleFlags.length} active
            </span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[480px]">
            {visibleFlags.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 py-8 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                <CheckCircle2
                  className="w-8 h-8 opacity-30"
                  style={{ color: "var(--accent-success)" }}
                />
                <p className="text-xs">All flags resolved</p>
              </div>
            ) : (
              visibleFlags.map((a) => (
                <AnomalyCard
                  key={a.id}
                  alert={a}
                  onInvestigate={handleInvestigate}
                  onFreeze={handleFreeze}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Anchor Status ─────────────────────────────────────────────── */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Anchor
            className="w-4 h-4"
            style={{ color: "var(--accent-primary)" }}
          />
          Dual Public Anchor Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveAnchors.map((a) => (
            <div
              key={a.chain}
              className="p-4 rounded-lg border flex items-center justify-between gap-4"
              style={{
                borderColor: "var(--border-subtle)",
                background: "rgba(99,102,241,0.04)",
              }}
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm mb-1">{a.chain}</div>
                <div
                  className="text-xs font-mono truncate"
                  style={{ color: "var(--text-muted)" }}
                  title={`Root: ${a.root} · Seq #${a.seq}`}
                >
                  Root: {a.root} · Seq #{a.seq}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="badge badge-active">{a.status}</span>
                  <a
                    href="#"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="View on explorer"
                    aria-label={`View ${a.chain} anchor on explorer`}
                  >
                    <ExternalLink
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </a>
                </div>
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