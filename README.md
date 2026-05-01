# PRAMAANIK (ChainLedger) — Provable Rupees. From Sanction to Last Mile.

> *prāmāṇika* (Sanskrit) — authentic, verifiable, having proof

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Track](https://img.shields.io/badge/Track-Cybersecurity_%26_Blockchain-indigo)](https://github.com/Clueless-Coderz/pramaanik)

**The first public fund tracking system combining cryptographically anchored provenance, zero-knowledge selective disclosure for beneficiary privacy, and on-chain verifiable graph-neural-network anomaly detection — built compliant with the Digital Personal Data Protection Act 2023 and aligned with MeitY's National Blockchain Framework (September 2024).**

---

## The Problem, in Three Numbers

| Scandal | Scale | Root Cause ChainLedger Fixes |
|---|---|---|
| PMKVY (CAG Report No. 20/2025) | 94.53% of 95.9L beneficiary records had missing/invalid bank accounts; 12,122 accounts repeated across 52,381 supposedly distinct participants | No bank-account deduplication oracle; no graph-pattern anomaly detection |
| Gujarat Dahod MGNREGA (Apr 2025) | ₹71 Cr siphoned via ghost projects, manipulated geotags, and lowest-bidder bypass | No perceptual-hash deduplication; no on-chain work-completion attestation |
| Ayushman Bharat deceased-patient fraud | ₹6.97 Cr disbursed for treatment of 3,446 already-deceased patients | No multi-source oracle attestation at disbursement time |

---

## What We Built

```
┌─────────────────────────────────────────────────────────────────┐
│                     CITIZEN / AUDITOR / ADMIN                    │
│              Next.js 14  ·  Privado ID Wallet  ·  ERC-4337      │
├─────────────────────────────────────────────────────────────────┤
│        SMART CONTRACT LAYER (Hyperledger Besu / 4-Node QBFT)    │
│  SchemeRegistry · FundFlow · AnomalyOracle · AccessGovernance   │
│  Anchor · GrievancePortal · BatchVerifier · ConstitutionalComp. │
├──────────────────────┬──────────────────────────────────────────┤
│   ORACLE LAYER       │        zkML PIPELINE                     │
│   GSTN Sandbox       │  3-Layer RGCN (PyG) → EZKL → Halo2      │
│   NPCI · NIC Geotag  │  → AnomalyOracle verifier contract       │
│   Circuit Breakers   │  → BatchVerifier (Merkle aggregation)     │
├──────────────────────┴──────────────────────────────────────────┤
│              5-TIER GOVERNANCE HIERARCHY (ChainLedger §2.1)      │
│   Central → State → District → City/Town → Village/Panchayat    │
├─────────────────────────────────────────────────────────────────┤
│                    DUAL PUBLIC ANCHOR                            │
│         Polygon Amoy (every 15 min)  ·  Ethereum Sepolia        │
└─────────────────────────────────────────────────────────────────┘
```

**Six properties that make fund fraud impossible by construction:**

1. **Cryptographic chain-of-custody** — every rupee's path is an immutable Besu event, Merkle-anchored to public Ethereum
2. **Multi-source oracle attestation** — GST validity, bank-account uniqueness, and geotag deduplication checked at disbursement time, with circuit-breaker fallback
3. **On-chain verifiable GNN anomaly detection** — fraud flags come with zk-SNARK proofs that the published model produced them
4. **Citizen-verifiable provenance without PII exposure** — Privado ID zero-knowledge credentials; beneficiary identities never touch the chain
5. **Multi-signature for high-value transactions** — Disbursements >₹5 Crore require 2-of-3 approval from designated officials (ChainLedger §4.2.3)
6. **Constitutional compliance enforcement** — Article 275/282, FRBM Act rules encoded on-chain; Auto-FIR generation and Lokpal integration for CRITICAL violations (ChainLedger §4.18-4.20)

---

## One-Command Spin-Up

```bash
git clone https://github.com/Clueless-Coderz/pramaanik
cd pramaanik
cp .env.example .env          # fill in API keys (GSTN, NPCI, Pinata, Privado ID)
docker compose up --build
```

The stack comes up in under 3 minutes on a 16 GB laptop. Services:

| Service | Port | Description |
|---|---|---|
| Besu Node 1 (RPC) | 8545 | 4-validator QBFT consortium (genesis in `besu-config/`) |
| Besu Nodes 2-4 | 8546-8548 | Additional validators (NIC, MoF, CAG, RBI) |
| Neo4j Browser | 7474 | Fund-flow graph database |
| GNN Inference | 8080 | FastAPI — RGCN fraud scoring + PSI drift detection |
| EZKL Prover | 8081 | Async Redis job queue — zk-SNARK proof generation |
| Oracle Relayer | 8082 | GSTN/NPCI/NIC connectors with circuit breakers |
| IPFS Node | 5001 | Local + Pinata remote pinning |
| Frontend | 3000 | Next.js 14 — Admin / Auditor / Citizen |
| Prometheus | 9090 | Metrics scraping all services + Besu |
| Grafana | 3001 | Observability dashboards |

---

## Smart Contracts (8 Contracts)

| Contract | Purpose | Key Feature |
|---|---|---|
| `AccessGovernance.sol` | Tri-role DID-based RBAC with UUPS upgradeability | W3C DID identity lifecycle |
| `SchemeRegistry.sol` | Master database for welfare schemes and budgets | Budget ceiling enforcement |
| `FundFlow.sol` | Core fund tracking — 5-tier hierarchy, multi-sig, util certs | **Multi-sig for >₹5Cr; Utilization cert escrow** |
| `AnomalyOracle.sol` | zkML proof verifier — auto-flags high-risk disbursements | EZKL Halo2 SNARK verification |
| `BatchVerifier.sol` | Merkle-tree proof aggregation for O(1) gas verification | Gas savings: ~500k→50k per proof |
| `ConstitutionalCompliance.sol` | Article 275/282, FRBM rules, Auto-FIR, Lokpal feed | **72-hour escalation, IT Act §65B** |
| `Anchor.sol` | Dual-chain Merkle root checkpointing | Polygon Amoy + Ethereum Sepolia |
| `GrievancePortal.sol` | Citizen complaint tracking with evidence hash on-chain | Geotagged, photo-evidenced complaints |

---

## Repository Structure

```
pramaanik/
├── contracts/              # Foundry project — 8 Solidity contracts
│   ├── src/                # FundFlow, AnomalyOracle, ConstitutionalCompliance, ...
│   ├── test/               # 9 integration tests, fuzz testing (10k runs)
│   └── script/             # Deploy.s.sol → one-click deployment
├── services/
│   ├── gnn/                # Python · FastAPI · PyTorch Geometric · Neo4j · PSI drift
│   ├── zkml/               # Python · EZKL · Redis async queue · batch proving
│   ├── oracle/             # Node.js · GSTN/NPCI/NIC connectors · circuit breakers
│   ├── common/             # KMS abstraction · key rotation · CERT-In incident response
│   ├── storage/            # Node.js · IPFS · Pinata · hybrid encryption
│   └── anchor/             # Node.js · Merkle builder · dual-chain poster
├── apps/
│   └── web/                # Next.js 14 · Tailwind · shadcn/ui · ethers.js v6
├── besu-config/            # QBFT genesis.json + 4 validator key pairs
├── config/                 # prometheus.yml + alerts.yml
├── docs/
│   └── disaster-recovery.md # DR/BCP plan, RTO/RPO targets, multi-region topology
├── docker-compose.yml      # Full stack: 4-node Besu + Redis + Prometheus + Grafana
├── ARCHITECTURE.md
├── SECURITY.md
└── RESEARCH_REPORT.md      # 60+ sources, strategic novelty thesis
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Base ledger | Hyperledger Besu (QBFT, 4 validators) | EVM-compatible; Apache 2.0; MeitY aligned |
| Public anchor | Polygon Amoy + Ethereum Sepolia | Tamper evidence even against full-validator collusion |
| Identity | Privado ID (W3C DID + VC + ZK) | DPDP-compliant selective disclosure; no PII on chain |
| Smart contracts | Solidity 0.8.24 + OpenZeppelin v5 + UUPS | Multi-sig, constitutional compliance, batch verification |
| Anomaly detection | 3-Layer RGCN (PyTorch Geometric) + EZKL (Halo2) | Verifiable on-chain fraud flags with zk-SNARK proofs |
| Oracles | GSTN Sandbox + NPCI + NIC with circuit breakers | Production-grade external attestation with fallback |
| Storage | IPFS + Pinata (hybrid-encrypted) | Content-addressed; PII never on chain |
| Gas abstraction | ERC-4337 + Pimlico bundler | Citizens never hold MATIC/ETH |
| Observability | Prometheus + Grafana + structured logging | Real-time alerts for chain health, drift, SLA breaches |
| Frontend | Next.js 14 + shadcn/ui + d3 | Three-role experience; Hindi i18n |

---

## Security

See [SECURITY.md](SECURITY.md) for the full smart-contract security report.

- Test coverage: `forge coverage` → **≥90%** on all contracts
- Fuzz runs: `forge test --fuzz-runs 10000`
- KMS: HSM-backed key rotation (90-day validators, 30-day oracles)
- Secrets: No hardcoded keys in `.env.example` — all via environment variables

---

## Regulatory Alignment

- **DPDP Act 2023**: PII kept off-chain in hybrid-encrypted IPFS; on-chain data is pseudonymous DIDs and SHA-256 hashes — "data minimized by design"
- **MeitY National Blockchain Framework (Sep 2024)**: Architecture designed to deploy on Vishvasya BaaS at NIC Bhubaneswar/Pune/Hyderabad
- **IT Act Section 65B**: All evidence block hashes qualify as certified electronic evidence for court admissibility
- **Constitutional compliance**: Article 275, 282, 293, FRBM Act, Finance Commission award ceilings — all encoded and enforced on-chain
- **CERT-In compliance**: 6-hour breach notification workflow with automated key revocation

---

## Team

PRAMAANIK (ChainLedger) was built by Harctik (BCA Sem 6, U03BV23S0127) and team for the Cybersecurity & Blockchain track, Problem Statement 1: Public Fund Flow Tracking.

---

*Provable rupees. From sanction to last mile.*
