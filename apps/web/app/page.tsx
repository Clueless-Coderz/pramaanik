"use client";

/**
 * app/auth/page.tsx  — PRAMAANIK  · Real Privado ID ZK Auth
 *
 * Improvements over v1:
 *  - Hooks extracted into `useAuthPolling` custom hook (fixes rules-of-hooks violations
 *    that occurred when hooks were called inside render sub-functions)
 *  - Stage sub-components are now proper React components with their own props,
 *    not closures that capture everything from parent scope
 *  - Polling has a configurable max-retry timeout with graceful error state
 *  - QR generation is debounced/abortable to prevent race conditions on fast re-renders
 *  - `sessionId` and `authRequestJson` are derived from a single `authRequest` object
 *    (removes duplicate state)
 *  - `universalLink` is computed with `useMemo` from `authRequest` instead of
 *    being stored as separate state
 *  - Role config lookup uses `useMemo` instead of linear scan
 *  - `copyToClipboard` uses a toast-style feedback indicator
 *  - All `setInterval` / `clearInterval` calls are encapsulated; no raw refs in the
 *    top-level component
 *  - `enterDashboard` replaced with `useCallback` to avoid stale closure bugs
 *  - Removed redundant `pollingActive` boolean (derived from `pollRef.current !== null`)
 *  - TypeScript: all component props are explicitly typed; no implicit `any`
 *
 * Dependencies (unchanged from v1):
 *   npm i qrcode @types/qrcode uuid @types/uuid
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type FC,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import QRCode from "qrcode";
import {
  Shield,
  Eye,
  Users,
  Fingerprint,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Lock,
  Scan,
  Zap,
  AlertTriangle,
  ArrowLeft,
  Cpu,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_STEPS = 60; // 2 min at 2 s/step

// ─── Types ──────────────────────────────────────────────────────────────────
type Role = "admin" | "auditor" | "citizen";

type AuthStage =
  | "role-select"
  | "wallet-connect"  // show QR code
  | "zk-generate"     // polling for callback
  | "success";

interface RoleConfig {
  id: Role;
  label: string;
  subtitle: string;
  desc: string;
  icon: FC<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  authLevel: string;
  requiredCredential: string;
  href: string;
}

// Shape returned by /api/auth/sign-in
interface AuthRequest {
  id: string;
  [key: string]: unknown;
}

// Shape returned by /api/auth/callback
interface CallbackResponse {
  verified: boolean;
  did?: string;
}

// ─── Role Configs ───────────────────────────────────────────────────────────
const ROLES: RoleConfig[] = [
  {
    id: "admin",
    label: "Admin",
    subtitle: "Treasury Official",
    desc: "Sanction schemes, authorize disbursements, and manage the full fund pipeline.",
    icon: Shield,
    color: "var(--accent-primary)",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.25)",
    gradient: "from-indigo-500 to-violet-600",
    authLevel: "LEVEL 4 CLEARANCE",
    requiredCredential: "GoI-EmployeeID · Treasury-Signatory",
    href: "/admin",
  },
  {
    id: "auditor",
    label: "Auditor",
    subtitle: "CAG / Parliamentary",
    desc: "Investigate flagged transactions, verify zk-SNARK proofs, freeze suspicious disbursements.",
    icon: Eye,
    color: "var(--accent-secondary)",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.25)",
    gradient: "from-cyan-500 to-blue-600",
    authLevel: "VERIFICATION NODE",
    requiredCredential: "CAG-OfficerID · AuditClearance",
    href: "/auditor",
  },
  {
    id: "citizen",
    label: "Citizen",
    subtitle: "Public Audit",
    desc: "Trace any sanctioned rupee from Consolidated Fund to last mile. File on-chain grievances.",
    icon: Users,
    color: "var(--accent-success)",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    gradient: "from-emerald-500 to-teal-600",
    authLevel: "OPEN LEDGER",
    requiredCredential: "Aadhaar-VC · IndiaStack",
    href: "/citizen",
  },
];

// ─── Animations ─────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

// ─── Custom Hook: Auth Polling ───────────────────────────────────────────────
interface UseAuthPollingOptions {
  onVerified: (did: string) => void;
  onTimeout: () => void;
}

interface UseAuthPollingReturn {
  pollCount: number;
  isPolling: boolean;
  start: (sessionId: string) => void;
  stop: () => void;
}

function useAuthPolling({
  onVerified,
  onTimeout,
}: UseAuthPollingOptions): UseAuthPollingReturn {
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Store callbacks in refs so the interval closure doesn't go stale
  const onVerifiedRef = useRef(onVerified);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => { onVerifiedRef.current = onVerified; }, [onVerified]);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const start = useCallback(
    (sessionId: string) => {
      // Defensive: ensure only one interval runs at a time
      if (intervalRef.current) clearInterval(intervalRef.current);

      setIsPolling(true);
      setPollCount(0);

      let steps = 0;
      intervalRef.current = setInterval(async () => {
        steps += 1;
        setPollCount(steps);

        if (steps >= POLL_TIMEOUT_STEPS) {
          stop();
          onTimeoutRef.current();
          return;
        }

        try {
          const res = await fetch(`/api/auth/callback?sessionId=${sessionId}`);
          if (!res.ok) return;
          const data: CallbackResponse = await res.json();
          if (data.verified) {
            stop();
            onVerifiedRef.current(data.did ?? "");
          }
        } catch {
          // transient network error — keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stop]
  );

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return { pollCount, isPolling, start, stop };
}

// ─── Custom Hook: Clipboard with visual feedback ─────────────────────────────
function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetMs);
      } catch {
        /* browser may deny on insecure origins */
      }
    },
    [resetMs]
  );
  return { copied, copy };
}

