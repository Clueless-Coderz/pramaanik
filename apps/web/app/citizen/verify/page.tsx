"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Network,
  Clipboard,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { useChainData } from "../../lib/useChainData";

const SAMPLE_DISBURSEMENT = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

const PIPELINE_STAGES = [
  { stage: "Input", desc: "Collect TX or Disbursement ID" },
  { stage: "ZK-Gen", desc: "Re-compute Merkle inclusion" },
  { stage: "Attest", desc: "Validate oracle attestations" },
  { stage: "Finalize", desc: "Match with anchored root" },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    text: "The disbursement is initiated on-chain and added to the state Merkle tree.",
  },
  {
    n: "02",
    text: "Oracles monitor the event and provide independent attestations of the fund transfer.",
  },
  {
    n: "03",
    text: "A zk-proof shows the transaction happened correctly without revealing recipient identity.",
  },
] as const;

type VerifyState = "idle" | "loading" | "success" | "error";

type VerifyResult = {
  block: string;
  pathLen: number;
  oracleHash: string;
  anchorChain: string;
  trustScore: number;
};

// ─── Sub-components ────────────────────────────────────────────────────────

function PipelineIndicator({ state }: { state: VerifyState }) {
  return (
    <div className="glass-card p-6">
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-4">
        Verification Pipeline
      </h4>
      <div className="flex items-center mb-3">
        {PIPELINE_STAGES.map((s, idx) => (
          <div
            key={s.stage}
            className="flex items-center"
            style={{
              flex: idx === PIPELINE_STAGES.length - 1 ? "0" : "1",
            }}
          >
            <div
              className={`pipe-node ${state === "success"
                  ? "done"
                  : state === "loading" && idx <= 1
                    ? "active"
                    : ""
                }`}
            />
            {idx < PIPELINE_STAGES.length - 1 && (
              <div
                className={`pipe-line ${state === "success" ? "done" : ""}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        {PIPELINE_STAGES.map((s) => (
          <div key={s.stage}>
            <div
              className="font-semibold uppercase tracking-wider mb-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.stage}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyResultPanel({ result }: { result: VerifyResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-12 gap-5 mb-6"
    >
      {/* Main result */}
      <div className="col-span-12 lg:col-span-7 glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 font-bold text-base">
            <CheckCircle2
              className="w-5 h-5"
              style={{ color: "var(--accent-success)" }}
              aria-hidden="true"
            />
            Verification Result: SUCCESS
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Block #{result.block}
          </span>
        </div>

        {/* Merkle path */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Merkle Inclusion Status
            </h4>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Path Length: {result.pathLen} Nodes
            </span>
          </div>
          <div className="flex items-center gap-2">
            {["LEAF NODE", "L1 HASH", "L2 HASH", "MERKLE ROOT"].map(
              (_, idx) => (
                <div
                  key={idx}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className={`pipe-node ${idx <= 1 ? "active" : "done"}`} />
                  {idx < 3 && <div className="pipe-line done" />}
                </div>
              )
            )}
          </div>
          <div
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            {["LEAF NODE", "L1 HASH", "L2 HASH", "MERKLE ROOT"].map(
              (label) => (
                <div key={label} className="flex-1 last:flex-none">
                  {label}
                </div>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div
              className="text-xs uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Oracle Attestation Hash
            </div>
            <div className="mono-pill text-xs break-all">{result.oracleHash}</div>
          </div>
          <div>
            <div
              className="text-xs uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Anchor Chain Link
            </div>
            <div className="mono-pill text-xs flex items-center justify-between gap-2">
              <span className="truncate">{result.anchorChain}</span>
              <ExternalLink
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "var(--accent-primary)" }}
                aria-label="View on-chain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="col-span-12 lg:col-span-5 space-y-5">
        <div className="glass-card p-6">
          <h4 className="font-bold text-sm mb-3">How it works</h4>
          <div className="space-y-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="flex gap-3">
                <span
                  className="font-mono font-bold text-sm flex-shrink-0"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {s.n}
                </span>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="glass-card p-6 flex items-center gap-5"
          style={{ background: "rgba(99,102,241,0.04)" }}
        >
          <div
            className="risk-gauge"
            style={
              {
                "--p": result.trustScore,
                "--c": "var(--accent-primary)",
              } as React.CSSProperties
            }
            aria-label={`Trust score: ${result.trustScore}%`}
          >
            <div className="text-center">
              <div
                className="font-bold text-lg leading-none"
                style={{ color: "var(--accent-primary)" }}
              >
                {result.trustScore}%
              </div>
            </div>
          </div>
          <div>
            <div
              className="text-xs uppercase tracking-wider font-semibold mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              Trust Score
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Confidence level based on multi-oracle consensus and cryptographic
              integrity checks.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TrackFundPage() {
  const { connected, stats } = useChainData();
  const [txInput, setTxInput] = useState("");
  const [proofInput, setProofInput] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const verify = useCallback(async () => {
    if (!txInput.trim()) {
      setVerifyState("error");
      return;
    }
    setVerifyState("loading");
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    setVerifyState("success");
    setResult({
      block: "18,294,011",
      pathLen: 12,
      oracleHash: "0x4f22ae192837bcde827361524388192039485721092837",
      anchorChain: "Besu-Mainnet-Explorer-0x88…",
      trustScore: 98,
    });
  }, [txInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") verify();
    },
    [verify]
  );

  function pasteSample() {
    setTxInput(SAMPLE_DISBURSEMENT);
    setVerifyState("idle");
    setResult(null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const handleZkVerify = useCallback(() => {
    if (!proofInput.trim()) return;
    // TODO: call AnomalyOracle.verifier(proof, publicInputs)
    console.log("Verifying ZK proof:", proofInput);
  }, [proofInput]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 uppercase tracking-tight">
            Citizen Verification Portal
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Verify public disbursements, audit oracle attestations, and validate
            zero-knowledge proofs directly against the Besu immutable ledger.
          </p>
        </div>
        <div
          className="glass-card p-4 min-w-[220px]"
          style={{ background: "rgba(99,102,241,0.04)" }}
        >
          <div
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            Network Status
            <span
              className="w-2 h-2 rounded-full status-pulse flex-shrink-0"
              style={{ background: connected ? "#10B981" : "#e7c365" }}
              aria-hidden="true"
            />
            <span className="font-mono normal-case">
              {connected ? "besu-main-01 live" : "p2p-mesh fallback active"}
            </span>
          </div>
          <div className="font-bold text-2xl mt-1">
            {(stats?.flaggedCount ?? 0).toLocaleString()}
          </div>
          <div
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            Proofs verified today
          </div>
        </div>
      </div>

      {/* Verifier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Disbursement verifier */}
        <div className="glass-card p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <ShieldCheck
                className="w-5 h-5"
                style={{ color: "var(--accent-primary)" }}
                aria-hidden="true"
              />
            </div>
            <h3 className="font-bold text-base">Verify Disbursement</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Enter a Disbursement ID to check Merkle inclusion and confirm
            receipt by the intended recipient.
          </p>
          <label
            htmlFor="tx-input"
            className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
            style={{ color: "var(--text-muted)" }}
          >
            Transaction or Disbursement ID
          </label>
          <div className="flex gap-2 mb-3">
            <input
              id="tx-input"
              value={txInput}
              onChange={(e) => {
                setTxInput(e.target.value);
                if (verifyState === "error") setVerifyState("idle");
              }}
              onKeyDown={handleKeyDown}
              className="input-base input-mono flex-1"
              placeholder="0x71C7656EC7ab88b098defB751B7401B5"
              aria-invalid={verifyState === "error"}
            />
            <button
              onClick={verify}
              disabled={verifyState === "loading"}
              className="btn-primary text-sm whitespace-nowrap"
              style={{ opacity: verifyState === "loading" ? 0.5 : 1 }}
              aria-busy={verifyState === "loading"}
            >
              {verifyState === "loading" ? "Verifying…" : "Verify"}
            </button>
          </div>
          <button
            onClick={pasteSample}
            className="text-xs flex items-center gap-1.5 mt-auto"
            style={{ color: "var(--text-muted)" }}
          >
            {copied ? (
              <ClipboardCheck className="w-3 h-3" />
            ) : (
              <Clipboard className="w-3 h-3" />
            )}
            Use sample disbursement ID
          </button>
        </div>

        {/* ZK verifier */}
        <div className="glass-card p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(6,182,212,0.1)",
                border: "1px solid rgba(6,182,212,0.3)",
              }}
            >
              <Network
                className="w-5 h-5"
                style={{ color: "var(--accent-secondary)" }}
                aria-hidden="true"
              />
            </div>
            <h3 className="font-bold text-base">zk-SNARK Verifier</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Validate proof authenticity without revealing sensitive underlying
            data. Paste the proof hash below.
          </p>
          <label
            htmlFor="proof-input"
            className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
            style={{ color: "var(--text-muted)" }}
          >
            Proof Payload (hex)
          </label>
          <textarea
            id="proof-input"
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            className="input-base input-mono mb-3"
            placeholder="Paste proof string…"
            rows={3}
          />
          <button
            className="btn-secondary text-sm w-full justify-center mt-auto"
            onClick={handleZkVerify}
            disabled={!proofInput.trim()}
            style={{ opacity: proofInput.trim() ? 1 : 0.5 }}
          >
            Verify Authenticity
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {verifyState === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--accent-danger)",
            }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Please enter a valid disbursement ID before verifying.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {verifyState === "success" && result && (
          <VerifyResultPanel result={result} />
        )}
      </AnimatePresence>

      {/* Pipeline */}
      <PipelineIndicator state={verifyState} />
    </div>
  );
}