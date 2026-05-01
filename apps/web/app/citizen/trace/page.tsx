"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSearch,
  Network,
  Download,
  Search,
  ArrowRight,
  Clock,
  ShieldCheck,
  X,
} from "lucide-react";

import { useChainData, type TrailEvent } from "../../lib/useChainData";

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ────────────────


function RawEventPanel({ event }: { event: TrailEvent }) {
  return (
    <motion.pre
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-3 mono-pill text-[11px] overflow-auto"
      style={{ padding: 12, maxHeight: 220 }}
    >
      {JSON.stringify(
        {
          event: event.title,
          seq: event.seq,
          actor: event.actorId,
          txHash: event.txId,
          blockTime: event.when,
          verified: event.verified,
          anchorRoot: "0x7f4c5e...2b9d1a4c",
        },
        null,
        2
      )}
    </motion.pre>
  );
}

function TrailItem({
  event,
  isFirst,
  index,
}: {
  event: TrailEvent;
  isFirst: boolean;
  index: number;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`timeline-item ${isFirst ? "latest" : ""}`}
    >
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            SEQ #{event.seq.toString().padStart(3, "0")}
          </span>
          <span
            className="font-semibold text-sm"
            style={isFirst ? { color: "var(--accent-primary)" } : undefined}
          >
            {event.title}
          </span>
          {event.verified && (
            <ShieldCheck
              className="w-3.5 h-3.5"
              style={{ color: "var(--accent-success)" }}
              aria-label="Verified"
            />
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {event.when}
        </span>
      </div>

      <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
        {event.description}
      </p>

      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--text-muted)" }}
        >
          <span>by</span>
          <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
            {event.actor}
          </span>
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
          <span
            className="mono-pill"
            style={{ padding: "3px 7px", fontSize: 10 }}
          >
            {event.txId.slice(0, 18)}…
          </span>
        </div>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: "var(--accent-primary)" }}
          aria-expanded={showRaw}
        >
          {showRaw ? (
            <>
              <X className="w-3 h-3" /> Hide raw
            </>
          ) : (
            "View raw event"
          )}
        </button>
      </div>

      <AnimatePresence>
        {showRaw && <RawEventPanel event={event} />}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuditTrailPage() {
  const { trail: TRAIL } = useChainData();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    if (!query.trim()) return TRAIL;
    const q = query.toLowerCase();
    return TRAIL.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.txId.includes(q) ||
        e.description.toLowerCase().includes(q)
    );
  }, [query]);

  const distinctActors = useMemo(
    () => new Set(TRAIL.map((t) => t.actorId)).size,
    []
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Deep Investigation</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            End-to-end audit trail for disbursement{" "}
            <span
              className="font-mono"
              style={{ color: "var(--accent-secondary)" }}
            >
              0x7c2f…a3d1
            </span>{" "}
            · MGNREGA Dahod
          </p>
        </div>
        <button className="btn-secondary text-sm">
          <Download className="w-4 h-4" aria-hidden="true" /> Export Audit Pack
          (PDF)
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Trail Events",
            value: TRAIL.length,
            color: "var(--accent-primary)",
            icon: FileSearch,
          },
          {
            label: "Distinct Actors",
            value: distinctActors,
            color: "var(--accent-secondary)",
            icon: Network,
          },
          {
            label: "All Verified",
            value: "✓",
            color: "var(--accent-success)",
            icon: ShieldCheck,
          },
          {
            label: "Time Span",
            value: "5d",
            color: "var(--accent-warning)",
            icon: Clock,
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label">{s.label}</span>
              <s.icon
                className="w-4 h-4"
                style={{ color: s.color }}
                aria-hidden="true"
              />
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg mb-6 max-w-md"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
        }}
        role="search"
      >
        <Search
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, actor, or TX ID…"
          className="bg-transparent border-none outline-none text-sm flex-1"
          style={{ color: "var(--text-primary)" }}
          aria-label="Search audit trail"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="glass-card p-6">
        {visible.length > 0 ? (
          <div className="timeline">
            {visible.map((e, idx) => (
              <TrailItem
                key={e.seq}
                event={e}
                isFirst={idx === 0}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No trail events match &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
