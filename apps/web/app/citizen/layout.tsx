"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LayoutDashboard,
  Search,
  FileText,
  MessageSquare,
  Shield,
  LogOut,
  Globe,
} from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/citizen", icon: LayoutDashboard },
  { label: "Track Fund", href: "/citizen/track", icon: Search },
  { label: "My Benefits", href: "/citizen/benefits", icon: FileText },
  { label: "Grievances", href: "/citizen/grievances", icon: MessageSquare },
  { label: "Scheme Browser", href: "/citizen/schemes", icon: Globe },
];

export default function CitizenLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-grid">
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">PRAMAANIK</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Citizen Portal
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider px-4 mb-3" style={{ color: "var(--text-muted)" }}>
          Public Audit
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

        <div className="p-3 rounded-lg mb-4" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: "var(--accent-success)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--accent-success)" }}>
              Privacy Protected
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Your identity is verified via Privado ID. No personal data touches the blockchain.
          </p>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <Link href="/" className="sidebar-link" style={{ color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Exit to Landing
          </Link>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
