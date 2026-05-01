# PRAMAANIK — Provable Rupees. From Sanction to Last Mile.

> *prāmāṇika* (Sanskrit) — authentic, verifiable, having proof

[![CI](https://github.com/pramaanik/pramaanik/actions/workflows/ci.yml/badge.svg)](https://github.com/pramaanik/pramaanik/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Track](https://img.shields.io/badge/Track-Cybersecurity_%26_Blockchain-indigo)](https://github.com/pramaanik/pramaanik)

**The first public fund tracking system combining cryptographically anchored provenance, zero-knowledge selective disclosure for beneficiary privacy, and on-chain verifiable graph-neural-network anomaly detection — built compliant with the Digital Personal Data Protection Act 2023 and aligned with MeitY's National Blockchain Framework (September 2024).**

---

## The Problem, in Three Numbers

| Scandal | Scale | Root Cause PRAMAANIK Fixes |
|---|---|---|
| PMKVY (CAG Report No. 20/2025) | 94.53% of 95.9L beneficiary records had missing/invalid bank accounts; 12,122 accounts repeated across 52,381 supposedly distinct participants | No bank-account deduplication oracle; no graph-pattern anomaly detection |
| Gujarat Dahod MGNREGA (Apr 2025) | ₹71 Cr siphoned via ghost projects, manipulated geotags, and lowest-bidder bypass; 1 contractor received ₹5.28 Cr for 3.5 km of a 19.2 km road | No perceptual-hash deduplication; no on-chain work-completion attestation |
| Ayushman Bharat deceased-patient fraud | ₹6.97 Cr disbursed for treatment of 3,446 already-deceased patients | No multi-source oracle attestation at disbursement time |

---

## What We Built

```
┌─────────────────────────────────────────────────────────────────┐
│                     CITIZEN / AUDITOR / ADMIN                    │
│              Next.js 14  ·  Privado ID Wallet  ·  ERC-4337      │
├─────────────────────────────────────────────────────────────────┤
│              SMART CONTRACT LAYER (Hyperledger Besu / QBFT)      │
│  SchemeRegistry · FundFlow · AnomalyOracle · AccessGovernance   │
│                  Anchor  ·  GrievancePortal                     │
├──────────────────────┬──────────────────────────────────────────┤
│   ORACLE LAYER       │        zkML PIPELINE                     │
│   Chainlink Fns      │  RGCN (PyG) → EZKL → Halo2 SNARK        │
│   GST · NPCI · Photo │  → AnomalyOracle verifier contract       │
├──────────────────────┴──────────────────────────────────────────┤
│                    DUAL PUBLIC ANCHOR                            │
│         Polygon Amoy (every 15 min)  ·  Ethereum Sepolia        │
└─────────────────────────────────────────────────────────────────┘
```

**Four properties that make fund fraud impossible by construction:**
1. **Cryptographic chain-of-custody** — every rupee's path is an immutable Besu event, Merkle-anchored to public Ethereum
2. **Multi-source oracle attestation** — GST validity, bank-account uniqueness, and geotag deduplication checked at disbursement time
3. **On-chain verifiable GNN anomaly detection** — fraud flags come with zk-SNARK proofs that the published model produced them
4. **Citizen-verifiable provenance without PII exposure** — Privado ID zero-knowledge credentials; beneficiary identities never touch the chain

---

## One-Command Spin-Up

```bash
git clone https://github.com/pramaanik/pramaanik
cd pramaanik
cp .env.example .env          # fill in Pinata key + Privado ID issuer keys
docker compose up --build
```

The stack comes up in under 3 minutes on a 16 GB laptop. Services:

| Service | Port | Description |
|---|---|---|
| Besu RPC | 8545 | 4-validator QBFT consortium |
| Neo4j Browser | 7474 | Fund-flow graph database |
| GNN Inference | 8080 | FastAPI — fraud scoring endpoint |
| EZKL Prover | 8081 | zk-SNARK proof generation queue |
| Oracle Relayer | 8082 | Chainlink Functions local harness |
| IPFS Node | 5001 | Local + Pinata remote pinning |
| Anchor Publisher | 8083 | Merkle-root poster to Polygon + Sepolia |
| Frontend | 3000 | Next.js 14 — Admin / Auditor / Citizen |

After spin-up, seed the demo scenario:
```bash
pnpm run seed:demo
```

---

## Repository Structure

```
pramaanik/
├── contracts/          # Foundry project — 6 Solidity contracts
│   ├── src/            # SchemeRegistry, FundFlow, AnomalyOracle, ...
│   ├── test/           # ≥90% coverage, 10k fuzz runs
│   ├── script/         # Deploy.s.sol → deployments.json
│   └── audit/          # Slither + Aderyn + Mythril reports (CI-generated)
├── services/
│   ├── gnn/            # Python · FastAPI · PyTorch Geometric · Neo4j
│   ├── zkml/           # Python · EZKL · Redis job queue
│   ├── oracle/         # Node.js · Chainlink Functions local harness
│   ├── storage/        # Node.js · IPFS · Pinata · hybrid encryption
│   └── anchor/         # Node.js · Merkle builder · Polygon + Sepolia poster
├── apps/
│   └── web/            # Next.js 14 · Tailwind · shadcn/ui · ethers.js v6
├── data/               # Synthetic dataset generator + pre-seeded demo data
├── docs/
│   ├── architecture-diagram.svg
│   ├── demo-script.md
│   ├── dpdp-compliance.md
│   └── threat-model.md
├── docker-compose.yml
├── ARCHITECTURE.md
├── SECURITY.md
└── RESEARCH_REPORT.md
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Base ledger | Hyperledger Besu (QBFT) | EVM-compatible; Apache 2.0; Linux Foundation |
| Public anchor | Polygon Amoy + Ethereum Sepolia | Tamper evidence even against full-validator collusion |
| Identity | Privado ID (W3C DID + VC + ZK) | DPDP-compliant selective disclosure; no PII on chain |
| Smart contracts | Solidity 0.8.24 + OpenZeppelin v5 + UUPS | OWASP SC Top 10 2025; TimelockController for upgrades |
| Anomaly detection | RGCN (PyTorch Geometric) + EZKL (Halo2) | Verifiable on-chain fraud flags with zk-SNARK proofs |
| Oracles | Chainlink Functions | Production-grade external attestation |
| Storage | IPFS + Pinata (hybrid-encrypted) | Content-addressed; PII never on chain |
| Gas abstraction | ERC-4337 + Pimlico bundler | Citizens never hold MATIC/ETH |
| Frontend | Next.js 14 + shadcn/ui + d3 | Three-role experience; Hindi i18n |

---

## Security

See [SECURITY.md](SECURITY.md) for the full smart-contract security report including Slither, Aderyn, and Mythril outputs.

Test coverage: `forge coverage` → **≥90%** on all contracts.
Fuzz runs: `forge test --fuzz-runs 10000`.

---

## Regulatory Alignment

- **DPDP Act 2023**: PII kept off-chain in hybrid-encrypted IPFS; on-chain data is pseudonymous DIDs and SHA-256 hashes — "data minimized by design"
- **MeitY National Blockchain Framework (Sep 2024)**: Architecture designed to deploy on Vishvasya BaaS at NIC Bhubaneswar/Pune/Hyderabad
- **Path to production**: Oracle endpoints swap from mock → real GSTN/NPCI APIs without contract changes; validator set scales to 15+ NIC nodes

---

## Team

PRAMAANIK was built by Harctik (BCA Sem 6, U03BV23S0127) and team for the Cybersecurity & Blockchain track, Problem Statement 1: Public Fund Flow Tracking.

---

*Provable rupees. From sanction to last mile.*
