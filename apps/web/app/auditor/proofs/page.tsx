"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Microscope,
  ShieldCheck,
  ShieldX,
  Brain,
  Network,
  Copy,
  CheckCheck,
  Lock,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineStatus = "done" | "active" | "pending";
type VerifyState = "idle" | "verifying" | "success" | "fail";

interface PipelineStage {
  stage: string;
  status: PipelineStatus;
}

interface PublicInput {
  label: string;
  value: string;
}

interface Proof {
  flag: string;
  type: string;
  scheme: string;
  proofPayload: string;
  verifierContract: string;
  publicInputs: PublicInput[];
  pipeline: PipelineStage[];
  motif: string;
  model: string;
}

// ─── Mock proofs ──────────────────────────────────────────────────────────────

const PROOFS: Record<string, Proof> = {
  "FLAG-001": {
    flag: "FLAG-001",
    type: "Split Contract Pattern",
    scheme: "MGNREGA FY2025-26 Bihar-Q1",
    proofPayload:
      "0x7c2fa3d1b4e5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1" +
      "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    verifierContract: "0xAnomalyOracle.verifier",
    publicInputs: [
      { label: "Risk Score", value: "8500" },
      { label: "Disbursement Hash", value: "0x7c2f…a3d1" },
      { label: "Model Commitment", value: "0xRGCN…v23" },
      { label: "Anomaly Class", value: "THRESHOLD_AVOIDANCE" },
    ],
    pipeline: [
      { stage: "Input", status: "done" },
      { stage: "ZK-Gen", status: "done" },
      { stage: "Attest", status: "done" },
      { stage: "Finalize", status: "done" },
    ],
    motif: "Treasury → [3 Linked Vendors] (5x ₹49.8L)",
    model: "RGCN v2.3 (PyG → EZKL → Halo2)",
  },
  "FLAG-002": {
    flag: "FLAG-002",
    type: "Ghost Beneficiary",
    scheme: "PM-KISAN FY2025-26 Installment-19",
    proofPayload:
      "0x1a9eb7f4c2d3e5f6a7b8c9d0e1f2a3b48a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2" +
      "e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0",
    verifierContract: "0xAnomalyOracle.verifier",
    publicInputs: [
      { label: "Risk Score", value: "9800" },
      { label: "Disbursement Hash", value: "0xcb7e…f8c6" },
      { label: "Model Commitment", value: "0xRGCN…v23" },
      { label: "Anomaly Class", value: "GHOST_BENEFICIARY" },
    ],
    pipeline: [
      { stage: "Input", status: "done" },
      { stage: "ZK-Gen", status: "done" },
      { stage: "Attest", status: "done" },
      { stage: "Finalize", status: "done" },
    ],
    motif: "Death Registry Match → Aadhaar: INACTIVE",
    model: "Multi-Source Oracle (Aadhaar + Civil Reg)",
  },
  "FLAG-003": {
    flag: "FLAG-003",
    type: "Multi-sig Pending",
    scheme: "Ayushman Bharat PMJAY FY2025-26 MP",
    proofPayload:
      "0x4b3c5e2f1a8d9c7b6e5f4d3c2b1a098761a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6" +
      "4b3c5e2f1a8d9c7b6e5f4d3c2b1a098761a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
    verifierContract: "0xAnomalyOracle.verifier",
    publicInputs: [
      { label: "Risk Score", value: "5400" },
      { label: "Disbursement Hash", value: "0xdc8f…a9d7" },
      { label: "Policy Limit", value: "₹50 Cr Dual-Sign" },
      { label: "Status", value: "PENDING_CO_APPROVAL" },
    ],
    pipeline: [
      { stage: "Input", status: "done" },
      { stage: "ZK-Gen", status: "done" },
      { stage: "Attest", status: "done" },
      { stage: "Finalize", status: "active" },
    ],
    motif: "NHA Signer = OK → SHA Signer = PENDING",
    model: "Multisig Policy Verifier",
  },
};

const FALLBACK_PROOF = PROOFS["FLAG-001"];

// ─── Sub-components ───────────────────────────────────────────────────────────

