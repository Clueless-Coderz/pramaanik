"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  LayoutDashboard,
  AlertTriangle,
  FileSearch,
  Lock,
  Shield,
  LogOut,
  Microscope,
} from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/auditor", icon: LayoutDashboard },
  { label: "Flagged Transactions", href: "/auditor/flags", icon: AlertTriangle },
  { label: "Proof Verification", href: "/auditor/proofs", icon: Microscope },
  { label: "Frozen Disbursements", href: "/auditor/frozen", icon: Lock },
  { label: "Audit Trail", href: "/auditor/trail", icon: FileSearch },
];

export default function AuditorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-grid">
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">PRAMAANIK</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Auditor Console
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider px-4 mb-3" style={{ color: "var(--text-muted)" }}>
          Investigation
        </div>

        <nav className="flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <Link href="/" className="sidebar-link" style={{ color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Exit to Landing
          </Link>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
