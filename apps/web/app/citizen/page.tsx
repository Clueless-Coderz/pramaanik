"use client";

import { useState, useCallback, useId, useMemo } from "react";
import { t, Locale } from "../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  IndianRupee,
  CheckCircle2,
  Clock,
  Shield,
  MessageSquare,
  Globe,
  Fingerprint,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type FundStep = {
  stage: string;
  entity: string;
  amount: string;
  time: string;
  txHash: string;
  verified: boolean;
};

type BenefitStatus = "Received" | "Pending";

type Benefit = {
  scheme: string;
  amount: string;
  status: BenefitStatus;
  installment: string;
  date: string;
  verified: boolean;
};

type Scheme = {
  name: string;
  ministry: string;
  budget: string;
  beneficiaries: string;
  disbursedPct: number;
};

// ─── Seeded Constants (mirrors SeedDemo.s.sol) ───────────────────────────

const FUND_TRACE: FundStep[] = [
  { stage: "Sanctioned", entity: "Ministry of Agriculture & Farmers Welfare", amount: "₹714 Cr", time: "25 Apr 2025", txHash: "0xa1b2…c3d4", verified: true },
  { stage: "Released to State Treasury", entity: "Rajasthan State Treasury", amount: "₹714 Cr", time: "26 Apr 2025", txHash: "0xe5f6…g7h8", verified: true },
  { stage: "Released to Agency", entity: "Dept of Agriculture, Rajasthan", amount: "₹714 Cr", time: "27 Apr 2025", txHash: "0xi9j0…k1l2", verified: true },
  { stage: "Released to Beneficiary", entity: "did:polygonid:farmer:RJ:2025:RJ01AA001234567", amount: "₹2,000", time: "30 Apr 2025", txHash: "0xm3n4…o5p6", verified: true },
];

const MY_BENEFITS: Benefit[] = [
  { scheme: "PM-KISAN FY2025-26 Installment-19", amount: "₹2,000", status: "Received", installment: "19th", date: "30 Apr 2025", verified: true },
  { scheme: "PM-KISAN FY2025-26 Installment-18", amount: "₹2,000", status: "Received", installment: "18th", date: "15 Dec 2024", verified: true },
  { scheme: "MGNREGA FY2025-26 Bihar-Q1", amount: "₹3,192", status: "Received", installment: "Q1 Wages", date: "30 Apr 2025", verified: true },
  { scheme: "PMAY-G FY2025-26 Odisha Phase-3", amount: "₹40,000", status: "Pending", installment: "Foundation", date: "—", verified: false },
];

const SCHEMES: Scheme[] = [
  { name: "PM-KISAN FY2025-26 Installment-19", ministry: "Agriculture & Farmers Welfare", budget: "₹714.0 Cr", beneficiaries: "5", disbursedPct: 100 },
  { name: "MGNREGA FY2025-26 Bihar-Q1", ministry: "Rural Development", budget: "₹2,408.0 Cr", beneficiaries: "3", disbursedPct: 4 },
  { name: "Ayushman Bharat PMJAY FY2025-26 MP", ministry: "Health & Family Welfare", budget: "₹307.5 Cr", beneficiaries: "3", disbursedPct: 6 },
  { name: "PMAY-G FY2025-26 Odisha Phase-3", ministry: "Rural Development", budget: "₹2,125.5 Cr", beneficiaries: "2", disbursedPct: 1 },
];

const SCHEME_OPTIONS = SCHEMES.map((s) => s.name);

// ─── FundTraceTimeline ────────────────────────────────────────────────────