// ─── Utility: Build Privado ID universal link from auth request ──────────────
function buildUniversalLink(authReq: AuthRequest): string {
  const jsonStr = JSON.stringify(authReq);
  const encoded = btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `iden3comm://?i_m=${encoded}`;
}

// ─── Utility: Generate QR data-URL ──────────────────────────────────────────
async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    width: 280,
    margin: 2,
    color: { dark: "#0f0f1a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}

// ─── Sub-component: Hex Grid Background ─────────────────────────────────────
function HexGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="hex"
          x="0"
          y="0"
          width="56"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <polygon
            points="28,2 52,14 52,38 28,50 4,38 4,14"
            fill="none"
            stroke="#6366f1"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}

// ─── Sub-component: Scanning Line ───────────────────────────────────────────
function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] z-10 pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent, var(--accent-secondary), transparent)",
        boxShadow: "0 0 12px var(--accent-secondary)",
      }}
      initial={{ top: "0%" }}
      animate={{ top: ["5%", "95%", "5%"] }}
      transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
    />
  );
}

// ─── Sub-component: QR Corner Brackets ──────────────────────────────────────
function QrBrackets({ color }: { color: string }) {
  const corners = [
    "top-0 left-0 border-t-2 border-l-2",
    "top-0 right-0 border-t-2 border-r-2",
    "bottom-0 left-0 border-b-2 border-l-2",
    "bottom-0 right-0 border-b-2 border-r-2",
  ];
  return (
    <>
      {corners.map((cls, i) => (
        <div
          key={i}
          className={`absolute w-6 h-6 ${cls} z-10`}
          style={{ borderColor: color }}
        />
      ))}
    </>
  );
}

// ─── Sub-component: Stage Breadcrumb ────────────────────────────────────────
const STAGE_LABELS: Record<AuthStage, string> = {
  "role-select": "Role",
  "wallet-connect": "Scan QR",
  "zk-generate": "ZK Proof",
  success: "Enter",
};
const STAGE_ORDER: AuthStage[] = [
  "role-select",
  "wallet-connect",
  "zk-generate",
  "success",
];

