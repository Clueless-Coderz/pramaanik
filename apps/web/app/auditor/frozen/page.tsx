"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Snowflake,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  CheckCheck,
  ExternalLink,
} from "lucide-react";

import { useChainData, type FrozenAsset, type FreezeStatus } from "../../lib/useChainData";

// ─── Data sourced from useChainData (seeded via SeedDemo.s.sol) ────────────────


const STATUS_BADGE: Record<FreezeStatus, string> = {
  Frozen: "badge-frozen",
  "Under Review": "badge-pending",
  Released: "badge-active",
};

const STATUS_COLOR: Record<FreezeStatus, string> = {
  Frozen: "var(--accent-primary)",
  "Under Review": "var(--accent-warning)",
  Released: "var(--accent-success)",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <span className="stat-label">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="stat-value" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={handleCopy}
      aria-label="Copy to clipboard"
      title="Copy TX ID"
      className="p-1 rounded transition-colors"
      style={{ color: copied ? "var(--accent-success)" : "var(--text-muted)" }}
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ListCard({
  asset,
  active,
  onClick,
}: {
  asset: FrozenAsset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-4 text-left w-full transition-all"
      style={{
        borderColor: active ? "var(--accent-primary)" : "var(--border-subtle)",
        boxShadow: active ? "0 0 0 1px var(--accent-primary)" : undefined,
      }}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-mono text-xs font-semibold"
          style={{ color: "var(--accent-primary)" }}
        >
          {asset.id}
        </span>
        <span className={`badge ${STATUS_BADGE[asset.status]}`}>{asset.status}</span>
      </div>
      <div className="font-semibold text-sm mb-1">{asset.scheme}</div>
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="font-mono">{asset.amount}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {asset.daysLocked}d locked
        </span>
      </div>
    </motion.button>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,14,26,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: confirmColor }} />
          <h2 className="font-bold">{title}</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          {body}
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn-primary text-sm"
            style={{ background: confirmColor, borderColor: confirmColor }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrozenAssetsPage() {
  const { frozen: FROZEN } = useChainData();
  const [assets, setAssets] = useState<FrozenAsset[]>(FROZEN);
  const [selectedId, setSelectedId] = useState(FROZEN[0]?.id || "");
  const [dialog, setDialog] = useState<"release" | "extend" | null>(null);

  const selected = assets.find((a) => a.id === selectedId) ?? assets[0];

  const totalLocked = useMemo(
    () => assets.filter((a) => a.status !== "Released").reduce((s, a) => s + a.amountRaw, 0),
    [assets]
  );
  const avgDays = useMemo(
    () => assets.reduce((s, a) => s + a.daysLocked, 0) / assets.length,
    [assets]
  );

  function handleRelease() {
    setAssets((prev) =>
      prev.map((a) => (a.id === selectedId ? { ...a, status: "Released" as FreezeStatus } : a))
    );
    setDialog(null);
  }

  function handleExtend() {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === selectedId ? { ...a, daysLocked: a.daysLocked + 7, status: "Under Review" as FreezeStatus } : a
      )
    );
    setDialog(null);
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Frozen Disbursements</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Funds held under auditor lock · Cannot leave Treasury until released
          </p>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Frozen Items"
          value={String(assets.filter((a) => a.status !== "Released").length)}
          sub={`${assets.length} total`}
          icon={Snowflake}
          color="var(--accent-primary)"
        />
        <StatCard
          label="Total Value Locked"
          value={`₹${(totalLocked / 100000).toFixed(2)}L`}
          sub="pending investigation"
          icon={IndianRupee}
          color="var(--accent-warning)"
        />
        <StatCard
          label="Avg. Hold Time"
          value={`${avgDays.toFixed(1)} days`}
          sub="across all holds"
          icon={Clock}
          color="var(--accent-secondary)"
        />
      </div>

      {/* ── Master / Detail ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {assets.map((asset, i) => (
            <motion.div key={asset.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <ListCard
                asset={asset}
                active={selectedId === asset.id}
                onClick={() => setSelectedId(asset.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="glass-card p-6"
            >
              {/* Detail header */}
              <div className="flex items-start justify-between mb-5 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${STATUS_COLOR[selected.status]}18`,
                      border: `1px solid ${STATUS_COLOR[selected.status]}33`,
                    }}
                  >
                    {selected.status === "Released" ? (
                      <Unlock className="w-5 h-5" style={{ color: STATUS_COLOR[selected.status] }} />
                    ) : (
                      <Lock className="w-5 h-5" style={{ color: STATUS_COLOR[selected.status] }} />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-base">{selected.id}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Frozen {selected.frozenAt}
                    </div>
                  </div>
                </div>
                <span className={`badge shrink-0 ${STATUS_BADGE[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Scheme", value: selected.scheme, mono: false },
                  { label: "Locked Amount", value: selected.amount, mono: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-lg"
                    style={{ background: "rgba(99,102,241,0.04)" }}
                  >
                    <div
                      className="text-xs uppercase tracking-wider mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.label}
                    </div>
                    <div className={`font-semibold text-sm ${item.mono ? "font-mono" : ""}`}>
                      {item.value}
                    </div>
                  </div>
                ))}

                {/* TX ID — full width */}
                <div
                  className="p-3 rounded-lg col-span-2"
                  style={{ background: "rgba(99,102,241,0.04)" }}
                >
                  <div
                    className="text-xs uppercase tracking-wider mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Disbursement TX
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs break-all flex-1">
                      {selected.txId}
                    </span>
                    <CopyButton text={selected.txId} />
                    <a
                      href="#"
                      title="View on explorer"
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-5">
                <div
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Freeze Reason
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selected.reason}
                </p>
                <div
                  className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>
                    Linked flag:{" "}
                    <span
                      className="font-mono font-semibold"
                      style={{ color: "var(--accent-danger)" }}
                    >
                      {selected.flag}
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    Frozen by{" "}
                    <span className="font-mono">{selected.frozenBy}</span>
                  </span>
                  <span>·</span>
                  <span>
                    Held{" "}
                    <span style={{ color: "var(--text-secondary)" }}>
                      {selected.daysLocked}d
                    </span>
                  </span>
                </div>
              </div>

              {/* Actions */}
              {selected.status !== "Released" ? (
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-sm flex-1"
                    onClick={() => setDialog("release")}
                  >
                    <Unlock className="w-4 h-4" /> Release Funds
                  </button>
                  <button
                    className="btn-secondary text-sm flex-1"
                    onClick={() => setDialog("extend")}
                  >
                    <Clock className="w-4 h-4" /> Extend Hold (+7d)
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "var(--accent-success)",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Funds have been released from hold.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Confirm dialogs ──────────────────────────────────────────── */}
      <AnimatePresence>
        {dialog === "release" && (
          <ConfirmDialog
            title="Release Funds?"
            body={`This will call AnomalyOracle.release() for ${selected.id} and unfreeze ${selected.amount}. This action is irreversible.`}
            confirmLabel="Confirm Release"
            confirmColor="var(--accent-success)"
            onConfirm={handleRelease}
            onCancel={() => setDialog(null)}
          />
        )}
        {dialog === "extend" && (
          <ConfirmDialog
            title="Extend Hold Period?"
            body={`This will extend the freeze on ${selected.id} by 7 days and move it to Under Review status.`}
            confirmLabel="Extend Hold"
            confirmColor="var(--accent-warning)"
            onConfirm={handleExtend}
            onCancel={() => setDialog(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}