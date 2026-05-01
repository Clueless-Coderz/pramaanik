import { ethers } from "ethers";

// ─── Contract ABIs (minimal read interfaces) ────────────────────────────
export const FUND_FLOW_ABI = [
  "function getDisbursement(bytes32 _id) view returns (tuple(bytes32 disbursementId, bytes32 schemeId, uint8 stage, address from, bytes32 toPseudonymDid, uint256 amount, uint64 timestamp, bytes32 supportingDocHash, string ipfsCid, bytes32 oracleAttestationHash, bool gstValid, bool bankUnique, bool geotagVerified, uint8 senderLevel, uint8 receiverLevel, bool multiSigRequired, uint8 approvalCount, bytes32 utilizationCertHash))",
  "function getDisbursementIdsPaginated(uint256 _offset, uint256 _limit) view returns (bytes32[])",
  "function totalDisbursementCount() view returns (uint256)",
  "function totalFlaggedCount() view returns (uint256)",
  "function getAnomalyFlags(bytes32 _id) view returns (tuple(bytes32 disbursementId, uint256 riskScore, bytes32 proofHash, string explanation, uint64 flaggedAt, address flaggedBy)[])",
  "function isFullyApproved(bytes32 _id) view returns (bool)",
];

export const SCHEME_REGISTRY_ABI = [
  "function getScheme(bytes32 _schemeId) view returns (tuple(bytes32 schemeId, string name, string ministry, string implementingAgency, uint256 sanctionedBudget, uint256 disbursed, uint256 beneficiaryCount, uint8 status, uint64 createdAt, uint64 updatedAt, string metadataIpfsCid))",
  "function getAllSchemeIds() view returns (bytes32[])",
  "function schemeCount() view returns (uint256)",
  "function remainingBudget(bytes32 _schemeId) view returns (uint256)",
];

export const ANOMALY_ORACLE_ABI = [
  "function totalPredictions() view returns (uint256)",
  "function totalVerified() view returns (uint256)",
  "function getPrediction(bytes32 _proofHash) view returns (tuple(bytes32 disbursementId, bytes32 modelHash, uint256 riskScore, bytes32 proofHash, bytes proof, string explanation, uint64 verifiedAt, bool verified))",
];

export const ANCHOR_ABI = [
  "function checkpointCount() view returns (uint256)",
  "function getLatestCheckpoint() view returns (tuple(bytes32 merkleRoot, bytes32 previousCheckpoint, uint256 disbursementCount, uint256 blockNumber, uint64 timestamp, uint256 sequenceNumber))",
  "function getCheckpoint(uint256 _seq) view returns (tuple(bytes32 merkleRoot, bytes32 previousCheckpoint, uint256 disbursementCount, uint256 blockNumber, uint64 timestamp, uint256 sequenceNumber))",
  "function polygonAnchors(uint256) view returns (bytes32)",
  "function sepoliaAnchors(uint256) view returns (bytes32)",
];

export const GRIEVANCE_PORTAL_ABI = [
  "function fileGrievance(bytes32 _schemeId, bytes32 _disbursementId, string _description, string _evidenceCid) returns (bytes32)",
  "function getGrievance(bytes32 _id) view returns (tuple(bytes32 grievanceId, bytes32 schemeId, bytes32 disbursementId, address filer, string description, string evidenceCid, uint8 status, uint64 filedAt, uint64 updatedAt, string resolution))",
  "function grievanceCount() view returns (uint256)",
];

// ─── Provider & Contract Factories ───────────────────────────────────────
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getFundFlow(): ethers.Contract | null {
  const addr = process.env.NEXT_PUBLIC_FUND_FLOW_ADDRESS;
  if (!addr) return null;
  return new ethers.Contract(addr, FUND_FLOW_ABI, getProvider());
}

export function getSchemeRegistry(): ethers.Contract | null {
  const addr = process.env.NEXT_PUBLIC_SCHEME_REGISTRY_ADDRESS;
  if (!addr) return null;
  return new ethers.Contract(addr, SCHEME_REGISTRY_ABI, getProvider());
}

export function getAnomalyOracle(): ethers.Contract | null {
  const addr = process.env.NEXT_PUBLIC_ANOMALY_ORACLE_ADDRESS;
  if (!addr) return null;
  return new ethers.Contract(addr, ANOMALY_ORACLE_ABI, getProvider());
}

export function getAnchor(): ethers.Contract | null {
  const addr = process.env.NEXT_PUBLIC_ANCHOR_ADDRESS;
  if (!addr) return null;
  return new ethers.Contract(addr, ANCHOR_ABI, getProvider());
}

// ─── Formatting Helpers ──────────────────────────────────────────────────
const FLOW_STAGES = [
  "Sanctioned", "ReleasedToState", "ReleasedToAgency", "ReleasedToVendor",
  "ReleasedToBeneficiary", "WorkCompleted", "UtilCertPending",
  "UtilCertVerified", "Flagged", "Frozen",
];

const GOV_LEVELS = ["Central", "State", "District", "CityTown", "Village"];

export function formatStage(stage: number): string {
  return FLOW_STAGES[stage] || `Unknown(${stage})`;
}

export function formatGovLevel(level: number): string {
  return GOV_LEVELS[level] || `Unknown(${level})`;
}

export function formatPaisa(paisa: bigint): string {
  const rupees = Number(paisa) / 100;
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(1)} Cr`;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(1)} L`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export function shortenHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function timeAgo(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
