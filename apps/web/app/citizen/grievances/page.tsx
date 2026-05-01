"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useChainData, type GrievanceView } from "../../lib/useChainData";

type GrievanceStatus = GrievanceView["status"];

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ────────────────

const STATUS_CONFIG: Record<
  GrievanceStatus,
  { color: string; bg: string; border: string; icon: React.ElementType; label: string }
> = {
  open: {
    color: "var(--accent-secondary)",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.3)",
    icon: AlertCircle,
    label: "Open",
  },
  investigating: {
    color: "var(--accent-warning)",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.3)",
    icon: Clock,
    label: "Investigating",
  },
  resolved: {
    color: "var(--accent-success)",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.3)",
    icon: CheckCircle2,
    label: "Resolved",
  },
};

const FILTER_OPTIONS = ["all", "open", "investigating", "resolved"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GrievanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="badge"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <span className="stat-label">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
      </div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function GrievanceCard({ g, index }: { g: GrievanceView; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[g.status];
  const Icon = cfg.icon;

  return (
    <motion.div
      key={g.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            aria-hidden="true"
          >
            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {g.id}
              </span>
              <StatusBadge status={g.status} />
            </div>
            <h3 className="font-semibold text-sm mb-1">{g.title}</h3>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {g.scheme} · Filed {g.filedAt}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {g.responseCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(99,102,241,0.1)",
                color: "var(--accent-primary)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              {g.responseCount} {g.responseCount === 1 ? "response" : "responses"}
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <p
              className="text-sm leading-relaxed mb-3 ml-12"
              style={{ color: "var(--text-secondary)" }}
            >
              {g.description}
            </p>
            <div className="ml-12 flex items-center gap-3 flex-wrap">
              <div
                className="flex items-center gap-1.5 mono-pill"
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                <Hash className="w-3 h-3" aria-hidden="true" />
                <span className="truncate max-w-[160px]">
                  {g.txHash.slice(0, 18)}…
                </span>
              </div>
              <button
                className="text-xs font-semibold"
                style={{ color: "var(--accent-primary)" }}
              >
                View thread →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FileGrievanceModal({
  onClose,
  onSubmit,
  schemes,
}: {
  onClose: () => void;
  onSubmit: (data: { scheme: string; title: string; body: string }) => void;
  schemes: string[];
}) {
  const [scheme, setScheme] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!scheme) e.scheme = "Select a scheme.";
    if (!title.trim()) e.title = "Title is required.";
    else if (title.trim().length < 10) e.title = "Be more descriptive (10+ chars).";
    if (!body.trim()) e.body = "Details are required.";
    else if (body.trim().length < 30) e.body = "Provide more detail (30+ chars).";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSubmit({ scheme, title, body });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,14,26,0.85)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="File a Grievance"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="glass-card p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold">File a Grievance</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Your complaint hash is recorded immutably on-chain. Identity stays
          private via Privado-ID — only a pseudonymous DID is attached.
        </p>

        <div className="space-y-4 mb-5">
          {/* Scheme */}
          <div>
            <label
              className="text-xs uppercase tracking-wider font-semibold mb-1.5 block"
              style={{ color: "var(--text-muted)" }}
            >
              Scheme
            </label>
            <select
              value={scheme}
              onChange={(e) => {
                setScheme(e.target.value);
                setErrors((prev) => ({ ...prev, scheme: "" }));
              }}
              className="input-base"
              aria-invalid={!!errors.scheme}
            >
              <option value="">Select a scheme…</option>
              {schemes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {errors.scheme && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>
                {errors.scheme}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label
              className="text-xs uppercase tracking-wider font-semibold mb-1.5 block"
              style={{ color: "var(--text-muted)" }}
            >
              Title
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: "" }));
              }}
              className="input-base"
              placeholder="One-line summary of the issue"
              maxLength={120}
              aria-invalid={!!errors.title}
            />
            <div className="flex justify-between mt-1">
              {errors.title ? (
                <p className="text-xs" style={{ color: "var(--accent-danger)" }}>
                  {errors.title}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {title.length}/120
              </span>
            </div>
          </div>

          {/* Details */}
          <div>
            <label
              className="text-xs uppercase tracking-wider font-semibold mb-1.5 block"
              style={{ color: "var(--text-muted)" }}
            >
              Details
            </label>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setErrors((prev) => ({ ...prev, body: "" }));
              }}
              className="input-base"
              rows={5}
              placeholder="Describe what happened, when, and any relevant transaction IDs."
              aria-invalid={!!errors.body}
            />
            {errors.body && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>
                {errors.body}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-sm" onClick={handleSubmit}>
            Anchor on-chain
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function GrievancesPage() {
  const { grievances: GRIEVANCES, schemes } = useChainData();
  const schemeOptions = useMemo(() => schemes.map((s) => s.name), [schemes]);
  
  const [showFile, setShowFile] = useState(false);
  const [filter, setFilter] = useState<FilterOption>("all");

  const stats = useMemo(
    () => ({
      total: GRIEVANCES.length,
      open: GRIEVANCES.filter((g) => g.status === "open").length,
      investigating: GRIEVANCES.filter((g) => g.status === "investigating").length,
      resolved: GRIEVANCES.filter((g) => g.status === "resolved").length,
    }),
    []
  );

  const visible = useMemo(
    () =>
      filter === "all"
        ? GRIEVANCES
        : GRIEVANCES.filter((g) => g.status === filter),
    [filter]
  );

  const handleSubmit = useCallback(
    ({ scheme, title, body }: { scheme: string; title: string; body: string }) => {
      // TODO: call GrievancePortal.fileGrievance(schemeId, hash(title+body))
      // Body goes to IPFS; hash anchored to chain.
      console.log("Filing:", { scheme, title, body });
      setShowFile(false);
    },
    []
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Grievances</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            On-chain grievance redressal · Every complaint hash is anchored to
            Polygon Amoy
          </p>
        </div>
        <button
          onClick={() => setShowFile(true)}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> File Grievance
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Filed"
          value={stats.total}
          color="var(--accent-primary)"
          icon={MessageSquare}
        />
        <StatCard
          label="Open"
          value={stats.open}
          color="var(--accent-secondary)"
          icon={AlertCircle}
        />
        <StatCard
          label="Investigating"
          value={stats.investigating}
          color="var(--accent-warning)"
          icon={Clock}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          color="var(--accent-success)"
          icon={CheckCircle2}
        />
      </div>

      {/* Filter chips */}
      <div
        className="flex items-center gap-2 mb-5 flex-wrap"
        role="group"
        aria-label="Filter grievances by status"
      >
        {FILTER_OPTIONS.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background:
                filter === k
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(99,102,241,0.04)",
              border:
                filter === k
                  ? "1px solid var(--border-glow)"
                  : "1px solid var(--border-subtle)",
              color:
                filter === k
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {visible.length > 0 ? (
            visible.map((g, i) => (
              <GrievanceCard key={g.id} g={g} index={i} />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              No grievances match this filter.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showFile && (
          <FileGrievanceModal
            onClose={() => setShowFile(false)}
            onSubmit={handleSubmit}
            schemes={schemeOptions}
          />
        )}
      </AnimatePresence>
    </div>
  );
}