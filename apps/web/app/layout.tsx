import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRAMAANIK — Provable Rupees. From Sanction to Last Mile.",
  description:
    "Blockchain-based public fund tracking with zkML anomaly detection. The first system combining cryptographic provenance, zero-knowledge selective disclosure, and on-chain verifiable GNN fraud detection — DPDP Act 2023 compliant.",
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
