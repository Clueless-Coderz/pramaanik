"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Eye,
  LayoutDashboard,
  AlertTriangle,
  FileSearch,
  Lock,
  LogOut,
  Microscope,
  Menu,
  X,
  ChevronRight,
  Settings,
} from "lucide-react";
import { ReactNode, useState, useEffect, useCallback } from "react";

import { useChainData } from "../lib/useChainData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: number;
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItemConfig;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`sidebar-link group relative ${isActive ? "active" : ""}`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{item.label}</span>

      {/* Badge */}
      {item.badge != null && item.badge > 0 && (
        <span
          className="ml-auto flex items-center justify-center rounded-full text-white text-[10px] font-bold leading-none"
          style={{
            minWidth: "1.125rem",
            height: "1.125rem",
            padding: "0 4px",
            background:
              item.href === "/auditor/flags"
                ? "var(--accent-danger)"
                : "var(--accent-warning)",
          }}
        >
          {item.badge}
        </span>
      )}

      {/* Active indicator bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
          style={{ background: "var(--accent-secondary)" }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({
  pathname,
  navItems,
  onNavClick,
}: {
  pathname: string;
  navItems: NavItemConfig[];
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, #06b6d4, #2563eb)",
          }}
        >
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight">PRAMAANIK</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Auditor Console
          </div>
        </div>
      </div>

      {/* Section label */}
      <div
        className="text-xs font-semibold uppercase tracking-widest px-4 mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Investigation
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5" aria-label="Auditor navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="mt-auto pt-4 border-t space-y-0.5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <NavLink
          item={{ label: "Settings", href: "/auditor/settings", icon: Settings }}
          pathname={pathname}
          onClick={onNavClick}
        />
        <Link
          href="/"
          onClick={onNavClick}
          className="sidebar-link"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Exit to Landing</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.replace(/^\/auditor\/?/, "").split("/").filter(Boolean);
  const crumbs = [
    { label: "Auditor", href: "/auditor" },
    ...segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href: "/auditor/" + segments.slice(0, i + 1).join("/"),
    })),
  ];

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs mb-6"
      style={{ color: "var(--text-muted)" }}
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          {i === crumbs.length - 1 ? (
            <span style={{ color: "var(--text-primary)" }}>{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:underline underline-offset-2"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AuditorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { flags, frozen } = useChainData();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: NavItemConfig[] = [
    { label: "Dashboard", href: "/auditor", icon: LayoutDashboard, exact: true },
    {
      label: "Flagged Transactions",
      href: "/auditor/flags",
      icon: AlertTriangle,
      badge: flags.length,
    },
    { label: "Proof Verification", href: "/auditor/proofs", icon: Microscope },
    {
      label: "Frozen Disbursements",
      href: "/auditor/frozen",
      icon: Lock,
      badge: frozen.length,
    },
    { label: "Audit Trail", href: "/auditor/trail", icon: FileSearch },
  ];


  // Close drawer on route change
  useEffect(() => {
    if (drawerOpen) {
      setDrawerOpen(false);
    }
  }, [pathname, drawerOpen]);

  // Escape key + body scroll lock
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, handleKeyDown]);

  return (
    <div className="min-h-screen bg-grid">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside
        className="sidebar hidden lg:flex flex-col"
        aria-label="Auditor sidebar"
      >
        <SidebarContent pathname={pathname} navItems={navItems} />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{
          background: "var(--bg-primary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #06b6d4, #2563eb)" }}
          >
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">PRAMAANIK</span>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(10,14,26,0.75)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="relative w-64 h-full flex flex-col p-5 overflow-y-auto"
            style={{
              background: "var(--bg-primary)",
              borderRight: "1px solid var(--border-subtle)",
              animation: "slideInLeft 0.2s ease-out",
            }}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>

            <SidebarContent
              pathname={pathname}
              navItems={navItems}
              onNavClick={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="main-content pt-14 lg:pt-0">
        <Breadcrumb pathname={pathname} />
        {children}
      </main>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}