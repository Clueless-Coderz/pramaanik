# PRAMAANIK — Strategic Research Report

> Industrial-Grade Research Report: Blockchain-Based Public Fund Flow Tracking System
> with Multi-Role Access and Automatic Anomaly Flagging

## Executive Summary

This report compiles deep research across ten dimensions to support a hackathon project that must simultaneously (a) outperform 60 competing teams and (b) defensibly position itself ahead of every existing real-world public fund tracking system. The primary market is India, where the Public Financial Management System (PFMS) and Direct Benefit Transfer (DBT) infrastructure handle trillions of rupees annually but continue to suffer from architectural debt, audit blind spots, and recurring high-value scandals.

The global landscape — USAspending.gov, the EU Financial Transparency System (FTS), and the World Food Programme's Building Blocks — establishes both a benchmark and a clear novelty space: **no production system today combines** (i) cryptographically anchored fund-flow provenance, (ii) zero-knowledge selective disclosure for beneficiary privacy, (iii) graph-neural-network anomaly detection with verifiable on-chain inference, and (iv) tri-role access governance under India's DPDP Act 2023 framework.

That intersection is PRAMAANIK's defensible novelty thesis.

---

## 1. Existing Real-World Systems: Benchmarks to Outclass

### 1.1 India's PFMS
- Centralized web application operated by CGA, Ministry of Finance
- Launched 2009 as CPSMS, rebranded PFMS in 2016
- Integrates with 50+ beneficiary management applications (PM-KISAN, NSAP, MNREGASoft, etc.)
- **Documented limitations**: Architectural debt, no cryptographic tamper-evidence, off-book expenditures (CAG FY 2022-23), 18-24 month audit lag, SNA reporting gaps (₹1,034.48 Cr in Sikkim alone)

### 1.2 Direct Benefit Transfer (DBT)
- Covers 1,000+ schemes with cumulative savings of ₹3.48 lakh crore
- **Documented leakages**: LPG/Airtel Payment Bank scam (₹190 Cr), scholarship scams across multiple states, last-mile MGNREGA failures, Gujarat Dahod MGNREGA scam (₹71 Cr, FIR April 2025), PMKVY 94.53% invalid bank accounts (CAG Report No. 20/2025), Ayushman Bharat deceased-patient fraud (₹6.97 Cr)

### 1.3 International Equivalents
- **USAspending.gov**: Persistent quality issues (GAO-22-104702, GAO-24-106214)
- **EU FTS**: Excludes up to 75% of EU budget historically
- **WFP Building Blocks**: Gold-standard analog — 1M+ refugees, $555M processed, but no public auditability or anomaly detection
- **IMF Guinea-Bissau blockchain**: Closest live precedent (26,600 officials, May 2024)

---

## 2. Technical Architecture

### Recommended Stack
**Hyperledger Besu** permissioned consortium (NIC + state treasuries + CAG + RBI as validators) with IBFT 2.0/QBFT consensus, periodic Merkle-root anchoring to Polygon PoS and Ethereum mainnet, with Tessera for private transactions.

### Why Besu
- 23,000+ monthly active Solidity developers (Electric Capital 2024)
- EVM-compatible, Apache 2.0, Linux Foundation
- Public-Ethereum compatibility for tamper-evidence
- Compatible with MeitY Vishvasya BaaS stack

### zkML Pipeline
- **EZKL** (Zkonduit): Compiles ONNX models into Halo2 zk-SNARK circuits
- GNN runs off-chain → produces binary flag + feature-attribution explanation + EZKL-generated proof
- Proof posted on-chain for anyone to verify

---

## 3. Anomaly Detection

