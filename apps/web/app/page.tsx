"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  Brain,
  Users,
  ArrowRight,
  Lock,
  Activity,
  Globe,
  ChevronRight,
  Fingerprint,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scandals = [
  {
    name: "PMKVY",
    source: "CAG Report No. 20/2025",
    stat: "94.53%",
    desc: "beneficiary records had missing/invalid bank accounts",
    detail: "12,122 accounts repeated across 52,381 participants",
    icon: Fingerprint,
    color: "var(--accent-danger)",
  },
  {
    name: "Gujarat MGNREGA",
    source: "FIR Apr 2025 — Dahod",
    stat: "₹71 Cr",
    desc: "siphoned via ghost projects & geotag manipulation",
    detail: "Only 3.5 km of 19.2 km road actually built",
    icon: AlertTriangle,
    color: "var(--accent-warning)",
  },
  {
    name: "Ayushman Bharat",
    source: "CAG Performance Audit",
    stat: "₹6.97 Cr",
    desc: "disbursed for treatment of deceased patients",
    detail: "3,446 already-deceased patients received funds",
    icon: IndianRupee,
    color: "var(--accent-primary)",
  },
];

const pillars = [
  {
    icon: Lock,
    title: "Cryptographic Chain-of-Custody",
    desc: "Every rupee's path is an immutable Besu event, Merkle-anchored to public Ethereum. Tampering is mathematically impossible.",
    gradient: "from-indigo-500 to-violet-600",
  },
  {
    icon: Eye,
    title: "Multi-Source Oracle Attestation",
    desc: "GST validity, bank-account uniqueness, and geotag deduplication verified at disbursement time via Chainlink Functions.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Brain,
    title: "zkML Anomaly Detection",
    desc: "RGCN graph neural network scores every transaction. Fraud flags come with zk-SNARK proofs — verifiable on-chain by anyone.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Shield,
    title: "Zero-Knowledge Privacy",
    desc: "Privado ID verifiable credentials. Beneficiary identities never touch the blockchain. DPDP Act 2023 compliant by design.",
    gradient: "from-amber-500 to-orange-600",
  },
];

const roles = [
  {
    role: "Admin",
    subtitle: "Treasury Official",
    desc: "Sanction schemes, create disbursements, manage vendors, and monitor the full fund pipeline with real-time analytics.",
    href: "/admin",
    icon: Shield,
    color: "var(--accent-primary)",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.2)",
  },
  {
    role: "Auditor",
    subtitle: "CAG / Parliamentary",
    desc: "Investigate flagged transactions, verify zk-SNARK proofs, freeze suspicious disbursements, and generate audit trails.",
    href: "/auditor",
    icon: Eye,
    color: "var(--accent-secondary)",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.2)",
  },
  {
    role: "Citizen",
    subtitle: "Public Audit",
    desc: "Trace any sanctioned rupee from Consolidated Fund to last-mile use. Verify your own benefits. File on-chain grievances.",
    href: "/citizen",
    icon: Users,
    color: "var(--accent-success)",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-grid bg-radial-glow relative overflow-hidden">
      {/* ─── Ambient Glow Orbs ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px] animate-float" />
        <div className="absolute top-[40%] right-[-15%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] animate-float" style={{ animationDelay: "4s" }} />
      </div>

      {/* ─── Navigation ────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">PRAMAANIK</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="btn-secondary text-sm">
            Admin Portal
          </Link>
          <Link href="/citizen" className="btn-primary text-sm">
            Citizen Audit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={fadeInUp} custom={0} className="mb-6">
            <span className="badge badge-active">
              <Activity className="w-3 h-3" />
              Live on Hyperledger Besu · Anchored to Ethereum
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            custom={1}
            className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6"
          >
            <span className="text-gradient">Provable Rupees.</span>
            <br />
            From Sanction to Last Mile.
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            custom={2}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            The first public fund tracking system with cryptographic provenance,
            zero-knowledge beneficiary privacy, and{" "}
            <strong style={{ color: "var(--accent-secondary)" }}>
              on-chain verifiable AI fraud detection
            </strong>
            . Every flag comes with a zk-SNARK proof.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            custom={3}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link href="/admin" className="btn-primary text-base px-8 py-3">
              Launch Demo <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/citizen" className="btn-secondary text-base px-8 py-3">
              <Globe className="w-5 h-5" /> Citizen Portal
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Scandal Cards ─────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm font-semibold uppercase tracking-widest mb-8"
          style={{ color: "var(--text-muted)" }}
        >
          The Problem — in Three Real Scandals
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {scandals.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}15` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.source}
                  </div>
                </div>
              </div>
              <div
                className="text-3xl font-extrabold mb-2"
                style={{ color: s.color }}
              >
                {s.stat}
              </div>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                {s.desc}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {s.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Four Pillars ──────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Four Properties That Make Fraud{" "}
            <span className="text-gradient">Impossible</span>
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            By construction, not by policy.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-card p-8 flex gap-5"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center flex-shrink-0`}
              >
                <p.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {p.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Role Entry Points ─────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Three Roles. One Truth.
          </h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Every stakeholder sees the same immutable record.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((r, i) => (
            <motion.div
              key={r.role}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <Link href={r.href} className="block">
                <div
                  className="glass-card p-8 h-full group cursor-pointer"
                  style={{
                    borderColor: r.border,
                    background: r.bg,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${r.color}20` }}
                  >
                    <r.icon className="w-6 h-6" style={{ color: r.color }} />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: r.color }}>
                    {r.subtitle}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{r.role}</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
                    {r.desc}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all" style={{ color: r.color }}>
                    Enter Dashboard <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Architecture Preview ──────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24">
        <div className="glass-card p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 text-center">System Architecture</h2>
          <pre className="text-xs md:text-sm font-mono leading-relaxed overflow-x-auto" style={{ color: "var(--text-secondary)" }}>
{`┌─────────────────────────────────────────────────────────────────┐
│                     CITIZEN / AUDITOR / ADMIN                    │
│              Next.js 14  ·  Privado ID Wallet  ·  ERC-4337      │
├─────────────────────────────────────────────────────────────────┤
│              SMART CONTRACT LAYER (Hyperledger Besu / QBFT)      │
│  SchemeRegistry · FundFlow · AnomalyOracle · AccessGovernance   │
│                  Anchor  ·  GrievancePortal                     │
├──────────────────────┬──────────────────────────────────────────┤
│   ORACLE LAYER       │        zkML PIPELINE                     │
│   Chainlink Fns      │  RGCN (PyG) → EZKL → Halo2 SNARK        │
│   GST · NPCI · Photo │  → AnomalyOracle verifier contract       │
├──────────────────────┴──────────────────────────────────────────┤
│                    DUAL PUBLIC ANCHOR                            │
│         Polygon Amoy (every 15 min)  ·  Ethereum Sepolia        │
└─────────────────────────────────────────────────────────────────┘`}
          </pre>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-12 px-8 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">PRAMAANIK</span>
        </div>
        <p className="text-sm italic mb-2" style={{ color: "var(--text-muted)" }}>
          prāmāṇika (Sanskrit) — authentic, verifiable, having proof
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Built by Team Harctik · Cybersecurity & Blockchain Track · Vemana Hackathon 2026
        </p>
      </footer>
    </div>
  );
}
