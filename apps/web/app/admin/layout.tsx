"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  FileText,
  Send,
  AlertTriangle,
  Anchor,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Schemes", href: "/admin/schemes", icon: FileText },
  { label: "Disbursements", href: "/admin/disbursements", icon: Send },
  { label: "Anomaly Flags", href: "/admin/flags", icon: AlertTriangle },
  { label: "Anchor Status", href: "/admin/anchors", icon: Anchor },
  { label: "Identities", href: "/admin/identities", icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-grid">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">PRAMAANIK</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Admin Console
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider px-4 mb-3" style={{ color: "var(--text-muted)" }}>
          Main Menu
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
          <Link href="/admin/settings" className="sidebar-link">
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <Link href="/" className="sidebar-link" style={{ color: "var(--text-muted)" }}>
            <LogOut className="w-4 h-4" /> Exit to Landing
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">{children}</main>
    </div>
  );
}
