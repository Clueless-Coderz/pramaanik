"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  IndianRupee,
  CheckCircle2,
  ArrowDown,
  Shield,
  FileText,
  MessageSquare,
  Globe,
  Fingerprint,
  Clock,
  ChevronRight,
  MapPin,
} from "lucide-react";

// ─── Mock fund trace (the demo "follow a rupee" flow) ──────────────────
const fundTrace = [
  {
    stage: "Sanctioned",
    entity: "Ministry of Agriculture",
    amount: "₹2,000 Cr",
    time: "01 Apr 2026",
    txHash: "0xa1b2...c3d4",
    verified: true,
  },
  {
    stage: "Released to State Treasury",
    entity: "Rajasthan State Treasury",
    amount: "₹120 Cr",
    time: "05 Apr 2026",
    txHash: "0xe5f6...g7h8",
    verified: true,
  },
  {
    stage: "Released to Agency",
    entity: "Dept of Agriculture, Rajasthan",
    amount: "₹45 Cr",
    time: "12 Apr 2026",
    txHash: "0xi9j0...k1l2",
    verified: true,
  },
  {
    stage: "Released to Beneficiary",
    entity: "did:polygonid:0x8f2...a1d",
    amount: "₹6,000",
    time: "18 Apr 2026",
    txHash: "0xm3n4...o5p6",
    verified: true,
  },
];

const myBenefits = [
  {
    scheme: "PM-KISAN FY2026",
    amount: "₹6,000",
    status: "Received",
    installment: "2nd",
    date: "18 Apr 2026",
    verified: true,
  },
  {
    scheme: "PM-KISAN FY2026",
    amount: "₹6,000",
    status: "Received",
    installment: "1st",
    date: "15 Jan 2026",
    verified: true,
  },
  {
    scheme: "PMKVY 3.0",
    amount: "₹15,000",
    status: "Pending",
    installment: "Incentive",
    date: "—",
    verified: false,
  },
];

const schemes = [
  { name: "PM-KISAN FY2026", ministry: "Agriculture", budget: "₹60,000 Cr", beneficiaries: "11.4 Cr", disbursed: "62%" },
  { name: "MGNREGA FY2026", ministry: "Rural Development", budget: "₹86,000 Cr", beneficiaries: "5.8 Cr", disbursed: "47%" },
  { name: "PMKVY 3.0", ministry: "Skill Development", budget: "₹8,000 Cr", beneficiaries: "95.9 L", disbursed: "31%" },
  { name: "Ayushman Bharat", ministry: "Health", budget: "₹7,200 Cr", beneficiaries: "2.1 Cr", disbursed: "55%" },
];

export default function CitizenDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrace, setShowTrace] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Citizen Audit Portal</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Track any sanctioned rupee from Consolidated Fund to your doorstep · Gasless transactions via ERC-4337
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-6 mb-8">
        <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
          Follow the Money — Trace a Fund Flow
        </h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Enter scheme name, transaction ID, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-success)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            />
          </div>
          <button
            onClick={() => setShowTrace(true)}
            className="btn-primary"
            style={{ background: "var(--accent-success)" }}
          >
            Trace Fund Flow
          </button>
        </div>
      </div>

      {/* Fund Trace Timeline */}
      {showTrace && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-8"
        >
          <h2 className="font-bold text-sm flex items-center gap-2 mb-6">
            <IndianRupee className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
            Fund Flow Trace — PM-KISAN FY2026
          </h2>

          <div className="relative">
            {fundTrace.map((step, i) => (
              <motion.div
                key={step.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="flex gap-4 mb-6 last:mb-0"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: step.verified
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(245,158,11,0.15)",
                      border: `2px solid ${step.verified ? "var(--accent-success)" : "var(--accent-warning)"}`,
                    }}
                  >
                    <CheckCircle2
                      className="w-5 h-5"
                      style={{
                        color: step.verified ? "var(--accent-success)" : "var(--accent-warning)",
                      }}
                    />
                  </div>
                  {i < fundTrace.length - 1 && (
                    <div
                      className="w-0.5 flex-1 my-2"
                      style={{ background: "var(--border-subtle)" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div
                  className="flex-1 p-4 rounded-lg border"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: "rgba(16,185,129,0.03)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{step.stage}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {step.time}
                    </span>
                  </div>
                  <div className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                    {step.entity}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: "var(--accent-success)" }}>
                      {step.amount}
                    </span>
                    <span className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                      TX: {step.txHash}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg text-center text-xs" style={{ background: "rgba(16,185,129,0.08)", color: "var(--accent-success)" }}>
            <Shield className="w-4 h-4 inline mr-2" />
            All steps cryptographically verified · Merkle proof anchored to Polygon Amoy &amp; Ethereum Sepolia
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My Benefits */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Fingerprint className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
              My Benefits
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Verified via Privado ID
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {myBenefits.map((b, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="font-semibold text-sm">{b.scheme}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {b.installment} · {b.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{b.amount}</div>
                  <span className={`badge ${b.status === "Received" ? "badge-active" : "badge-pending"}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Grievance */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4" style={{ color: "var(--accent-warning)" }} />
            File an On-Chain Grievance
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Your grievance is recorded immutably on the blockchain. It cannot be deleted or tampered with. Gas fees are sponsored — you pay nothing.
          </p>
          <div className="space-y-3">
            <select
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              <option>Select Scheme</option>
              <option>PM-KISAN FY2026</option>
              <option>MGNREGA FY2026</option>
              <option>PMKVY 3.0</option>
              <option>Ayushman Bharat</option>
            </select>
            <textarea
              placeholder="Describe your grievance..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
            <button className="btn-primary w-full justify-center" style={{ background: "var(--accent-warning)" }}>
              <MessageSquare className="w-4 h-4" /> Submit Grievance (Gasless)
            </button>
          </div>
        </div>
      </div>

      {/* Scheme Browser */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: "var(--accent-secondary)" }} />
            Active Government Schemes
          </h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Scheme</th>
              <th>Ministry</th>
              <th>Sanctioned Budget</th>
              <th>Beneficiaries</th>
              <th>Disbursed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {schemes.map((s) => (
              <tr key={s.name}>
                <td className="font-semibold">{s.name}</td>
                <td>{s.ministry}</td>
                <td>{s.budget}</td>
                <td>{s.beneficiaries}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: s.disbursed, background: "var(--accent-secondary)" }}
                      />
                    </div>
                    <span className="text-xs">{s.disbursed}</span>
                  </div>
                </td>
                <td>
                  <button className="text-xs flex items-center gap-1" style={{ color: "var(--accent-secondary)" }}>
                    Trace <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