function FundTraceTimeline({
  steps,
  locale,
  onClose,
}: {
  steps: FundStep[];
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="glass-card p-6 mb-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <IndianRupee className="w-4 h-4" style={{ color: "var(--accent-success)" }} aria-hidden="true" />
          Fund Flow Trace — PM-KISAN FY2026
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md"
          style={{ color: "var(--text-muted)" }}
          aria-label="Close fund trace"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ol aria-label="Fund flow stages">
        {steps.map((step, i) => (
          <motion.li
            key={step.stage}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex gap-4 mb-6 last:mb-0"
          >
            {/* Spine */}
            <div className="flex flex-col items-center" aria-hidden="true">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: step.verified ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  border: `2px solid ${step.verified ? "var(--accent-success)" : "var(--accent-warning)"}`,
                }}
              >
                {step.verified
                  ? <CheckCircle2 className="w-5 h-5" style={{ color: "var(--accent-success)" }} />
                  : <Clock className="w-5 h-5" style={{ color: "var(--accent-warning)" }} />
                }
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 my-2" style={{ background: "var(--border-subtle)" }} />
              )}
            </div>

            {/* Card */}
            <div
              className="flex-1 p-4 rounded-lg border"
              style={{ borderColor: "var(--border-subtle)", background: "rgba(16,185,129,0.03)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">{step.stage}</span>
                <time className="text-xs" style={{ color: "var(--text-muted)" }} dateTime={step.time}>
                  {step.time}
                </time>
              </div>
              <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {step.entity}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm" style={{ color: "var(--accent-success)" }}>
                  {step.amount}
                </span>
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  TX: {step.txHash}
                </span>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>

      <div
        className="mt-4 p-3 rounded-lg text-center text-xs flex items-center justify-center gap-2"
        style={{ background: "rgba(16,185,129,0.08)", color: "var(--accent-success)" }}
        role="status"
        aria-live="polite"
      >
        <Shield className="w-4 h-4 shrink-0" aria-hidden="true" />
        {t(locale, "citizen.trace.verified")}
      </div>
    </motion.div>
  );
}

// ─── BenefitRow ───────────────────────────────────────────────────────────

function BenefitRow({ benefit }: { benefit: Benefit }) {
  const isReceived = benefit.status === "Received";
  return (
    <div className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{benefit.scheme}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {benefit.installment} ·{" "}
          {benefit.date !== "—"
            ? <time dateTime={benefit.date}>{benefit.date}</time>
            : <span aria-label="Date pending">—</span>
          }
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-sm mb-0.5 tabular-nums">{benefit.amount}</div>
        <span
          className={`badge ${isReceived ? "badge-active" : "badge-pending"}`}
          aria-label={`Status: ${benefit.status}`}
        >
          {benefit.status}
        </span>
      </div>
    </div>
  );
}

// ─── SchemeProgressBar ────────────────────────────────────────────────────

function SchemeProgressBar({ pct }: { pct: number }) {
  // Colour shifts green→amber→red as disbursement falls
  const color =
    pct >= 55 ? "var(--accent-success)"
      : pct >= 40 ? "var(--accent-secondary)"
        : "var(--accent-warning)";

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-20 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% disbursed`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── GrievanceForm ────────────────────────────────────────────────────────

type GrievanceState = "idle" | "submitting" | "success";

function GrievanceForm({ locale }: { locale: Locale }) {
  const [scheme, setScheme] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<{ scheme?: string; body?: string }>({});
  const [formState, setFormState] = useState<GrievanceState>("idle");

  const schemeId = useId();
  const bodyId = useId();

  function validate() {
    const e: typeof errors = {};
    if (!scheme) e.scheme = "Please select a scheme.";
    if (!body.trim()) e.body = "Please describe the issue.";
    else if (body.trim().length < 20) e.body = "Provide more detail (20+ characters).";
    return e;
  }

  const handleSubmit = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setFormState("submitting");
    // TODO: call on-chain grievance contract
    await new Promise((r) => setTimeout(r, 900));
    setFormState("success");
    setTimeout(() => { setFormState("idle"); setScheme(""); setBody(""); }, 2800);
  }, [scheme, body]);

  const isSubmitting = formState === "submitting";
  const isSuccess = formState === "success";

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={schemeId}
          className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
          style={{ color: "var(--text-muted)" }}
        >
          Scheme
        </label>
        <select
          id={schemeId}
          value={scheme}
          onChange={(e) => { setScheme(e.target.value); setErrors((prev) => ({ ...prev, scheme: undefined })); }}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg-secondary)", border: `1px solid ${errors.scheme ? "var(--accent-danger)" : "var(--border-subtle)"}`, color: "var(--text-primary)" }}
          aria-invalid={!!errors.scheme}
          aria-describedby={errors.scheme ? `${schemeId}-err` : undefined}
        >
          <option value="">{t(locale, "citizen.grievance.select")}</option>
          {SCHEME_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        {errors.scheme && (
          <p id={`${schemeId}-err`} className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--accent-danger)" }} role="alert">
            <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />{errors.scheme}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={bodyId}
          className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
          style={{ color: "var(--text-muted)" }}
        >
          Details
        </label>
        <textarea
          id={bodyId}
          value={body}
          onChange={(e) => { setBody(e.target.value); setErrors((prev) => ({ ...prev, body: undefined })); }}
          placeholder={t(locale, "citizen.grievance.placeholder")}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: "var(--bg-secondary)", border: `1px solid ${errors.body ? "var(--accent-danger)" : "var(--border-subtle)"}`, color: "var(--text-primary)" }}
          aria-invalid={!!errors.body}
          aria-describedby={errors.body ? `${bodyId}-err` : undefined}
        />
        <div className="flex justify-between mt-1">
          {errors.body
            ? <p id={`${bodyId}-err`} className="text-xs flex items-center gap-1" style={{ color: "var(--accent-danger)" }} role="alert">
              <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />{errors.body}
            </p>
            : <span />
          }
          <span className="text-xs tabular-nums ml-auto" style={{ color: "var(--text-muted)" }}>
            {body.length}/500
          </span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || isSuccess}
        className="btn-primary w-full justify-center transition-all"
        style={{
          background: isSuccess ? "var(--accent-success)" : "var(--accent-warning)",
          opacity: isSubmitting ? 0.7 : 1,
        }}
        aria-busy={isSubmitting}
      >
        <MessageSquare className="w-4 h-4" aria-hidden="true" />
        {isSuccess ? "Submitted ✓" : isSubmitting ? "Anchoring on-chain…" : t(locale, "citizen.grievance.submit")}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CitizenDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrace, setShowTrace] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  const searchId = useId();

  const toggleLocale = useCallback(() => setLocale((l) => (l === "en" ? "hi" : "en")), []);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) setShowTrace(true);
  }, [searchQuery]);

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSearch(); },
    [handleSearch]
  );

  const clearSearch = useCallback(() => { setSearchQuery(""); setShowTrace(false); }, []);

  // Live-filter scheme table as user types
  const visibleSchemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SCHEMES;
    return SCHEMES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.ministry.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t(locale, "citizen.title")}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t(locale, "citizen.subtitle")}
          </p>
        </div>
        <button
          onClick={toggleLocale}
          className="btn-secondary text-sm flex items-center gap-2"
          style={{ borderColor: "var(--accent-secondary)", color: "var(--accent-secondary)" }}
          aria-label={`Switch language to ${locale === "en" ? "Hindi" : "English"}`}
        >
          <Globe className="w-4 h-4" aria-hidden="true" />
          {t(locale, "lang.switch")}
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" style={{ color: "var(--accent-success)" }} aria-hidden="true" />
          {t(locale, "citizen.search.title")}
        </h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
              aria-hidden="true"
            />
            <label htmlFor={searchId} className="sr-only">
              {t(locale, "citizen.search.placeholder")}
            </label>
            <input
              id={searchId}
              type="search"
              placeholder={t(locale, "citizen.search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              className="w-full pl-11 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-success)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="btn-primary"
            style={{ background: "var(--accent-success)" }}
          >
            {t(locale, "citizen.search.button")}
          </button>
        </div>
      </div>

      {/* Fund Trace — animated mount/unmount */}
      <AnimatePresence>
        {showTrace && (
          <FundTraceTimeline
            steps={FUND_TRACE}
            locale={locale}
            onClose={() => setShowTrace(false)}
          />
        )}
      </AnimatePresence>

      {/* Benefits + Grievance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section className="glass-card p-0 overflow-hidden" aria-label="My benefits">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Fingerprint className="w-4 h-4" style={{ color: "var(--accent-success)" }} aria-hidden="true" />
              {t(locale, "citizen.benefits.title")}
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t(locale, "citizen.benefits.verified")}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {MY_BENEFITS.map((b) => (
              <BenefitRow key={`${b.scheme}-${b.installment}`} benefit={b} />
            ))}
          </div>
        </section>

        <section className="glass-card p-6" aria-label="File a grievance">
          <h2 className="font-bold text-sm flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: "var(--accent-warning)" }} aria-hidden="true" />
            {t(locale, "citizen.grievance.title")}
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            {t(locale, "citizen.grievance.description")}
          </p>
          <GrievanceForm locale={locale} />
        </section>
      </div>

      {/* Scheme Browser */}
      <section className="glass-card p-0 overflow-hidden" aria-label="Scheme browser">
        <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} aria-hidden="true" />
            {t(locale, "citizen.schemes.title")}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th scope="col">Scheme</th>
                <th scope="col">Ministry</th>
                <th scope="col">Sanctioned Budget</th>
                <th scope="col">Beneficiaries</th>
                <th scope="col">Disbursed</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleSchemes.length > 0 ? (
                visibleSchemes.map((s) => (
                  <tr key={s.name}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.ministry}</td>
                    <td className="tabular-nums">{s.budget}</td>
                    <td className="tabular-nums">{s.beneficiaries}</td>
                    <td>
                      <SchemeProgressBar pct={s.disbursedPct} />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSearchQuery(s.name);
                          setShowTrace(true);
                        }}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: "var(--accent-success)" }}
                        aria-label={`Trace fund flow for ${s.name}`}
                      >
                        {t(locale, "citizen.schemes.trace")}
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    No schemes match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}