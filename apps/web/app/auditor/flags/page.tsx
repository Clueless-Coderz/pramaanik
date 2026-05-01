"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useChainData, type FlagView } from "../../lib/useChainData";

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium";
type SortKey = "risk" | "time" | "amount";

interface Flag {
  id: string;
  type: string;
  scheme: string;
  /** Basis points 0–10000 */
  risk: number;
  severity: Severity;
  /** Raw integer in rupees for sorting */
  amountRaw: number;
  amount: string;
  txId: string;
  proofVerified: boolean;
  /** Epoch ms for sorting */
  timeMs: number;
  time: string;
}

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--accent-danger)",
  high: "var(--accent-warning)",
  medium: "var(--accent-secondary)",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "rgba(239,68,68,0.06)",
  high: "rgba(245,158,11,0.06)",
  medium: "rgba(99,102,241,0.06)",
};

const ROW_CLASS: Record<Severity, string> = {
  critical: "risk-row-critical",
  high: "risk-row-high",
  medium: "risk-row-medium",
};

function RiskBar({ risk, severity }: { risk: number; severity: Severity }) {
  const pct = risk / 100;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: SEVERITY_COLOR[severity],
          }}
        />
      </div>
      <span
        className="font-mono font-semibold text-xs tabular-nums shrink-0"
        style={{ color: SEVERITY_COLOR[severity] }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
      style={{
        background: SEVERITY_BG[severity],
        color: SEVERITY_COLOR[severity],
        border: `1px solid ${SEVERITY_COLOR[severity]}33`,
      }}
    >
      {severity === "critical" && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: SEVERITY_COLOR[severity] }} />}
      {severity}
    </span>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ flags }: { flags: Flag[] }) {
  const critical = flags.filter((f) => f.severity === "critical").length;
  const high = flags.filter((f) => f.severity === "high").length;
  const medium = flags.filter((f) => f.severity === "medium").length;
  const totalValue = flags.reduce((s, f) => s + f.amountRaw, 0);

  const items = [
    { label: "Critical", count: critical, color: "var(--accent-danger)" },
    { label: "High", count: high, color: "var(--accent-warning)" },
    { label: "Medium", count: medium, color: "var(--accent-secondary)" },
  ];

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-xl"
      style={{ background: "rgba(99,102,241,0.04)", border: "1px solid var(--border-subtle)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: item.color }}
          />
          <div>
            <div className="font-bold text-base" style={{ color: item.color }}>
              {item.count}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
        <div>
          <div className="font-bold text-base">
            ₹{(totalValue / 100000).toFixed(1)}L
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            At risk
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
      style={{
        background: active ? "rgba(99,102,241,0.15)" : "transparent",
        color: active ? "var(--accent-primary)" : "var(--text-muted)",
        border: active ? "1px solid var(--border-glow)" : "1px solid transparent",
      }}
    >
      <ArrowUpDown className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SEVERITY_TABS: { label: string; value: "all" | Severity }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
];

export default function AuditorFlagsPage() {
  const { flags: FLAGS } = useChainData();
  const [filter, setFilter] = useState<"all" | Severity>("all");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDesc, setSortDesc] = useState(true);

  const visible = useMemo(() => {
    const base: FlagView[] =
      filter === "all" ? FLAGS : FLAGS.filter((f) => f.severity === filter);
    return [...base].sort((a, b) => {
      let diff = 0;
      if (sortKey === "risk") diff = a.risk - b.risk;
      else if (sortKey === "amount") diff = a.amountRaw - b.amountRaw;
      else if (sortKey === "time") diff = a.timeMs - b.timeMs;
      return sortDesc ? -diff : diff;
    });
  }, [filter, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  function handleExport() {
    const rows = [
      ["Flag", "Type", "Scheme", "Amount", "TX", "Risk %", "Proof", "Time"],
      ...visible.map((f) => [
        f.id, f.type, f.scheme, f.amount, f.txId,
        `${(f.risk / 100).toFixed(0)}%`,
        f.proofVerified ? "Verified" : "Pending",
        f.time,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pramaanik-audit-pack.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Flagged Transactions</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            zkML-detected anomalies · Each flag ships with a verifiable
            zk-SNARK proof
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm shrink-0">
          <Download className="w-4 h-4" /> Export Audit Pack
        </button>
      </div>

      {/* ── Summary ───────────────────────────────────────────────────── */}
      <SummaryBar flags={FLAGS} />

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Filter tabs */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}
          role="tablist"
          aria-label="Filter by severity"
        >
          {SEVERITY_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={filter === tab.value}
              onClick={() => setFilter(tab.value)}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: filter === tab.value ? "var(--text-primary)" : "var(--text-muted)",
                background: filter === tab.value ? "rgba(99,102,241,0.15)" : "transparent",
              }}
            >
              {tab.label}
              {tab.value !== "all" && (
                <span
                  className="ml-1.5 font-mono"
                  style={{ color: filter === tab.value ? SEVERITY_COLOR[tab.value] : "var(--text-muted)" }}
                >
                  {FLAGS.filter((f) => f.severity === tab.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="mr-1">Sort:</span>
          <SortButton label="Risk" active={sortKey === "risk"} onClick={() => toggleSort("risk")} />
          <SortButton label="Amount" active={sortKey === "amount"} onClick={() => toggleSort("amount")} />
          <SortButton label="Time" active={sortKey === "time"} onClick={() => toggleSort("time")} />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Showing <span style={{ color: "var(--text-primary)" }}>{visible.length}</span> of {FLAGS.length} flags
      </p>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" aria-label="Flagged transactions">
            <thead>
              <tr>
                <th>Flag ID</th>
                <th>Severity</th>
                <th>Type</th>
                <th>Scheme</th>
                <th>Amount</th>
                <th>TX</th>
                <th>Risk</th>
                <th>Proof</th>
                <th>Time</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {visible.map((f, i) => (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i * 0.03 }}
                    className={ROW_CLASS[f.severity]}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: SEVERITY_COLOR[f.severity] }}
                        />
                        <span
                          className="font-mono font-semibold text-xs"
                          style={{ color: SEVERITY_COLOR[f.severity] }}
                        >
                          {f.id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <SeverityPill severity={f.severity} />
                    </td>
                    <td className="font-semibold text-xs max-w-[140px]">
                      {f.type}
                    </td>
                    <td className="text-xs">{f.scheme}</td>
                    <td className="font-semibold mono text-xs">{f.amount}</td>
                    <td>
                      <span
                        className="mono text-xs"
                        title={f.txId}
                        style={{ color: "var(--text-muted)" }}
                      >
                        {f.txId}
                      </span>
                    </td>
                    <td>
                      <RiskBar risk={f.risk} severity={f.severity} />
                    </td>
                    <td>
                      {f.proofVerified ? (
                        <span
                          className="flex items-center gap-1 text-xs font-medium"
                          style={{ color: "var(--accent-success)" }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--accent-warning)" }}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td
                      className="text-xs tabular-nums"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {f.time}
                    </td>
                    <td>
                      <Link
                        href={`/auditor/proofs?flag=${f.id}`}
                        className="text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-opacity hover:opacity-70"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        Investigate
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <div
            className="flex flex-col items-center gap-2 py-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <ShieldCheck className="w-10 h-10 opacity-25" style={{ color: "var(--accent-success)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              No flags at this severity level
            </p>
          </div>
        )}
      </div>
    </div>
  );
}