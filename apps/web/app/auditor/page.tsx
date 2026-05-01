"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ShieldCheck,
  Lock,
  Activity,
  TrendingUp,
  FileSearch,
} from "lucide-react";
import { useChainData } from "../lib/useChainData";

export default function AuditorDashboard() {
  const { flags, frozen, trail, stats, connected } = useChainData();

  const STATS = [
    {
      label: "Active Flags",
      value: flags.length,
      icon: AlertTriangle,
      color: "var(--accent-danger)",
      bg: "rgba(239,68,68,0.08)",
    },
    {
      label: "Frozen Assets",
      value: frozen.length,
      icon: Lock,
      color: "var(--accent-warning)",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Audit Events",
      value: trail.length,
      icon: FileSearch,
      color: "var(--accent-secondary)",
      bg: "rgba(6,182,212,0.08)",
    },
    {
      label: "Proofs Verified",
      value: flags.filter((f) => f.proofVerified).length,
      icon: ShieldCheck,
      color: "var(--accent-success)",
      bg: "rgba(16,185,129,0.08)",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Auditor Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Real-time anomaly monitoring · zkML-attested fraud detection
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: connected
              ? "rgba(16,185,129,0.06)"
              : "rgba(245,158,11,0.06)",
            border: `1px solid ${
              connected
                ? "rgba(16,185,129,0.2)"
                : "rgba(245,158,11,0.2)"
            }`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full status-pulse"
            style={{
              background: connected ? "#10B981" : "#F59E0B",
            }}
          />
          <span
            className="text-[11px] font-semibold"
            style={{
              color: connected ? "#10B981" : "#F59E0B",
            }}
          >
            {connected ? "Chain connected" : "Seeded fallback active"}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="stat-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent flags */}
      <div
        className="glass-card p-0 overflow-hidden mb-6"
      >
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2 className="font-bold text-sm flex items-center gap-2">
            <AlertTriangle
              className="w-4 h-4"
              style={{ color: "var(--accent-danger)" }}
            />
            Recent Anomaly Flags
          </h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {flags.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Scheme</th>
                <th>Risk</th>
                <th>Amount</th>
                <th>Proof</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className="font-mono text-xs" style={{ color: "var(--accent-danger)" }}>
                      {f.id}
                    </span>
                  </td>
                  <td className="text-sm font-semibold">{f.type}</td>
                  <td className="text-sm">{f.scheme}</td>
                  <td>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          f.severity === "critical"
                            ? "rgba(239,68,68,0.12)"
                            : f.severity === "high"
                            ? "rgba(245,158,11,0.12)"
                            : "rgba(129,140,248,0.12)",
                        color:
                          f.severity === "critical"
                            ? "#EF4444"
                            : f.severity === "high"
                            ? "#F59E0B"
                            : "#818CF8",
                      }}
                    >
                      {Math.round(f.risk / 100)}%
                    </span>
                  </td>
                  <td className="font-semibold text-sm">{f.amount}</td>
                  <td>
                    {f.proofVerified ? (
                      <ShieldCheck
                        className="w-4 h-4"
                        style={{ color: "var(--accent-success)" }}
                      />
                    ) : (
                      <Activity
                        className="w-4 h-4"
                        style={{ color: "var(--accent-warning)" }}
                      />
                    )}
                  </td>
                  <td className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {f.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent audit trail */}
      <div className="glass-card p-0 overflow-hidden">
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2 className="font-bold text-sm flex items-center gap-2">
            <FileSearch
              className="w-4 h-4"
              style={{ color: "var(--accent-secondary)" }}
            />
            Latest Audit Trail Events
          </h2>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {trail.length} events
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {trail.slice(0, 5).map((ev) => (
            <div key={ev.seq} className="p-4 flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: ev.verified
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(245,158,11,0.12)",
                }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: ev.verified ? "#10B981" : "#F59E0B",
                  }}
                >
                  #{ev.seq}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-0.5">{ev.title}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {ev.actor} · {ev.when}
                </div>
              </div>
              <span
                className="font-mono text-[10px] shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                {ev.txId}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}