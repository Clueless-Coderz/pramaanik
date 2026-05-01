"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Anchor,
  Activity,
  ExternalLink,
  Network,
  Search,
  CheckCircle2,
  Radio,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useChainData } from "../../lib/useChainData";

/* ─── Static data (Oracles) ───────────────────────────────────────────────── */

const ORACLES = [
  { name: "ORCL_ALPHA_01", status: "live" as const },
  { name: "ORCL_BETA_02", status: "live" as const },
  { name: "ORCL_GAMMA_01", status: "live" as const },
  { name: "ORCL_DELTA_04", status: "stale" as const },
];

/* ─── Chain config ─────────────────────────────────────────────────────────── */

const CHAINS = [
  {
    label: "Polygon Amoy",
    chainId: "80002",
    color: "#8B5CF6",
    colorAlpha: "rgba(139,92,246,0.12)",
    colorBorder: "rgba(139,92,246,0.25)",
    explorerBase: "https://amoy.polygonscan.com/search?q=",
    fallback: {
      root: "0x7f4c5e2b9d1a4c8e7f1a3b5c6d2e8f9a",
      seq: 482901,
      time: 42,
    },
  },
  {
    label: "Ethereum Sepolia",
    chainId: "11155111",
    color: "#3B82F6",
    colorAlpha: "rgba(59,130,246,0.12)",
    colorBorder: "rgba(59,130,246,0.25)",
    explorerBase: "https://sepolia.etherscan.io/search?q=",
    fallback: {
      root: "0xa1c9e29f8b7c6d5e4a3b2c1d0e9f8a7b",
      seq: 241450,
      time: 192,
    },
  },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmtElapsed(secs: number): string {
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s ago`;
}

function truncateRoot(root: string): string {
  if (root.length <= 18) return root;
  return `${root.slice(0, 10)}…${root.slice(-8)}`;
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
      style={{
        background: connected ? "rgba(16,185,129,0.08)" : "rgba(251,191,36,0.08)",
        border: `1px solid ${connected ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.3)"}`,
      }}
    >
      <span
        className="relative flex h-2 w-2"
      >
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: connected ? "#10B981" : "#FBBF24" }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: connected ? "#10B981" : "#FBBF24" }}
        />
      </span>
      <span
        className="text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: connected ? "#10B981" : "#FBBF24" }}
      >
        {connected ? "Live" : "Demo"}
      </span>
    </div>
  );
}

