# ChainLedger / PRAMAANIK — Architecture Document

## System Overview

ChainLedger (PRAMAANIK) is a **Blockchain-Based Public Fund Flow Tracking System** that mirrors India's 5-tier constitutional governance hierarchy (Central → State → District → City/Town → Village). It provides cryptographic chain-of-custody for every rupee, from Union Budget sanction to Gram Panchayat last-mile delivery.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CITIZEN / AUDITOR / ADMIN                    │
│              Next.js 14  ·  Privado ID Wallet  ·  ERC-4337      │
├─────────────────────────────────────────────────────────────────┤
│        SMART CONTRACT LAYER (Hyperledger Besu / 4-Node QBFT)    │
│  SchemeRegistry · FundFlow · AnomalyOracle · AccessGovernance   │
│  Anchor · GrievancePortal · BatchVerifier · ConstitutionalComp  │
├──────────────────────┬──────────────────────────────────────────┤
│   ORACLE LAYER       │        zkML PIPELINE                     │
│   GSTN Sandbox       │  3-Layer RGCN (PyG) → EZKL → Halo2      │
│   NPCI NACH          │  → AnomalyOracle verifier contract       │
│   NIC Geotag         │  → BatchVerifier (Merkle aggregation)     │
│   Circuit Breakers   │  → Redis async queue + GPU provers        │
├──────────────────────┴──────────────────────────────────────────┤
│              5-TIER GOVERNANCE HIERARCHY (ChainLedger §2.1)      │
│   Central → State → District → City/Town → Village/Panchayat    │
├─────────────────────────────────────────────────────────────────┤
│                    DUAL PUBLIC ANCHOR                            │
│         Polygon Amoy (every 15 min)  ·  Ethereum Sepolia        │
├─────────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY STACK                           │
│         Prometheus  ·  Grafana  ·  Structured Logging            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Smart Contract Layer (8 Contracts on Hyperledger Besu QBFT)

| Contract | Purpose | Key Functions |
|---|---|---|
| `AccessGovernance` | Tri-role DID-based RBAC with UUPS | `registerIdentity()`, `deactivateIdentity()` |
| `SchemeRegistry` | Welfare scheme registry with budget enforcement | `registerScheme()`, `freezeScheme()`, `reviseBudget()` |
| `FundFlow` | Core 5-tier fund tracking with multi-sig & util certs | `createDisbursement()`, `approveMultiSig()`, `submitUtilizationCert()` |
| `AnomalyOracle` | zkML proof verification and auto-flagging | `commitModel()`, `submitPrediction()` |
| `BatchVerifier` | Merkle-tree proof aggregation (O(1) gas) | `submitBatch()`, `verifyProofInBatch()` |
| `ConstitutionalCompliance` | Article 275/282, FRBM, Auto-FIR, Lokpal | `recordViolation()`, `generateAutoFIR()` |
| `Anchor` | Dual-chain Merkle root checkpointing | `createCheckpoint()`, `verifyInclusion()` |
| `GrievancePortal` | Citizen grievance with evidence hashing | `fileGrievance()`, `resolveGrievance()` |

All contracts use UUPS upgradeability and OpenZeppelin v5 AccessControl.

### 2. Off-Chain Services

| Service | Technology | Port | Purpose |
|---|---|---|---|
| GNN Inference | FastAPI + PyTorch Geometric + Neo4j | 8080 | RGCN anomaly scoring + PSI drift detection |
| EZKL Prover | Python + EZKL + Redis | 8081 | Async zk-SNARK proof generation with batching |
| Oracle Relayer | Node.js + GSTN/NPCI/NIC APIs | 8082 | External data attestation with circuit breakers |
| KMS Service | Node.js + HSM/AWS KMS | — | Key rotation (90d validators, 30d oracles) |
| Storage | Node.js + IPFS + Pinata | 5001 | Hybrid-encrypted document storage |
| Anchor Publisher | Node.js + ethers.js | — | Merkle root posting to public chains |