const PIPE_COLOR: Record<PipelineStatus, string> = {
  done: "var(--accent-primary)",
  active: "var(--accent-secondary)",
  pending: "rgba(255,255,255,0.08)",
};

function PipelineDiagram({ stages }: { stages: PipelineStage[] }) {
  return (
    <div>
      {/* Node row */}
      <div className="flex items-center mb-3">
        {stages.map((p, idx) => (
          <div
            key={p.stage}
            className="flex items-center"
            style={{ flex: idx === stages.length - 1 ? "0" : "1" }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 shrink-0 transition-all"
              style={{
                borderColor: PIPE_COLOR[p.status],
                background:
                  p.status === "done"
                    ? PIPE_COLOR[p.status]
                    : p.status === "active"
                      ? `${PIPE_COLOR[p.status]}33`
                      : PIPE_COLOR[p.status],
                boxShadow:
                  p.status === "active"
                    ? `0 0 8px ${PIPE_COLOR[p.status]}`
                    : undefined,
              }}
              aria-label={`${p.stage}: ${p.status}`}
            />
            {idx < stages.length - 1 && (
              <div
                className="flex-1 h-px mx-1"
                style={{
                  background:
                    stages[idx + 1].status !== "pending"
                      ? "var(--accent-primary)"
                      : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Label row */}
      <div className="flex items-center">
        {stages.map((p, idx) => (
          <div
            key={p.stage}
            className="text-xs font-medium"
            style={{
              flex: idx === stages.length - 1 ? "0" : "1",
              color: PIPE_COLOR[p.status],
              minWidth: idx === stages.length - 1 ? "auto" : undefined,
            }}
          >
            {p.stage}
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors shrink-0"
      style={{
        background: "rgba(99,102,241,0.1)",
        border: "1px solid var(--border-subtle)",
        color: copied ? "var(--accent-success)" : "var(--accent-primary)",
      }}
    >
      {copied ? (
        <><CheckCheck className="w-3 h-3" /> Copied</>
      ) : (
        <><Copy className="w-3 h-3" /> {label}</>
      )}
    </button>
  );
}

function VerifyResult({ state }: { state: VerifyState }) {
  if (state === "idle") return null;
  if (state === "verifying") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-3 rounded-lg flex items-center gap-3 text-sm"
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <Loader2
          className="w-4 h-4 animate-spin shrink-0"
          style={{ color: "var(--accent-secondary)" }}
        />
        <span style={{ color: "var(--text-secondary)" }}>
          Calling verifier contract on-chain…
        </span>
      </motion.div>
    );
  }
  if (state === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-lg flex items-start gap-3"
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
        }}
        role="status"
        aria-live="polite"
      >
        <ShieldCheck
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: "var(--accent-success)" }}
        />
        <div className="text-xs">
          <div className="font-semibold mb-1" style={{ color: "var(--accent-success)" }}>
            Proof valid · Verifier returned true
          </div>
          <div style={{ color: "var(--text-secondary)" }}>
            All public inputs match the committed model. The anomaly flag was
            generated by an attested GNN run; the underlying graph data remains
            private.
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg flex items-start gap-3"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.3)",
      }}
      role="alert"
      aria-live="assertive"
    >
      <ShieldX
        className="w-5 h-5 shrink-0 mt-0.5"
        style={{ color: "var(--accent-danger)" }}
      />
      <div className="text-xs">
        <div className="font-semibold mb-1" style={{ color: "var(--accent-danger)" }}>
          Proof invalid · Verifier returned false
        </div>
        <div style={{ color: "var(--text-secondary)" }}>
          The proof payload did not pass on-chain verification. This may
          indicate tampering or a stale proof.
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ProofVerifierContent() {
  const searchParams = useSearchParams();
  const flagId = searchParams.get("flag") ?? "FLAG-001";
  const proof = PROOFS[flagId] ?? FALLBACK_PROOF;

  const [verifyState, setVerifyState] = useState<VerifyState>("idle");

  async function handleVerify() {
    setVerifyState("verifying");
    // Simulate on-chain call latency
    await new Promise((r) => setTimeout(r, 1400));
    setVerifyState("success");
  }

  const allPipelineDone = proof.pipeline.every((p) => p.status === "done");

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/auditor/flags"
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Flags
            </Link>
            <span style={{ color: "var(--border-subtle)" }}>/</span>
            <span
              className="font-mono text-xs font-semibold"
              style={{ color: "var(--accent-primary)" }}
            >
              {proof.flag}
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-1">zk-SNARK Proof Verifier</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Validate proof authenticity for{" "}
            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
              {proof.type}
            </span>{" "}
            on{" "}
            <span style={{ color: "var(--text-secondary)" }}>{proof.scheme}</span>{" "}
            without revealing the underlying graph data.
          </p>
        </div>

        {allPipelineDone && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs shrink-0"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "var(--accent-success)",
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            All pipeline stages complete
          </div>
        )}
      </div>

      {/* ── Row 1: Payload + Public Inputs ──────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* Proof payload */}
        <div className="col-span-12 lg:col-span-7 glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              Proof Payload (hex)
            </h3>
            <CopyButton text={proof.proofPayload} />
          </div>

          <div
            className="mono-pill text-xs leading-relaxed overflow-y-auto"
            style={{
              maxHeight: 120,
              padding: "12px 14px",
              wordBreak: "break-all",
            }}
          >
            {proof.proofPayload}
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={verifyState === "verifying"}
            className="btn-primary text-sm justify-center"
            style={{ opacity: verifyState === "verifying" ? 0.6 : 1 }}
          >
            {verifyState === "verifying" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying on-chain…</>
            ) : (
              <><Microscope className="w-4 h-4" /> Verify Authenticity</>
            )}
          </button>

          {/* Result */}
          <AnimatePresence mode="wait">
            {verifyState !== "idle" && <VerifyResult key={verifyState} state={verifyState} />}
          </AnimatePresence>
        </div>

        {/* Public inputs */}
        <div className="col-span-12 lg:col-span-5 glass-card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4">
            Public Inputs
          </h3>
          <div className="space-y-2.5">
            {proof.publicInputs.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between p-2.5 rounded-lg gap-3"
                style={{
                  background: "rgba(99,102,241,0.04)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  className="text-xs uppercase tracking-wider shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {p.label}
                </span>
                <span className="font-mono text-xs text-right break-all">{p.value}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-2"
            style={{
              background: "rgba(99,102,241,0.04)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <span>Verifier:</span>
            <span
              className="font-mono truncate ml-1"
              style={{ color: "var(--accent-primary)" }}
              title={proof.verifierContract}
            >
              {proof.verifierContract}
            </span>
            <CopyButton text={proof.verifierContract} label="Copy" />
          </div>
        </div>
      </div>

      {/* ── Row 2: Pipeline + Motif ──────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Pipeline */}
        <div className="col-span-12 lg:col-span-7 glass-card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-5">
            Verification Pipeline
          </h3>
          <PipelineDiagram stages={proof.pipeline} />

          {/* Stage legend */}
          <div
            className="mt-5 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {proof.pipeline.map((p) => (
              <div
                key={p.stage}
                className="p-2 rounded-lg text-center"
                style={{ background: "rgba(99,102,241,0.04)" }}
              >
                <div
                  className="text-xs font-semibold mb-0.5"
                  style={{ color: PIPE_COLOR[p.status] }}
                >
                  {p.stage}
                </div>
                <div
                  className="text-xs capitalize"
                  style={{ color: "var(--text-muted)" }}
                >
                  {p.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motif + Model */}
        <div className="col-span-12 lg:col-span-5 glass-card p-6 flex flex-col gap-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Network className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              Detected Motif
            </h3>
            <div
              className="mono-pill text-sm leading-relaxed"
              style={{ padding: "12px 14px" }}
            >
              {proof.motif}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              Model
            </h3>
            <div
              className="p-3 rounded-lg"
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span
                className="font-mono text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {proof.model}
              </span>
            </div>
            <p
              className="text-xs mt-2 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              The GNN was trained on-chain and its weights committed via a
              Halo2 circuit. Inference runs inside the EZKL prover, producing a
              zk-SNARK that attests the output without exposing the input graph.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProofVerifierPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: "var(--accent-secondary)" }}
          />
        </div>
      }
    >
      <ProofVerifierContent />
    </Suspense>
  );
}