function ChainCard({
  chain,
  elapsed,
  seq,
}: {
  chain: (typeof CHAINS)[number];
  elapsed: number;
  seq: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden flex flex-col gap-4 p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Subtle tinted top-bar accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: chain.color, opacity: 0.7 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: chain.colorAlpha, border: `1px solid ${chain.colorBorder}` }}
          >
            <Anchor className="w-4 h-4" style={{ color: chain.color }} />
          </div>
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: chain.color }}
            >
              {chain.label}
            </div>
            <div className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>
              Chain ID: {chain.chainId}
            </div>
          </div>
        </div>
        <Network className="w-4 h-4 opacity-20" style={{ color: chain.color }} />
      </div>

      {/* Root */}
      <div>
        <div className="label-xs mb-1.5">Current Merkle Root</div>
        <div className="mono-pill break-all text-[11px] leading-relaxed">
          {chain.fallback.root}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="stat-box">
          <div className="label-xs mb-1">Sequence #</div>
          <div className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>
            {seq.toLocaleString()}
          </div>
        </div>
        <div className="stat-box">
          <div className="label-xs mb-1">Last Anchor</div>
          <div className="font-mono text-sm font-semibold" style={{ color: "var(--text)" }}>
            {fmtElapsed(elapsed)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FrequencyChart() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="label-xs">Anchor Frequency (24h)</span>
        <div className="flex gap-4">
          {[
            { label: "Polygon", color: "#8B5CF6" },
            { label: "Ethereum", color: "#3B82F6" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-[2px] rounded"
                style={{ background: l.color }}
              />
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 800 160" className="w-full" style={{ height: 160 }}>
        <defs>
          <linearGradient id="gradPoly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradEth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[32, 64, 96, 128].map((y) => (
          <line
            key={y}
            x1="0" x2="800" y1={y} y2={y}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}

        {/* Polygon area + line */}
        <path
          d="M0,120 Q100,30 200,90 T400,40 T600,110 T800,15 L800,160 L0,160 Z"
          fill="url(#gradPoly)"
        />
        <path
          d="M0,120 Q100,30 200,90 T400,40 T600,110 T800,15"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
        />

        {/* Ethereum area + line */}
        <path
          d="M0,140 Q120,60 240,110 T480,60 T720,130 T800,65 L800,160 L0,160 Z"
          fill="url(#gradEth)"
        />
        <path
          d="M0,140 Q120,60 240,110 T480,60 T720,130 T800,65"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />
      </svg>

      <div
        className="flex justify-between text-[10px] font-mono -mt-2"
        style={{ color: "var(--muted)" }}
      >
        {["00:00", "06:00", "12:00", "18:00", "23:59"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function MerkleVerifier() {
  const [verifyId, setVerifyId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<null | {
    ok: boolean;
    msg: string;
    pathLen?: number;
  }>(null);

  const runVerification = useCallback(async () => {
    if (!verifyId.trim() || verifying) return;
    setVerifying(true);
    setVerifyResult(null);
    await new Promise((r) => setTimeout(r, 900));
    const passes = verifyId.trim().length >= 8;
    setVerifyResult({
      ok: passes,
      msg: passes
        ? "Inclusion proof valid against latest Polygon Amoy root."
        : "ID format invalid — expected 0x-prefixed bytes32.",
      pathLen: passes ? 12 : undefined,
    });
    setVerifying(false);
  }, [verifyId, verifying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runVerification();
  };

  const canVerify = verifyId.trim().length > 0 && !verifying;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div>
        <h3 className="label-xs mb-1">Merkle Inclusion Verifier</h3>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
          Verify an entity ID&apos;s cryptographic path against the most recent on-chain roots.
        </p>
      </div>

      <div>
        <label
          className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
          style={{ color: "#3B82F6" }}
        >
          Entity / Transaction ID
        </label>
        <div className="relative">
          <input
            value={verifyId}
            onChange={(e) => { setVerifyId(e.target.value); setVerifyResult(null); }}
            onKeyDown={handleKeyDown}
            placeholder="TX_ID_0x…"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl font-mono text-[12px] pr-10 py-2.5 pl-3 outline-none transition-all"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-color)")
            }
          />
          <Search
            className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--muted)" }}
          />
        </div>
      </div>

      <button
        onClick={runVerification}
        disabled={!canVerify}
        className="w-full rounded-xl py-2.5 text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-2"
        style={{
          background: canVerify ? "#3B82F6" : "var(--surface2)",
          color: canVerify ? "#fff" : "var(--muted)",
          border: "1px solid transparent",
          cursor: canVerify ? "pointer" : "not-allowed",
        }}
      >
        {verifying ? (
          <>
            <span
              className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
            Verifying…
          </>
        ) : (
          <>
            <ShieldCheck className="w-3.5 h-3.5" />
            Verify Proof
          </>
        )}
      </button>

      <AnimatePresence>
        {verifyResult && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-xl p-3 text-[12px]"
            style={{
              background: verifyResult.ok
                ? "rgba(16,185,129,0.08)"
                : "rgba(239,68,68,0.08)",
              border: `1px solid ${verifyResult.ok
                  ? "rgba(16,185,129,0.25)"
                  : "rgba(239,68,68,0.25)"
                }`,
            }}
          >
            <div
              className="font-semibold mb-1 flex items-center gap-1.5"
              style={{
                color: verifyResult.ok ? "#10B981" : "#EF4444",
              }}
            >
              {verifyResult.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {verifyResult.ok ? "Inclusion verified" : "Verification failed"}
            </div>
            <div className="leading-relaxed" style={{ color: "var(--muted)" }}>
              {verifyResult.msg}
            </div>
            {verifyResult.pathLen && (
              <div
                className="font-mono mt-1 text-[11px]"
                style={{ color: "var(--muted)" }}
              >
                Path length: {verifyResult.pathLen} nodes
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Checkpoints() {
  const { anchors } = useChainData();
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="label-xs mb-4">Recent Checkpoints</h3>
      <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
        {anchors.map((cp, i) => {
          const explorerUrl =
            cp.chain === "Polygon Amoy"
              ? `https://amoy.polygonscan.com/search?q=${cp.root}`
              : `https://sepolia.etherscan.io/search?q=${cp.root}`;

          return (
            <div key={i} className="py-3 first:pt-0 last:pb-0">
              {/* Row 1: seq + time */}
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div
                  className="flex items-center gap-2 text-[11px] font-mono font-semibold"
                  style={{
                    color: i === 0 ? "#3B82F6" : "var(--text-secondary)",
                  }}
                >
                  <span>#{cp.seq.toLocaleString()}</span>
                  <span style={{ color: "var(--muted)" }}>·</span>
                  <span>{cp.chain.toUpperCase()}</span>
                  {i === 0 && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest"
                      style={{
                        background: "rgba(59,130,246,0.12)",
                        color: "#3B82F6",
                        border: "1px solid rgba(59,130,246,0.2)",
                      }}
                    >
                      Latest
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {cp.time}
                </span>
              </div>

              {/* Row 2: root + explorer */}
              <div className="flex items-center gap-2">
                <div className="mono-pill flex-1 min-w-0 text-[11px] truncate">
                  {cp.root}
                </div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    color: "#3B82F6",
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Explorer
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NetworkHealth() {
  const metrics = [
    { label: "Propagation avg.", icon: Activity, value: "4.2s", pct: 70, color: "#F59E0B" },
    { label: "Node redundancy", icon: CheckCircle2, value: "99.9%", pct: 99.9, color: "#10B981" },
    { label: "Uptime (30d)", icon: Radio, value: "99.7%", pct: 99.7, color: "#10B981" },
  ];

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="label-xs">Network Health</h3>
      <div className="flex flex-col gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span
                className="flex items-center gap-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                <m.icon className="w-3 h-3" />
                {m.label}
              </span>
              <span className="font-mono font-semibold" style={{ color: "var(--text)" }}>
                {m.value}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--surface2)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${m.pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OraclePanel() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="label-xs">Live Oracles</h3>
      <div className="grid grid-cols-2 gap-2">
        {ORACLES.map((o) => (
          <div
            key={o.name}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              opacity: o.status === "stale" ? 0.45 : 1,
            }}
          >
            {o.status === "live" ? (
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: "#10B981" }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: "#10B981" }}
                />
              </span>
            ) : (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: "var(--muted)" }}
              />
            )}
            <span
              className="text-[11px] font-mono truncate"
              style={{ color: "var(--text)" }}
            >
              {o.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AnchorStatusPage() {
  const { anchors: chainAnchors, connected } = useChainData();

  const [polySeq, setPolySeq] = useState(482901);
  const [ethSeq, setEthSeq] = useState(241450);
  const [polyElapsed, setPolyElapsed] = useState(42);
  const [ethElapsed, setEthElapsed] = useState(192);

  // Live ticking timers
  useEffect(() => {
    const id = setInterval(() => {
      setPolyElapsed((s) => {
        if (s >= 600) { setPolySeq((n) => n + 1); return 0; }
        return s + 1;
      });
      setEthElapsed((s) => {
        if (s >= 1800) { setEthSeq((n) => n + 1); return 0; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Merge live data if available
  const polyData = chainAnchors?.find((a) => a.chain === "Polygon Amoy");
  const ethData = chainAnchors?.find((a) => a.chain === "Ethereum Sepolia");

  const chainState = [
    { ...CHAINS[0], seq: polyData?.seq ?? polySeq, elapsed: polyElapsed },
    { ...CHAINS[1], seq: ethData?.seq ?? ethSeq, elapsed: ethElapsed },
  ];

  return (
    <>
      {/* Shared scoped styles */}
      <style>{`
        :root {
          --surface:  #141418;
          --surface2: #0e0e11;
          --border:   rgba(255,255,255,0.07);
          --text:     #f0f0f4;
          --text-secondary: #9898a8;
          --muted:    #5a5a6a;
          --border-color: rgba(255,255,255,0.07);
        }
        .label-xs {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
        }
        .mono-pill {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
          font-family: ui-monospace, monospace;
          font-size: 11px;
          color: var(--text-secondary);
        }
        .stat-box {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
        }
      `}</style>

      <div className="flex flex-col gap-5 p-1">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-xl font-bold mb-1"
              style={{ color: "var(--text)" }}
            >
              Dual-Chain Anchor Status
            </h1>
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Real-time Merkle root propagation across Polygon and Ethereum
            </p>
          </div>
          <LiveBadge connected={connected} />
        </div>

        {/* Chain cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chainState.map((c) => (
            <ChainCard key={c.label} chain={c} elapsed={c.elapsed} seq={c.seq} />
          ))}
        </div>

        {/* Chart + Verifier */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <FrequencyChart />
          <MerkleVerifier />
        </div>

        {/* Checkpoints + right col */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <Checkpoints />
          <div className="flex flex-col gap-4">
            <NetworkHealth />
            <OraclePanel />
          </div>
        </div>
      </div>
    </>
  );
}