### 3. Data Flow (Full Pipeline)

```
 1. Admin sanctions scheme      → SchemeRegistry.registerScheme()
 2. Admin creates disbursement  → FundFlow.createDisbursement()
    ├── If amount > ₹5Cr        → Multi-sig required (2-of-3 officials)
    ├── Oracle checks            → GSTN valid? Bank unique? Geotag verified?
    └── If oracle fails          → Circuit breaker opens, falls back to mock
 3. Transaction graph updated   → Neo4j (graph database)
 4. GNN scores transaction      → RGCN 3-layer inference
 5. EZKL generates proof        → Halo2 zk-SNARK (async Redis queue)
 6. Proof submitted on-chain    → AnomalyOracle.submitPrediction()
    └── Batch aggregation        → BatchVerifier.submitBatch() (O(1) gas)
 7. If risk >= 75%              → FundFlow.flagSuspicious() auto-called
 8. If CRITICAL + 72h unresolved → ConstitutionalCompliance.generateAutoFIR()
    └── Lokpal auto-notified     → LokpalNotified event emitted
 9. Auditor reviews             → freezeDisbursement() or dismiss
10. Work completed              → submitUtilizationCert() → CAG verifies
11. Anchor batches Merkle root  → Polygon Amoy + Ethereum Sepolia (every 15 min)
12. Citizen traces fund flow    → verifyInclusion() against anchored root
```

### 4. Consensus & Validators

- **Consensus**: QBFT (Quorum Byzantine Fault Tolerant)
- **Validators**: 4-node consortium (NIC, Ministry of Finance, CAG, RBI)
- **Genesis**: `besu-config/genesis.json` with embedded validator set in `extraData`
- **Fault tolerance**: Tolerates ⌊(n-1)/3⌋ Byzantine validators (1 of 4)
- **Block time**: ~2 seconds
- **Finality**: Immediate (single-block finality)

### 5. Privacy Architecture (DPDP Act 2023 Compliance)

```
ON-CHAIN (public):
  ├── Pseudonymous DID hashes
  ├── Amounts (in paisa)
  ├── Timestamps
  ├── SHA-256 document hashes
  ├── zk-SNARK proof hashes
  ├── Governance level (Central/State/District/City/Village)
  └── Utilization certificate hashes

OFF-CHAIN (encrypted):
  ├── Aadhaar-derived VCs (Privado ID)
  ├── Bank account numbers
  ├── Physical addresses
  ├── Supporting documents (IPFS + Pinata)
  └── Personal identification data
```

**Legal basis**: DPDP Act §17 government exemption allows permanent ledger for public expenditure audit. PII kept off-chain with cryptographic erasure capability via key rotation.

### 6. Security & Key Management

| Key Type | Rotation Period | Storage | Revocation |
|---|---|---|---|
| Validator keys | 90 days | HSM / AWS KMS | Instant via QBFT proposal |
| Oracle signer keys | 30 days | AWS KMS | Circuit breaker + re-key |
| Publisher keys | 90 days | HSM | Anchor contract owner update |
| CAG master key | Annual | 3-of-5 Shamir Secret Sharing | Ceremony-based |

### 7. Observability

| Component | Metrics Endpoint | Key Alerts |
|---|---|---|
| Besu validators | `:9545/metrics` | Peers < 3, block production stalled |
| GNN inference | `:8080/metrics` | PSI drift detected, P99 > 500ms |
| EZKL prover | `:8081/metrics` | Queue depth > 50, SLA breaches |
| Oracle relayer | `:8082/metrics` | Circuit breaker open |

## Deployment Targets

| Environment | Chain | Purpose |
|---|---|---|
| Local Dev | 4-node Besu QBFT (docker-compose) | Development & testing |
| Testnet | Besu QBFT + Polygon Amoy + Sepolia | Hackathon demo |
| Production | Vishvasya BaaS (MeitY NBF) + Polygon PoS + Ethereum | National deployment |
