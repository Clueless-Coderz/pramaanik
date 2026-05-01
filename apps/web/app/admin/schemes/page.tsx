"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  IndianRupee,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { useChainData } from "../../lib/useChainData";

// ─── Types ────────────────────────────────────────────────────────────────────

type SchemeStatus = "active" | "pending" | "frozen";

interface Scheme {
  name: string;
  ministry: string;
  budget: string;
  beneficiaries: string;
  disbursed: string;
  disbursedPct: number;
  status: SchemeStatus;
  sanctionDate: string;
}

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ───────────────

// ─── New Scheme form state ────────────────────────────────────────────────────

interface NewSchemeForm {
  name: string;
  ministry: string;
  budget: string;
  beneficiaries: string;
}

const EMPTY_FORM: NewSchemeForm = {
  name: "",
  ministry: "",
  budget: "",
  beneficiaries: "",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct > 75
      ? "var(--accent-success)"
      : pct > 40
        ? "var(--accent-secondary)"
        : "var(--accent-warning)";

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span style={{ color: "var(--text-muted)" }}>Disbursement progress</span>
        <span className="font-mono font-semibold">{pct}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SchemeCard({ scheme, index }: { scheme: Scheme; index: number }) {
  const isPending = scheme.status === "pending";

  return (
    <motion.div
      key={scheme.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card p-6 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-base font-bold mb-1 truncate">{scheme.name}</h3>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{scheme.ministry}</span>
          </div>
        </div>
        <span className={`badge shrink-0 ${isPending ? "badge-pending" : "badge-active"}`}>
          {scheme.status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="p-3 rounded-lg"
          style={{ background: "rgba(99,102,241,0.04)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <IndianRupee className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Budget
            </span>
          </div>
          <div className="font-bold text-sm">{scheme.budget}</div>
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ background: "rgba(99,102,241,0.04)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Beneficiaries
            </span>
          </div>
          <div className="font-bold text-sm">{scheme.beneficiaries}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <ProgressBar pct={scheme.disbursedPct} />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 border-t mt-auto"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <Calendar className="w-3 h-3" />
          {scheme.sanctionDate !== "—"
            ? `Sanctioned: ${scheme.sanctionDate}`
            : "Sanction date pending"}
        </div>
        <button
          className="text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--accent-primary)" }}
        >
          View details →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Filter tab config ────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: SchemeStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Frozen", value: "frozen" },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

function NewSchemeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: NewSchemeForm) => void;
}) {
  const [form, setForm] = useState<NewSchemeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<NewSchemeForm>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function validate(): boolean {
    const errs: Partial<NewSchemeForm> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.ministry.trim()) errs.ministry = "Required";
    if (!form.budget || isNaN(Number(form.budget)) || Number(form.budget) <= 0)
      errs.budget = "Enter a valid amount";
    if (
      !form.beneficiaries ||
      isNaN(Number(form.beneficiaries)) ||
      Number(form.beneficiaries) <= 0
    )
      errs.beneficiaries = "Enter a valid count";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (validate()) onSubmit(form);
  }

  function field(key: keyof NewSchemeForm, label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>, ref?: React.Ref<HTMLInputElement>) {
    return (
      <div>
        <label
          htmlFor={`new-scheme-${key}`}
          className="text-xs uppercase tracking-wider font-semibold mb-1.5 block"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={`new-scheme-${key}`}
          className={`input-base ${errors[key] ? "border-red-500/60" : ""}`}
          value={form[key]}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }));
          }}
          {...extra}
        />
        {errors[key] && (
          <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,14,26,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="glass-card p-6 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <h2 id="modal-title" className="text-lg font-bold mb-1 pr-8">
          Register New Scheme
        </h2>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Submits a <code className="font-mono">registerScheme(...)</code>{" "}
          transaction to the SchemeRegistry contract.
        </p>

        <div className="space-y-3 mb-5">
          {field("name", "Scheme Name", { placeholder: "e.g. PM-Awas Yojana FY27" }, firstInputRef)}
          {field("ministry", "Ministry", { placeholder: "e.g. Ministry of Housing" })}
          <div className="grid grid-cols-2 gap-3">
            {field("budget", "Budget (₹ Cr)", {
              placeholder: "0",
              type: "number",
              min: "0",
              className: "input-base input-mono",
            })}
            {field("beneficiaries", "Target Beneficiaries", {
              placeholder: "0",
              type: "number",
              min: "0",
              className: "input-base input-mono",
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary text-sm" onClick={handleSubmit}>
            Submit on-chain
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchemeRegistryPage() {
  const { schemes: chainSchemes, connected } = useChainData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SchemeStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  // Normalise chain data → Scheme[]
  const data = useMemo<Scheme[]>(
    () =>
      chainSchemes.map((s) => ({
        ...s,
        status: "active" as SchemeStatus,
        sanctionDate: "—",
      })),
    [chainSchemes]
  );

  // Derived counts (always computed from full data, not filtered)
  const totalCount = data.length;
  const activeCount = data.filter((s) => s.status === "active").length;
  const pendingCount = data.filter((s) => s.status === "pending").length;

  // Filtered list
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data, query, statusFilter]);

  function handleSubmit(form: NewSchemeForm) {
    // TODO: wire to contracts.ts → SchemeRegistry.registerScheme()
    console.log("Submitting scheme:", form);
    alert(
      `Demo: registerScheme("${form.name}", "${form.ministry}", ${form.budget}, ${form.beneficiaries})\n\nWire to contracts.ts → SchemeRegistry contract.`
    );
    setShowNew(false);
  }

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Scheme Registry</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            All sanctioned schemes on the Pramaanik chain ·{" "}
            <span
              style={{
                color: connected
                  ? "var(--accent-success)"
                  : "var(--accent-warning)",
              }}
            >
              {connected ? "Live registry" : "Demo data"}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4" /> Register Scheme
        </button>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="stat-label">Total Schemes</span>
            <FileText className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          </div>
          <div className="stat-value" style={{ color: "var(--accent-primary)" }}>
            {totalCount}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            On-chain registered
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="stat-label">Active</span>
            <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
          </div>
          <div className="stat-value" style={{ color: "var(--accent-success)" }}>
            {activeCount}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Currently disbursing
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="stat-label">Pending Sanction</span>
            <Clock className="w-4 h-4" style={{ color: "var(--accent-warning)" }} />
          </div>
          <div className="stat-value" style={{ color: "var(--accent-warning)" }}>
            {pendingCount}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Awaiting approval
          </div>
        </motion.div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        {/* Search input */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 w-full sm:max-w-md"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by scheme name or ministry…"
            className="bg-transparent border-none outline-none text-sm flex-1"
            style={{ color: "var(--text-primary)" }}
            aria-label="Search schemes"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div
          className="flex items-center rounded-lg overflow-hidden shrink-0"
          style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}
          role="tablist"
          aria-label="Filter by status"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className="px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                color:
                  statusFilter === tab.value
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                background:
                  statusFilter === tab.value
                    ? "rgba(99,102,241,0.15)"
                    : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Showing{" "}
        <span style={{ color: "var(--text-primary)" }}>{filtered.length}</span>{" "}
        of {totalCount} schemes
        {query && (
          <>
            {" "}
            for &ldquo;
            <span style={{ color: "var(--accent-primary)" }}>{query}</span>
            &rdquo;
          </>
        )}
      </p>

      {/* ── Scheme cards grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {filtered.map((s, i) => (
            <SchemeCard key={s.name} scheme={s} index={i} />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-2 glass-card p-12 flex flex-col items-center gap-3 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            <SlidersHorizontal className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              No matching schemes
            </p>
            <p className="text-xs">
              {query
                ? `No results for "${query}". Try a different search term.`
                : `No schemes with status "${statusFilter}".`}
            </p>
            <button
              onClick={() => { setQuery(""); setStatusFilter("all"); }}
              className="btn-secondary text-xs mt-2"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>

      {/* ── New Scheme Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showNew && (
          <NewSchemeModal
            onClose={() => setShowNew(false)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}