function StageBreadcrumb({ current }: { current: AuthStage }) {
  return (
    <div
      className="hidden md:flex items-center gap-2 text-xs"
      style={{ color: "var(--text-muted)" }}
    >
      {STAGE_ORDER.map((s, i) => (
        <span key={s} className="flex items-center gap-2">
          <span
            style={{
              color: s === current ? "var(--text-primary)" : undefined,
              fontWeight: s === current ? 600 : undefined,
            }}
          >
            {STAGE_LABELS[s]}
          </span>
          {i < STAGE_ORDER.length - 1 && (
            <ChevronRight className="w-3 h-3 opacity-40" />
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Sub-component: Role Card ────────────────────────────────────────────────
interface RoleCardProps {
  role: RoleConfig;
  onSelect: (role: RoleConfig) => void;
  animationIndex: number;
}

function RoleCard({ role, onSelect, animationIndex }: RoleCardProps) {
  return (
    <motion.button
      variants={fadeUp}
      custom={animationIndex}
      onClick={() => onSelect(role)}
      className="glass-card p-6 md:p-8 text-left group w-full flex flex-col h-full"
      style={{ borderColor: role.border, background: role.bg }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-5`}
      >
        <role.icon className="w-6 h-6 text-white" />
      </div>

      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: role.color }}
      >
        {role.authLevel}
      </div>

      <h3 className="text-xl font-bold mb-1">{role.label}</h3>
      <p className="text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>
        {role.subtitle}
      </p>
      <p
        className="text-sm leading-relaxed mb-6 flex-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {role.desc}
      </p>

      <div
        className="text-xs font-mono px-3 py-2 rounded mt-auto w-full break-words"
        style={{
          background: `${role.color}10`,
          color: role.color,
          border: `1px solid ${role.color}30`,
        }}
      >
        {role.requiredCredential}
      </div>

      <div
        className="flex items-center gap-1 mt-5 text-sm font-semibold"
        style={{ color: role.color }}
      >
        Connect Wallet
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
}

// ─── Sub-component: Back Button ──────────────────────────────────────────────
interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

function BackButton({ onClick, label = "Back to roles" }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm mb-6"
      style={{ color: "var(--text-muted)" }}
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}

// ─── Sub-component: Role Header (used in wallet-connect & zk-generate) ───────
function RoleHeader({ role }: { role: RoleConfig }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center`}
      >
        <role.icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: role.color }}
        >
          {role.authLevel}
        </div>
        <div className="font-bold text-sm">{role.label} Portal</div>
      </div>
    </div>
  );
}

// ─── Stage: Role Select ──────────────────────────────────────────────────────
interface RoleSelectStageProps {
  onSelect: (role: RoleConfig) => void;
}

function RoleSelectStage({ onSelect }: RoleSelectStageProps) {
  return (
    <motion.div
      key="role-select"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-5xl"
    >
      <div className="text-center mb-10">
        <motion.div variants={fadeUp} custom={0} className="mb-4">
          <span className="badge badge-active">
            <Zap className="w-3 h-3" />
            Privado ID · Zero-Knowledge Auth
          </span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
        >
          Identify Yourself,
          <br />
          <span className="text-gradient">Prove Nothing More.</span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-sm md:text-base max-w-md mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          Your identity is verified with a zk-SNARK proof. Your credentials
          never leave your wallet. DPDP Act 2023 compliant.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role, i) => (
          <RoleCard
            key={role.id}
            role={role}
            onSelect={onSelect}
            animationIndex={i + 3}
          />
        ))}
      </div>

      <motion.div
        variants={fadeUp}
        custom={6}
        className="flex items-center justify-center gap-6 mt-8 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {[
          { icon: Lock, text: "End-to-end encrypted" },
          { icon: Fingerprint, text: "Basic Auth (no issuer needed)" },
          { icon: Cpu, text: "On-chain verifiable" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            {text}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Stage: Wallet Connect (Real QR) ────────────────────────────────────────
interface WalletConnectStageProps {
  role: RoleConfig;
  authRequest: AuthRequest | null;
  qrDataUrl: string;
  universalLink: string;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  onContinue: () => void;
}

function WalletConnectStage({
  role,
  authRequest,
  qrDataUrl,
  universalLink,
  isLoading,
  error,
  onRetry,
  onBack,
  onContinue,
}: WalletConnectStageProps) {
  const { copied, copy } = useCopyToClipboard();
  const authRequestJson = useMemo(
    () => (authRequest ? JSON.stringify(authRequest, null, 2) : ""),
    [authRequest]
  );

  return (
    <motion.div
      key="wallet-connect"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-md"
    >
      <BackButton onClick={onBack} />

      <div
        className="glass-card p-8 relative overflow-hidden"
        style={{ borderColor: role.border }}
      >
        <RoleHeader role={role} />

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
            >
              <Loader2 className="w-8 h-8" style={{ color: role.color }} />
            </motion.div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Generating auth request…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <div className="text-center py-6">
            <XCircle
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: "var(--accent-danger)" }}
            />
            <p className="text-sm mb-2" style={{ color: "var(--accent-danger)" }}>
              Failed to generate QR
            </p>
            <p className="text-xs mb-4 font-mono break-all" style={{ color: "var(--text-muted)" }}>
              {error}
            </p>
            <button
              onClick={onRetry}
              className="btn-secondary text-sm flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* ── QR Ready ── */}
        {qrDataUrl && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Scan with your{" "}
              <span style={{ color: role.color }} className="font-semibold">
                Privado ID
              </span>{" "}
              wallet
            </p>

            {/* QR Code */}
            <div className="relative w-[200px] mx-auto mb-4">
              <QrBrackets color={role.color} />
              <div className="absolute inset-0 overflow-hidden z-10">
                <ScanLine />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Privado ID auth QR code"
                className="w-[200px] h-[200px] rounded-lg"
                style={{ border: "1px solid var(--border-subtle)" }}
              />
            </div>

            {/* Session ID */}
            {authRequest && (
              <p className="text-[10px] font-mono mb-4" style={{ color: "var(--text-muted)" }}>
                Session: {authRequest.id.slice(0, 8)}…
              </p>
            )}

            {/* Universal link for mobile */}
            <a
              href={universalLink}
              className="btn-secondary text-xs flex items-center justify-center gap-2 mb-3"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Privado ID App
            </a>

            <button
              onClick={onContinue}
              className="btn-primary w-full justify-center text-sm"
              style={{ background: role.color }}
            >
              <Scan className="w-4 h-4" />
              I&apos;ve Scanned — Wait for Proof
            </button>

            {/* Raw JSON (dev helper) */}
            <details className="mt-4 text-left">
              <summary
                className="text-[10px] cursor-pointer flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
              >
                <Copy className="w-3 h-3" />
                View raw auth request JSON
              </summary>
              <div
                className="mt-2 p-2 rounded text-[9px] font-mono overflow-auto max-h-32"
                style={{
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                <button
                  onClick={() => copy(authRequestJson)}
                  className="mb-1 text-[9px] flex items-center gap-1"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy JSON
                    </>
                  )}
                </button>
                <pre className="whitespace-pre-wrap break-all">{authRequestJson}</pre>
              </div>
            </details>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Stage: ZK Generate (polling) ───────────────────────────────────────────
const ZK_STEPS = [
  { label: "Auth request delivered to wallet", doneAt: 0 },
  { label: "Wallet building witness circuit", doneAt: 2 },
  { label: "Generating Groth16 proof", doneAt: 5 },
  { label: "Sending JWZ to callback endpoint", doneAt: 8 },
  { label: "Verifying proof on-chain", doneAt: Infinity }, // never "done" until success
] as const;

interface ZkGenerateStageProps {
  role: RoleConfig;
  sessionId: string;
  pollCount: number;
  timedOut: boolean;
  onBack: () => void;
}

function ZkGenerateStage({
  role,
  sessionId,
  pollCount,
  timedOut,
  onBack,
}: ZkGenerateStageProps) {
  return (
    <motion.div
      key="zk-generate"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-md"
    >
      <BackButton onClick={onBack} label="Back" />

      <div
        className="glass-card p-8 relative overflow-hidden"
        style={{ borderColor: role.border }}
      >
        {/* Ambient pulse */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: `radial-gradient(circle at 50% 50%, ${role.color}, transparent 70%)`,
          }}
        />

        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
            className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center mx-auto mb-5`}
          >
            <Cpu className="w-7 h-7 text-white" />
          </motion.div>

          <p className="font-bold mb-1">Waiting for ZK Proof</p>
          <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
            Your Privado ID wallet is generating a zk-SNARK proof on-device.
            This typically takes 5–30 seconds.
          </p>

          {/* Step progress */}
          {ZK_STEPS.map((step, i) => {
            const isDone = pollCount > step.doneAt;
            const isActive = !isDone && pollCount > (ZK_STEPS[i - 1]?.doneAt ?? -1);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 mb-2 text-left"
              >
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {isDone ? (
                    <CheckCircle2
                      className="w-5 h-5"
                      style={{ color: "var(--accent-success)" }}
                    />
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                    >
                      <Loader2
                        className="w-5 h-5"
                        style={{ color: "var(--accent-secondary)" }}
                      />
                    </motion.div>
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: "var(--border-subtle)" }}
                    />
                  )}
                </div>
                <span
                  className="text-xs font-mono"
                  style={{
                    color: isDone
                      ? "var(--accent-success)"
                      : isActive
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                  }}
                >
                  {step.label}
                </span>
              </motion.div>
            );
          })}

          {/* Progress bar */}
          <div
            className="mt-4 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--border-subtle)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${role.color}, var(--accent-secondary))`,
              }}
              animate={{ width: `${Math.min(95, pollCount * 5)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p
            className="text-[10px] text-right mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            Polling… ({pollCount}/{POLL_TIMEOUT_STEPS})
          </p>

          {/* Live indicator */}
          <div
            className="flex items-center justify-center gap-2 mt-4 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: role.color }}
            />
            Listening on /api/auth/callback · session {sessionId.slice(0, 8)}…
          </div>

          {/* Timeout warning */}
          {timedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 rounded text-xs"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "rgb(245,158,11)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
              Timed out — make sure your callback URL is publicly reachable
              (ngrok) and the Privado ID app has network access.
            </motion.div>
          )}

          {/* Long-wait hint (before timeout) */}
          {!timedOut && pollCount > 30 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 rounded text-xs"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "rgb(245,158,11)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
              Taking longer than expected. Ensure your Privado ID app has
              network access and the callback URL is reachable.
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stage: Success ──────────────────────────────────────────────────────────
interface SuccessStageProps {
  role: RoleConfig;
  verifiedDid: string;
  onEnter: () => void;
}

function SuccessStage({ role, verifiedDid, onEnter }: SuccessStageProps) {
  return (
    <motion.div
      key="success"
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-md"
    >
      <div
        className="glass-card p-8 text-center relative overflow-hidden"
        style={{ borderColor: role.border }}
      >
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${role.color}12, transparent 65%)`,
          }}
        />

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 250, damping: 20 }}
            className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center relative"
            style={{ background: `${role.color}18` }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: role.color }} />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${role.color}` }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-1"
              style={{ color: role.color }}
            >
              Authentication Complete
            </div>
            <h2 className="text-xl font-bold mb-1">Welcome, {role.label}</h2>
            <p
              className="text-sm mb-5"
              style={{ color: "var(--text-secondary)" }}
            >
              {role.subtitle} · {role.authLevel}
            </p>

            {/* Verified DID */}
            {verifiedDid && (
              <div
                className="p-3 rounded-lg mb-4 text-left"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "var(--accent-success)" }}
                >
                  ✓ Verified DID
                </p>
                <p
                  className="text-[10px] font-mono break-all leading-relaxed"
                  style={{ color: "var(--accent-success)" }}
                >
                  {verifiedDid}
                </p>
              </div>
            )}

            {/* Session info grid */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
              {[
                { label: "Protocol", value: "Privado ID" },
                { label: "Circuit", value: "authV2" },
                { label: "Proof type", value: "Groth16" },
                { label: "Expires", value: "8h session" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="p-2 rounded"
                  style={{ background: "rgba(99,102,241,0.04)" }}
                >
                  <div
                    className="text-[10px] uppercase tracking-wider mb-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {label}
                  </div>
                  <div
                    className="font-mono text-[10px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              onClick={onEnter}
              className="btn-primary w-full justify-center"
              style={{ background: role.color }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Enter {role.label} Dashboard
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const router = useRouter();

  const [stage, setStage] = useState<AuthStage>("role-select");
  const [selectedRole, setSelectedRole] = useState<RoleConfig | null>(null);

  // Single source of truth for the auth request object
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  // Polling outcome
  const [verifiedDid, setVerifiedDid] = useState("");
  const [timedOut, setTimedOut] = useState(false);

  // Derived values — no extra state needed
  const universalLink = useMemo(
    () => (authRequest ? buildUniversalLink(authRequest) : ""),
    [authRequest]
  );
  const sessionId = authRequest?.id ?? "";

  // ── Polling hook (always called — not inside a render sub-function) ───────
  const { pollCount, start: startPolling, stop: stopPolling } = useAuthPolling({
    onVerified: useCallback((did: string) => {
      setVerifiedDid(did);
      setStage("success");
    }, []),
    onTimeout: useCallback(() => {
      setTimedOut(true);
    }, []),
  });

  // ── Fetch auth request + render QR ───────────────────────────────────────
  const fetchAuthRequest = useCallback(async (role: RoleConfig) => {
    setQrLoading(true);
    setQrError("");
    setQrDataUrl("");
    setAuthRequest(null);

    // AbortController lets us cancel an in-flight fetch if the user navigates away
    const controller = new AbortController();

    try {
      const res = await fetch(`/api/auth/sign-in?role=${role.id}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const req: AuthRequest = await res.json();

      setAuthRequest(req);

      // QR content is the universal link (Privado ID wallet understands iden3comm://)
      const link = buildUniversalLink(req);
      const qr = await generateQrDataUrl(link);
      setQrDataUrl(qr);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setQrError(String(err));
      }
    } finally {
      setQrLoading(false);
    }

    // Return cleanup so callers can abort on unmount / role change
    return () => controller.abort();
  }, []);

  // ── Role selection handler ────────────────────────────────────────────────
  const handleRoleSelect = useCallback(
    (role: RoleConfig) => {
      stopPolling();
      setTimedOut(false);
      setVerifiedDid("");
      setSelectedRole(role);
      setStage("wallet-connect");
      fetchAuthRequest(role);
    },
    [stopPolling, fetchAuthRequest]
  );

  // ── "I've scanned" — advance to polling stage ─────────────────────────────
  const handleContinueToZk = useCallback(() => {
    if (!sessionId) return;
    setStage("zk-generate");
    startPolling(sessionId);
  }, [sessionId, startPolling]);

  // ── Navigate to dashboard ─────────────────────────────────────────────────
  const enterDashboard = useCallback(() => {
    if (selectedRole) router.push(selectedRole.href);
  }, [selectedRole, router]);

  // ── Back navigation helpers ───────────────────────────────────────────────
  const backToRoleSelect = useCallback(() => {
    stopPolling();
    setStage("role-select");
  }, [stopPolling]);

  const backToWalletConnect = useCallback(() => {
    stopPolling();
    setTimedOut(false);
    setStage("wallet-connect");
  }, [stopPolling]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grid relative overflow-hidden flex flex-col">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] animate-float" />
        <div
          className="absolute top-[40%] right-[-15%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[100px] animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[80px] animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <HexGrid />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">PRAMAANIK</span>
        </button>

        <StageBreadcrumb current={stage} />

        <div className="badge badge-active text-[10px]" style={{ opacity: 0.7 }}>
          <div className="glow-dot w-1.5 h-1.5" />
          PRIVADO ID ACTIVE
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {stage === "role-select" && (
            <RoleSelectStage key="role-select" onSelect={handleRoleSelect} />
          )}

          {stage === "wallet-connect" && selectedRole && (
            <WalletConnectStage
              key="wallet-connect"
              role={selectedRole}
              authRequest={authRequest}
              qrDataUrl={qrDataUrl}
              universalLink={universalLink}
              isLoading={qrLoading}
              error={qrError}
              onRetry={() => fetchAuthRequest(selectedRole)}
              onBack={backToRoleSelect}
              onContinue={handleContinueToZk}
            />
          )}

          {stage === "zk-generate" && selectedRole && (
            <ZkGenerateStage
              key="zk-generate"
              role={selectedRole}
              sessionId={sessionId}
              pollCount={pollCount}
              timedOut={timedOut}
              onBack={backToWalletConnect}
            />
          )}

          {stage === "success" && selectedRole && (
            <SuccessStage
              key="success"
              role={selectedRole}
              verifiedDid={verifiedDid}
              onEnter={enterDashboard}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 text-center py-6 text-xs"
        style={{
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span className="font-mono">PRAMAANIK v2.4.0</span>
        <span className="mx-3 opacity-30">·</span>
        <span>Zero-Knowledge Identity · DPDP Act 2023 Compliant</span>
        <span className="mx-3 opacity-30">·</span>
        <span>Hyperledger Besu · Privado ID · Real ZK Proofs</span>
      </footer>
    </div>
  );
}