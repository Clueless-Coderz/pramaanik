# PRAMAANIK — Architecture Document

## System Overview

PRAMAANIK is a **Blockchain-Based Public Fund Flow Tracking System** with multi-role access and automatic anomaly flagging, designed to provide cryptographic chain-of-custody for every rupee flowing from the Consolidated Fund of India to last-mile beneficiaries.

## Architecture Diagram

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

## Component Breakdown

### 1. Smart Contract Layer (Hyperledger Besu QBFT)

| Contract | Purpose | Key Functions |
|---|---|---|
| `AccessGovernance` | Tri-role DID-based RBAC | `registerIdentity()`, `deactivateIdentity()` |
| `SchemeRegistry` | Welfare scheme registry | `registerScheme()`, `freezeScheme()`, `reviseBudget()` |
| `FundFlow` | Core disbursement tracking | `createDisbursement()`, `advanceStage()`, `flagSuspicious()` |
| `AnomalyOracle` | zkML proof verification | `commitModel()`, `submitPrediction()` |
| `Anchor` | Merkle-root checkpointing | `createCheckpoint()`, `verifyInclusion()` |
| `GrievancePortal` | Citizen grievance system | `fileGrievance()`, `resolveGrievance()` |

All contracts use UUPS upgradeability and OpenZeppelin v5 AccessControl.

### 2. Off-Chain Services

| Service | Technology | Port | Purpose |
|---|---|---|---|
| GNN Inference | FastAPI + PyTorch Geometric | 8080 | RGCN-based anomaly scoring |
| EZKL Prover | Python + EZKL | 8081 | zk-SNARK proof generation |
| Oracle Relayer | Node.js + Chainlink | 8082 | External data attestation |
| Storage | Node.js + IPFS + Pinata | 5001 | Hybrid-encrypted document storage |
| Anchor Publisher | Node.js + ethers.js | 8083 | Merkle root posting to public chains |

### 3. Data Flow

```
1. Admin sanctions scheme → SchemeRegistry.registerScheme()
2. Admin creates disbursement → FundFlow.createDisbursement()
   → Oracle checks: GST valid? Bank unique? Geotag verified?
3. Transaction graph updated in Neo4j
4. GNN scores transaction → EZKL generates zk-SNARK proof
5. AnomalyOracle.submitPrediction() → on-chain verification
6. If risk >= threshold → FundFlow.flagSuspicious() auto-called
7. Auditor reviews → freezeDisbursement() or dismiss
8. Anchor service batches Merkle root → Polygon Amoy + Ethereum Sepolia
9. Citizen traces fund flow → verifyInclusion() against anchored root
```

### 4. Consensus & Validators

- **Consensus**: QBFT (Quorum Byzantine Fault Tolerant)
- **Validators**: NIC + State Treasuries + CAG + RBI (minimum 4, target 7+)
- **Fault tolerance**: Tolerates ⌊(n-1)/3⌋ Byzantine validators
- **Block time**: ~2 seconds
- **Finality**: Immediate (single-block finality)

### 5. Privacy Architecture (DPDP Act 2023 Compliance)

```
ON-CHAIN (public):
  ├── Pseudonymous DID hashes
  ├── Amounts (in paisa)
  ├── Timestamps
  ├── SHA-256 document hashes
  └── zk-SNARK proof hashes

OFF-CHAIN (encrypted):
  ├── Aadhaar-derived VCs (Privado ID)
  ├── Bank account numbers
  ├── Physical addresses
  ├── Supporting documents (IPFS + Pinata)
  └── Personal identification data
```

**Legal basis**: DPDP Act §17 government exemption allows permanent ledger for public expenditure audit. PII kept off-chain with cryptographic erasure capability via key rotation.

## Deployment Targets

| Environment | Chain | Purpose |
|---|---|---|
| Local Dev | Besu Dev (docker-compose) | Development & testing |
| Testnet | Besu QBFT + Polygon Amoy + Sepolia | Hackathon demo |
| Production | Vishvasya BaaS (MeitY NBF) + Polygon PoS + Ethereum | National deployment |
