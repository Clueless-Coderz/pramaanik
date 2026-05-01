"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  ShieldCheck,
  ChevronRight,
  Network,
  Snowflake,
  Search,
  Radio,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

import { useChainData, type FlagView as Flag, type Severity } from "../../lib/useChainData";

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ────────────────

/* ─── Config ────────────────────────────────────────────────────────────────── */

const SEVERITY_CFG: Record<Severity, { color: string; bg: string; border: string; label: string }> = {
  critical: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    label: "Critical",
  },
  high: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    label: "High",
  },
  medium: {
    color: "#818CF8",
    bg: "rgba(129,140,248,0.08)",
    border: "rgba(129,140,248,0.25)",
    label: "Medium",
  },
};

const FILTER_KEYS = ["all", "critical", "high", "medium"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CFG[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function RiskGauge({ risk, severity }: { risk: number; severity: Severity }) {
  const pct = Math.round(risk / 100);
  const cfg = SEVERITY_CFG[severity];
  const r = 26;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={cfg.color}
          strokeWidth="5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[13px] font-bold leading-none" style={{ color: cfg.color }}>{pct}%</div>
        <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "var(--muted)" }}>risk</div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}
    >
      {copied ? <Check size={11} style={{ color: "#10B981" }} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function FlagListItem({
  flag,
  selected,
  onClick,
  index,
}: {
  flag: Flag;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  const cfg = SEVERITY_CFG[flag.severity];
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all"
      style={{
        background: selected ? cfg.bg : "var(--surface)",
        border: `1px solid ${selected ? cfg.border : "var(--border)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] font-semibold" style={{ color: cfg.color }}>
          {flag.id}
        </span>
        <SeverityBadge severity={flag.severity} />
      </div>
      <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>
        {flag.type}
      </div>
      <div className="text-[12px] mb-3" style={{ color: "var(--muted)" }}>
        {flag.scheme} · {flag.amount}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ width: 80, background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(flag.risk / 100)}%`, background: cfg.color }}
            />
          </div>
          <span className="text-[11px] font-mono" style={{ color: cfg.color }}>
            {Math.round(flag.risk / 100)}%
          </span>
        </div>
        <ChevronRight size={14} style={{ color: "var(--muted)", opacity: selected ? 1 : 0.5 }} />
      </div>
    </motion.button>
  );
}

function DetailPanel({ flag }: { flag: Flag }) {
  const cfg = SEVERITY_CFG[flag.severity];
  const [frozeId, setFrozeId] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [investigated, setInvestigated] = useState<string | null>(null);

  const isFrozen = frozeId === flag.id;
  const isInvestigated = investigated === flag.id;

  const handleFreeze = useCallback(async () => {
    if (freezing || isFrozen) return;
    setFreezing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setFreezing(false);
    setFrozeId(flag.id);
  }, [freezing, isFrozen, flag.id]);

  const handleInvestigate = useCallback(async () => {
    if (investigating || isInvestigated) return;
    setInvestigating(true);
    await new Promise((r) => setTimeout(r, 800));
    setInvestigating(false);
    setInvestigated(flag.id);
  }, [investigating, isInvestigated, flag.id]);

  return (
    <motion.div
      key={flag.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--surface)", border: `1px solid ${cfg.border}` }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <AlertTriangle size={16} style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-bold truncate" style={{ color: "var(--text)" }}>
              {flag.type}
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              {flag.id} · {flag.time}
            </div>
          </div>
        </div>
        <RiskGauge risk={flag.risk} severity={flag.severity} />
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Scheme", value: flag.scheme, mono: false },
            { label: "Amount", value: flag.amount, mono: true },
          ].map(({ label, value, mono }) => (
            <div
              key={label}
              className="rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
                {label}
              </div>
              <div
                className={`text-[13px] font-semibold ${mono ? "font-mono" : ""}`}
                style={{ color: "var(--text)" }}
              >
                {value}
              </div>
            </div>
          ))}
          <div
            className="col-span-2 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
                Disbursement ID
              </div>
              <div className="font-mono text-[12px] truncate" style={{ color: cfg.color }}>
                {flag.txId}
              </div>
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg shrink-0 transition-opacity hover:opacity-70"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
            >
              <ExternalLink size={11} />
              View
            </a>
          </div>
        </div>

        {/* Explanation */}
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
            Explanation
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {flag.explanation}
          </p>
        </div>

        {/* Motif */}
        <div>
          <div
            className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5"
            style={{ color: "var(--muted)" }}
          >
            <Network size={11} />
            Detected Motif
          </div>
          <div
            className="font-mono text-[11px] px-3 py-2.5 rounded-xl leading-relaxed"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {flag.motif || flag.explanation.slice(0, 50) + "..."}
          </div>
        </div>

        {/* Proof */}
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} style={{ color: "#10B981" }} />
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "#10B981" }}
              >
                zk-SNARK Proof Verified
              </span>
            </div>
            <CopyButton text={flag.proof} />
          </div>
          <div
            className="font-mono text-[10px] break-all leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {flag.proof}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
            <Brain size={11} />
            Model: {flag.model || "RGCN v2.3"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <button
          onClick={handleFreeze}
          disabled={freezing || isFrozen}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
          style={{
            background: isFrozen ? "rgba(129,140,248,0.1)" : "rgba(239,68,68,0.1)",
            border: isFrozen ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(239,68,68,0.3)",
            color: isFrozen ? "#818CF8" : "#EF4444",
            cursor: isFrozen ? "default" : "pointer",
            opacity: freezing ? 0.6 : 1,
          }}
        >
          {freezing ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
          ) : isFrozen ? (
            <Snowflake size={14} />
          ) : (
            <Snowflake size={14} />
          )}
          {freezing ? "Freezing…" : isFrozen ? "Frozen" : "Freeze Disbursement"}
        </button>

        <button
          onClick={handleInvestigate}
          disabled={investigating || isInvestigated}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
          style={{
            background: isInvestigated ? "rgba(16,185,129,0.08)" : "var(--surface2)",
            border: isInvestigated ? "1px solid rgba(16,185,129,0.25)" : "1px solid var(--border)",
            color: isInvestigated ? "#10B981" : "var(--text-secondary)",
            cursor: isInvestigated ? "default" : "pointer",
            opacity: investigating ? 0.6 : 1,
          }}
        >
          {investigating ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          ) : isInvestigated ? (
            <Check size={14} />
          ) : null}
          {investigating ? "Opening…" : isInvestigated ? "Investigation Opened" : "Open Investigation"}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AnomalyFlagsPage() {
  const { flags: FLAGS } = useChainData();
  const [selected, setSelected] = useState<Flag>(FLAGS[0]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const visible = FLAGS.filter((f) => {
    if (filter !== "all" && f.severity !== filter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        f.type.toLowerCase().includes(q) ||
        f.scheme.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: FLAGS.length,
    critical: FLAGS.filter((f) => f.severity === "critical").length,
    high: FLAGS.filter((f) => f.severity === "high").length,
    medium: FLAGS.filter((f) => f.severity === "medium").length,
  };

  const STATS = [
    { label: "Total Active", value: FLAGS.length, color: "#3B82F6" },
    { label: "Critical", value: counts.critical, color: "#EF4444" },
    { label: "High", value: counts.high, color: "#F59E0B" },
    { label: "Medium", value: counts.medium, color: "#818CF8" },
  ];

  return (
    <>
      <style>{`
        :root {
          --surface:  #141418;
          --surface2: #0e0e11;
          --border:   rgba(255,255,255,0.07);
          --text:     #f0f0f4;
          --text-secondary: #9898a8;
          --muted:    #5a5a6a;
        }
      `}</style>

      <div className="flex flex-col gap-5 p-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>
              Anomaly Flags
            </h1>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              zkML-attested fraud detections from RGCN v2.3 · Each flag is a verifiable zk-SNARK
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <Radio size={12} style={{ color: "#10B981" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#10B981" }}>
              Oracle stream live
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl px-4 py-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                {s.label}
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all capitalize"
              style={{
                background: filter === k ? "rgba(59,130,246,0.15)" : "var(--surface)",
                border: filter === k ? "1px solid rgba(59,130,246,0.4)" : "1px solid var(--border)",
                color: filter === k ? "#3B82F6" : "var(--muted)",
              }}
            >
              {k} <span style={{ opacity: 0.55 }}>· {counts[k as FilterKey]}</span>
            </button>
          ))}

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-auto"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Search size={12} style={{ color: "var(--muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search type, scheme, ID…"
              className="bg-transparent outline-none text-[12px]"
              style={{ color: "var(--text)", width: 180 }}
            />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* Flag list */}
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {visible.length > 0 ? (
                visible.map((f, i) => (
                  <FlagListItem
                    key={f.id}
                    flag={f}
                    selected={selected?.id === f.id}
                    onClick={() => setSelected(f)}
                    index={i}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-8 text-center text-[13px]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  No flags match the current filters.
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detail panel */}
          <div>
            <AnimatePresence mode="wait">
              {selected ? (
                <DetailPanel key={selected.id} flag={selected} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl p-12 text-center text-[13px]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }}
                >
                  Select a flag to inspect details.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}