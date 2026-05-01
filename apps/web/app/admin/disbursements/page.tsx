"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Snowflake,
  ChevronRight,
} from "lucide-react";
import { useChainData } from "../../lib/useChainData";

/* ─── Types ────────────────────────────────────────────────────────────────── */

type Status = "active" | "flagged" | "frozen" | "pending";

interface Disbursement {
  id: string;
  scheme: string;
  stage: string;
  amount: string;
  recipient: string;
  time: string;
  status: Status;
  gst: boolean;
  bank: boolean;
  geo: boolean;
}

/* ─── Constants ────────────────────────────────────────────────────────────── */

const STAGES = [
  "Sanctioned",
  "ReleasedToAgency",
  "ReleasedToVendor",
  "ReleasedToBeneficiary",
  "WorkCompleted",
];

const STAGE_LABELS: Record<string, string> = {
  Sanctioned: "Sanctioned",
  ReleasedToAgency: "To Agency",
  ReleasedToVendor: "To Vendor",
  ReleasedToBeneficiary: "To Beneficiary",
  WorkCompleted: "Completed",
};

/* ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ───────────── */

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function stageIndex(stage: string) {
  const i = STAGES.indexOf(stage);
  return i === -1 ? 0 : i;
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; border: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    color: "#10B981",
    icon: <CheckCircle2 size={11} />,
  },
  flagged: {
    label: "Flagged",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    color: "#F59E0B",
    icon: <AlertTriangle size={11} />,
  },
  frozen: {
    label: "Frozen",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.25)",
    color: "#818CF8",
    icon: <Snowflake size={11} />,
  },
  pending: {
    label: "Pending",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.25)",
    color: "#FBBF24",
    icon: <Clock size={11} />,
  },
};

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function OracleCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${ok ? "verified" : "failed"}`}>
      {ok ? (
        <CheckCircle2 size={13} style={{ color: "#10B981" }} />
      ) : (
        <XCircle size={13} style={{ color: "#EF4444" }} />
      )}
      <span className="text-[11px]" style={{ color: ok ? "#10B981" : "#EF4444" }}>
        {label}
      </span>
    </div>
  );
}

function StagePipeline({
  stage,
  status,
}: {
  stage: string;
  status: Status;
}) {
  const current = stageIndex(stage);
  const isBad = status === "flagged" || status === "frozen";
  const activeColor = isBad ? "#F59E0B" : "#3B82F6";

  return (
    <div className="flex flex-col gap-2">
      {/* Track */}
      <div className="flex items-center">
        {STAGES.map((s, idx) => {
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={s} className="flex items-center" style={{ flex: idx < STAGES.length - 1 ? 1 : 0 }}>
              {/* Node */}
              <div
                className="relative flex items-center justify-center rounded-full shrink-0 transition-all"
                style={{
                  width: 20,
                  height: 20,
                  background: done
                    ? "#3B82F6"
                    : active
                      ? activeColor
                      : "var(--surface2)",
                  border: `2px solid ${done
                      ? "#3B82F6"
                      : active
                        ? activeColor
                        : "var(--border)"
                    }`,
                  boxShadow: active ? `0 0 0 3px ${activeColor}20` : "none",
                  zIndex: 1,
                }}
              >
                {done && <CheckCircle2 size={11} color="#fff" />}
                {active && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#fff" }}
                  />
                )}
              </div>

              {/* Connector */}
              {idx < STAGES.length - 1 && (
                <div
                  className="flex-1 h-[2px] transition-all"
                  style={{
                    background: done
                      ? "#3B82F6"
                      : "var(--border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex items-start">
        {STAGES.map((s, idx) => {
          const active = idx === current;
          return (
            <div
              key={s}
              className="text-center"
              style={{
                flex: idx < STAGES.length - 1 ? 1 : 0,
                minWidth: 0,
              }}
            >
              <span
                className="text-[9px] uppercase tracking-wide leading-tight block"
                style={{
                  color: active ? activeColor : "var(--muted)",
                  fontWeight: active ? 700 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {STAGE_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisbursementCard({
  d,
  index,
}: {
  d: Disbursement;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        border:
          d.status === "flagged"
            ? "1px solid rgba(245,158,11,0.3)"
            : d.status === "frozen"
              ? "1px solid rgba(129,140,248,0.3)"
              : "1px solid var(--border)",
      }}
    >
      {/* Top section */}
      <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
        {/* Left: ID + scheme + badge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="font-mono text-[11px] px-2 py-1 rounded-lg shrink-0"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            {d.id}
          </span>
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: "var(--text)" }}
          >
            {d.scheme}
          </span>
          <StatusBadge status={d.status} />
        </div>

        {/* Right: amount + time */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Amount
            </div>
            <div
              className="text-[15px] font-bold font-mono"
              style={{ color: "var(--text)" }}
            >
              {d.amount}
            </div>
          </div>
          <div
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            <Clock size={11} />
            {d.time}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="px-4 pb-3">
        <StagePipeline stage={d.stage} status={d.status} />
      </div>

      {/* Bottom section */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{
          background: "var(--surface2)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* Oracle checks */}
        <div className="flex items-center gap-3">
          <OracleCheck ok={d.gst} label="GST" />
          <OracleCheck ok={d.bank} label="Bank" />
          <OracleCheck ok={d.geo} label="Geo" />
        </div>

        {/* Recipient */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            Recipient
          </span>
          <ChevronRight size={10} style={{ color: "var(--muted)" }} />
          <span
            className="font-mono text-[10px] truncate max-w-[180px]"
            style={{
              color: "var(--text-secondary)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "2px 6px",
            }}
          >
            {d.recipient}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function NewDisbursementModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ schemeId: "", recipientDid: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = form.schemeId.trim() && form.recipientDid.trim() && form.amount.trim();

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onClose, 1500);
  }, [canSubmit, submitting, onClose]);

  const fields: { key: keyof typeof form; label: string; placeholder: string; type?: string }[] = [
    { key: "schemeId", label: "Scheme ID", placeholder: "0x… (bytes32)" },
    { key: "recipientDid", label: "Recipient DID", placeholder: "did:polygonid:…" },
    { key: "amount", label: "Amount (paisa)", placeholder: "600000", type: "number" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5,5,10,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
              New Disbursement
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
              Submits <code className="font-mono">initiateDisbursement()</code> to the FundFlow contract
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <X size={13} style={{ color: "var(--muted)" }} />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div
            className="text-[11px] px-3 py-2.5 rounded-xl leading-relaxed"
            style={{
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.18)",
              color: "#93C5FD",
            }}
          >
            Oracles (GST · Bank · Geo) run automatically before each stage transition to <em>Released</em>.
          </div>

          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--muted)" }}
              >
                {label}
              </label>
              <input
                value={form[key]}
                onChange={set(key)}
                type={type ?? "text"}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl font-mono text-[12px] px-3 py-2.5 outline-none transition-all"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
              />
            </div>
          ))}
        </div>

        {/* Modal footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-70"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || submitted}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all"
            style={{
              background: submitted
                ? "rgba(16,185,129,0.15)"
                : canSubmit
                  ? "#3B82F6"
                  : "var(--surface2)",
              color: submitted ? "#10B981" : canSubmit ? "#fff" : "var(--muted)",
              border: submitted ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
              cursor: canSubmit && !submitting && !submitted ? "pointer" : "not-allowed",
            }}
          >
            {submitted ? (
              <>
                <CheckCircle2 size={14} />
                Broadcast!
              </>
            ) : submitting ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                />
                Broadcasting…
              </>
            ) : (
              <>
                <Send size={13} />
                Sign & Broadcast
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

const FILTER_KEYS = ["all", "active", "flagged", "frozen"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export default function DisbursementPipelinePage() {
  const { disbursements: chainDisb, connected } = useChainData();
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const list: Disbursement[] = chainDisb;

  const filtered = list.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.scheme.toLowerCase().includes(q) ||
        d.recipient.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<FilterKey, number> = {
    all: list.length,
    active: list.filter((d) => d.status === "active").length,
    flagged: list.filter((d) => d.status === "flagged").length,
    frozen: list.filter((d) => d.status === "frozen").length,
  };

  return (
    <>
      <style>{`
        :root {
          --surface:  #141418;
          --surface2: #0e0e11;
          --border:   rgba(255,255,255,0.07);
          --border-color: rgba(255,255,255,0.07);
          --text:     #f0f0f4;
          --text-secondary: #9898a8;
          --muted:    #5a5a6a;
        }
      `}</style>

      <div className="flex flex-col gap-6 p-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>
              Disbursement Pipeline
            </h1>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Track every rupee from sanction to last-mile ·{" "}
              {connected ? "Live FundFlow events" : "Mock data"}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-85"
            style={{ background: "#3B82F6", color: "#fff", border: "none" }}
          >
            <Send size={14} />
            Initiate Disbursement
          </button>
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all"
              style={{
                background:
                  statusFilter === k
                    ? "rgba(59,130,246,0.15)"
                    : "var(--surface)",
                border:
                  statusFilter === k
                    ? "1px solid rgba(59,130,246,0.4)"
                    : "1px solid var(--border)",
                color:
                  statusFilter === k ? "#3B82F6" : "var(--muted)",
              }}
            >
              {k}{" "}
              <span style={{ opacity: 0.55 }}>· {counts[k]}</span>
            </button>
          ))}

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full ml-auto"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Search size={13} style={{ color: "var(--muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, scheme, DID…"
              className="bg-transparent outline-none text-[12px]"
              style={{ color: "var(--text)", width: 220 }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="hover:opacity-70">
                <X size={12} style={{ color: "var(--muted)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((d, i) => (
                <DisbursementCard key={d.id} d={d} index={i} />
              ))
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
                No disbursements match the current filters.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showNew && <NewDisbursementModal onClose={() => setShowNew(false)} />}
      </AnimatePresence>
    </>
  );
}