### Fraud Patterns Addressed
1. Bid rigging / collusion (Benford's Law deviation)
2. Ghost vendors (shared addresses, registration date anomalies)
3. Split contracts (threshold avoidance — amount clustering at ₹4.99L, ₹9.99L)
4. Round-tripping (circular fund flows)
5. Time-based anomalies (bursts before fiscal-year-end)
6. Beneficiary collusion (shared bank accounts — PMKVY pattern)
7. Geotag photo manipulation (Gujarat MGNREGA pattern)
8. Deceased beneficiary disbursement (Ayushman Bharat pattern)

### Detection Architecture
- **Tier 1**: Rule-based on-chain preconditions
- **Tier 2**: Statistical ML (Isolation Forest, XGBoost, Benford's Law)
- **Tier 3**: Graph Neural Networks (RGCN, GraphSAGE, GAT)
- **Tier 4**: Pattern Mining (PANG-style subgraph motifs for explainability)

---

## 4. Regulatory Compliance

### DPDP Act 2023
- Government exemption (§17) is the legal anchor for permanent ledger
- PII kept off-chain with cryptographic erasure capability
- See [docs/dpdp-compliance.md](docs/dpdp-compliance.md) for full mapping

### RBI Alignment
- Compatible with Digital Rupee (e₹) programmability framework
- Aligned with HDFC Bank user-level programmability (August 2024)

---

## 5. Competitive Novelty

No production system in India or globally combines these as of May 2026:

1. **zkML-verified anomaly detection** — GNN + EZKL zk-SNARK proofs
2. **Selective disclosure** — Privado ID + verifiable credentials
3. **Dual-anchoring** — Besu → Polygon PoS + Ethereum
4. **DPDP-by-design** — §17 exemption properly mapped
5. **Chainlink-DECO-attested oracles** — PFMS, GSTN, NPCI integration
6. **PANG explainability** — human-readable subgraph motifs
7. **Citizen Audit interface** — gasless ERC-4337 fund tracing
8. **Programmable disbursement** — e₹ CBDC interoperability
9. **Vishvasya BaaS alignment** — MeitY NBF September 2024

---

## 6. Honest Limitations

1. **Garbage-in/garbage-out**: Blockchain cannot make false invoices true
2. **Last-mile cash verification**: Physical-world question
3. **Political will**: Detection ≠ accountability
4. **Scalability ceiling**: Besu QBFT at 200-800 TPS vs PFMS's 5+ Cr transactions
5. **Adoption inertia**: TradeLens failure demonstrates governance risk
6. **Legal uncertainty**: Edge cases around immutability vs erasure
7. **Validator centralization**: Federation of state actors, not trustless

---

## 7. Key References

1. NITI Aayog (2020). Blockchain: The India Strategy, Part I
2. CAG Performance Audit Report No. 20 of 2025 — PMKVY
3. DPDP Act 2023 + DPDP Rules 2025
4. MeitY National Blockchain Framework (September 2024)
5. Cheng, D. et al. (2024). "Graph Neural Networks for Financial Fraud Detection." arXiv:2411.05815
6. Potin, L. et al. (2023). "Pattern Mining for Anomaly Detection in Graphs." arXiv:2306.10857
7. EZKL Team (2025). State of EZKL: 2025
8. OWASP Smart Contract Top 10 (2025)
9. WFP Building Blocks Case Study (2017-present)
10. Verdugo Yepes, IMF (2024). Guinea-Bissau Blockchain for Fiscal Transparency

Full reference list: 60 sources compiled in the original research report.

---

## Concluding Strategic Recommendation

> "A DPDP-Act-compliant, Vishvasya-aligned permissioned consortium blockchain on Hyperledger Besu, anchored to Polygon PoS and Ethereum, with Chainlink-DECO-attested oracles into PFMS / GSTN / NPCI / MNREGASoft, multi-role access governed by W3C DIDs and Polygon-ID Verifiable Credentials, and a graph-neural-network anomaly detector whose every flag is verifiable on-chain via EZKL-generated zk-SNARK proofs."

No production system in India or globally combines these elements as of May 2026.

---

*PRAMAANIK. Provable rupees. From sanction to last mile.*
