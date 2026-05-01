import express from "express";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ─── Mock Oracle Endpoints ───────────────────────────────────────────
// In production, these hit real GSTN, NPCI, and NIC APIs via Chainlink Functions.
// For the hackathon demo, deterministic mock responses are returned.

// GST Validity Oracle
app.post("/oracle/gst", (req, res) => {
  const { gstin } = req.body;
  // Mock: GSTINs starting with "FAKE" are invalid
  const isValid = gstin && !gstin.startsWith("FAKE");
  console.log(`[GST Oracle] GSTIN: ${gstin} → Valid: ${isValid}`);
  res.json({
    gstin,
    valid: isValid,
    status: isValid ? "Active" : "Cancelled",
    timestamp: Date.now(),
    attestationHash: ethers.keccak256(ethers.toUtf8Bytes(`gst:${gstin}:${isValid}:${Date.now()}`)),
  });
});

// Bank Account Uniqueness Oracle
app.post("/oracle/bank-dedup", (req, res) => {
  const { accountNumber, beneficiaryDid } = req.body;
  // Mock: Account "11111111" is the PMKVY-pattern duplicate
  const isUnique = accountNumber !== "11111111" && accountNumber !== "123456";
  console.log(`[Bank Dedup Oracle] Account: ${accountNumber} → Unique: ${isUnique}`);
  res.json({
    accountNumber: accountNumber?.slice(0, 4) + "****",  // Redacted
    isUnique,
    linkedDids: isUnique ? 1 : 23,
    timestamp: Date.now(),
    attestationHash: ethers.keccak256(ethers.toUtf8Bytes(`bank:${accountNumber}:${isUnique}:${Date.now()}`)),
  });
});

// Geotag Photo Dedup Oracle
app.post("/oracle/geotag", (req, res) => {
  const { photoHash, lat, lng } = req.body;
  // Mock: Photos with hash starting with "DUP" are duplicates
  const isVerified = photoHash && !photoHash.startsWith("DUP");
  console.log(`[Geotag Oracle] Photo: ${photoHash?.slice(0, 8)} → Verified: ${isVerified}`);
  res.json({
    photoHash,
    isVerified,
    duplicatesFound: isVerified ? 0 : 3,
    location: { lat, lng },
    timestamp: Date.now(),
    attestationHash: ethers.keccak256(ethers.toUtf8Bytes(`geo:${photoHash}:${isVerified}:${Date.now()}`)),
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "oracle-relayer", uptime: process.uptime() });
});

const PORT = process.env.ORACLE_PORT || 8082;
app.listen(PORT, () => {
  console.log(`Oracle Relayer listening on port ${PORT}`);
});
