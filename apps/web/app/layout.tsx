import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// ─── Fonts ──────────────────────────────────────────────────────────────────
// `variable` mode exposes these as CSS custom properties so Tailwind classes
// like `font-mono` and any inline `var(--font-*)` references work everywhere.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  // Explicitly request only the weights actually used in the app.
  // Omitting this loads all weights (~300 kB extra woff2 per variant).
  weight: ["400", "500", "700"],
});

// ─── Viewport ───────────────────────────────────────────────────────────────
// Separated from `metadata` per Next.js 14+ recommendation — the framework
// emits this as a standalone <meta> tag and handles deduplication correctly.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Prevents iOS auto-zoom on <input> focus (common pain point in dashboards).
  maximumScale: 5,
  // Colours the browser chrome on Android/iOS to match the app shell.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f1a" },
  ],
};

// ─── Metadata ───────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pramaanik.gov.in";

export const metadata: Metadata = {
  // `metadataBase` is required for Next.js to resolve relative OG/Twitter image
  // URLs. Without it the framework logs a warning and social-card images break.
  metadataBase: new URL(BASE_URL),

  title: {
    // `template` automatically suffixes inner-page titles, e.g.
    // "Admin Dashboard | PRAMAANIK" — no manual string concat in every page.
    default: "PRAMAANIK — Provable Rupees. From Sanction to Last Mile.",
    template: "%s | PRAMAANIK",
  },

  description:
    "Blockchain-based public fund tracking with zkML anomaly detection. " +
    "Combining cryptographic provenance, zero-knowledge selective disclosure, " +
    "and on-chain verifiable GNN fraud detection — DPDP Act 2023 compliant.",

  keywords: [
    "blockchain",
    "public fund tracking",
    "zkML",
    "anomaly detection",
    "DPDP Act",
    "Hyperledger Besu",
    "zero knowledge proofs",
    "India",
    "PFMS",
    "anti-corruption",
    "zk-SNARK",
    "Privado ID",
    "government transparency",
  ],

  // Explicit canonical prevents duplicate-content SEO issues when the app is
  // accessible via multiple hostnames (www vs apex, preview URLs, etc.).
  alternates: {
    canonical: "/",
  },

  // ── Open Graph (Facebook, WhatsApp, LinkedIn, Slack previews) ─────────────
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "PRAMAANIK",
    title: "PRAMAANIK — Provable Rupees. From Sanction to Last Mile.",
    description:
      "Real-time cryptographic provenance for every rupee of public money. " +
      "zk-SNARK identity · zkML fraud detection · DPDP Act 2023 compliant.",
    images: [
      {
        url: "/og-image.png",  // 1200×630 recommended
        width: 1200,
        height: 630,
        alt: "PRAMAANIK — blockchain public fund tracker",
      },
    ],
    locale: "en_IN",
  },

  // ── Twitter / X card ──────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "PRAMAANIK — Provable Rupees",
    description: "Cryptographic provenance for every rupee of public money.",
    images: ["/og-image.png"],
    // Replace with the project's real handle when available.
    // creator:  "@pramaanik_in",
  },

  // ── Robots ────────────────────────────────────────────────────────────────
  robots: {
    // The citizen-facing ledger should be crawlable; authenticated admin/auditor
    // routes are protected by middleware so this top-level default is safe.
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── PWA / app identity ────────────────────────────────────────────────────
  applicationName: "PRAMAANIK",
  // Prevents the browser from converting plain-text phone numbers into call links,
  // which breaks formatted Aadhaar / transaction IDs displayed in the UI.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // Allows the site to be added to the iOS home screen with a standalone icon
  // and without the Safari chrome, improving the feel for field officers on
  // mobile devices.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PRAMAANIK",
  },
};

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` prevents a React mismatch warning when a
    // browser extension (e.g. a password manager or dark-mode injector) mutates
    // the <html> element before hydration. It does NOT suppress real app errors.
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}