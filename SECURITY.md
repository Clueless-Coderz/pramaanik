# ChainLedger / PRAMAANIK — Security Report

## Smart Contract Security (8 Contracts)

### Tooling

| Tool | Purpose | Status |
|---|---|---|
| Slither | Static analysis (Trail of Bits) | ✅ CI-integrated |
| Mythril | Symbolic execution | ✅ CI-integrated |
| Aderyn | Solidity security linter | ✅ CI-integrated |
| Forge Test | Unit + fuzz + integration testing (10k runs) | ✅ 9 integration tests + 3 unit tests |

### Contract Security Summary

| Contract | Access Control | Reentrancy Guard | UUPS | Multi-Sig |
|---|---|---|---|---|
| `AccessGovernance` | ✅ ADMIN + UPGRADER | — | ✅ | — |
| `SchemeRegistry` | ✅ ADMIN + AUDITOR | — | ✅ | — |
| `FundFlow` | ✅ ADMIN + AUDITOR + ORACLE | ✅ | ✅ | ✅ 2-of-3 for >₹5Cr |
| `AnomalyOracle` | ✅ ADMIN + PROVER | ✅ | ✅ | — |
| `BatchVerifier` | ✅ ADMIN + PROVER | — | ✅ | — |
| `ConstitutionalCompliance` | ✅ ADMIN + CAG | — | ✅ | — |
| `Anchor` | ✅ ADMIN + ANCHOR | — | ✅ | — |
| `GrievancePortal` | ✅ ADMIN + CITIZEN + AUDITOR | ✅ | ✅ | — |

### OWASP Smart Contract Top 10 (2025) Mitigations

| # | Vulnerability | Mitigation in ChainLedger |
|---|---|---|
| SC01 | Access Control | OpenZeppelin AccessControl with role hierarchy; 7 distinct roles across 8 contracts |
| SC02 | Price Oracle Manipulation | Not applicable (no DeFi pricing); oracle attestations are boolean checks with circuit breakers |
| SC03 | Logic Errors | Foundry fuzz testing with 10k+ runs; Checks-Effects-Interactions enforced; 9 integration tests |
| SC04 | Lack of Input Validation | All public functions validate inputs; custom errors for all failure modes |
| SC05 | Reentrancy | OpenZeppelin ReentrancyGuard on all state-changing functions in FundFlow and GrievancePortal |
| SC06 | Unchecked External Calls | AnomalyOracle → FundFlow call wrapped with success check |
| SC07 | Flash Loan Attacks | Not applicable (no liquidity pools) |
| SC08 | Integer Overflow | Solidity 0.8.24 checked arithmetic by default |
| SC09 | Insecure Randomness | No randomness used; IDs are deterministic keccak256 hashes |
| SC10 | Denial of Service | Paginated views; no unbounded loops in critical paths |

### Multi-Signature Security (ChainLedger §4.2.3)

High-value disbursements (>₹5 Crore) require 2-of-3 approval from designated officials:

```
                 ₹5 Cr Threshold
                      │
    Below ₹5 Cr       │      Above ₹5 Cr
    ─────────────      │      ─────────────
    Auto-approved      │      2-of-3 multi-sig required
    Single admin       │      Creator gets 1st approval
    can advance        │      Second admin must call approveMultiSig()
                       │      Only then can advanceStage() proceed
```

The multi-sig gate is enforced at the smart contract level — no application-layer bypass is possible.

### Upgrade Security

- **Pattern**: UUPS (Universal Upgradeable Proxy Standard)
- **Guard**: `UPGRADER_ROLE` required for `_authorizeUpgrade()`
- **Production target**: TimelockController (48h delay) + Gnosis Safe multisig

## Key Management

| Key Type | Storage | Rotation | Revocation |
|---|---|---|---|
| Validator keys (×4) | HSM (YubiHSM 2 / CloudHSM) | Every 90 days | QBFT validator removal proposal |
| Admin multisig | Gnosis Safe (3-of-5) | On personnel change | Emergency key ceremony |
| Oracle service keys | AWS KMS / Environment variables | Every 30 days | Circuit breaker + re-key |
| EZKL prover keys | Ephemeral per proof session | Per-proof | N/A |
| CAG master key | 3-of-5 Shamir Secret Sharing (HSM) | Annual ceremony | Full re-key ceremony |
| Publisher keys | HSM / AWS KMS | Every 90 days | Anchor contract owner update |

### CERT-In Compliance

Per the Cyber Security Directions of 28 April 2022:
- **6-hour breach notification**: Automated incident detection triggers `IncidentResponder` class
- **Key revocation**: Immediate key rotation via KMS provider abstraction
- **Evidence preservation**: All blockchain events are immutable; block hashes qualify as IT Act §65B evidence
- **Audit trail**: Full logging with Prometheus metrics and structured JSON logs

## Threat Model

### STRIDE Analysis

| Threat | Category | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| Validator collusion (>1/3 BFT) | Tampering | Chain halt / silent rewrite | Low | Dual public anchoring to Polygon + Ethereum |
| Insider admin creates fraud record | Elevation of Privilege | False disbursement | Medium | Multi-sig for >₹5Cr; anomaly detection on admin activity |
| Oracle data manipulation | Spoofing | False GST/bank attestation | Medium | Circuit breakers; multi-source aggregation; fallback mocks |
| GNN model poisoning | Tampering | Missed fraud | Low | Model hash committed on-chain; PSI drift detection |
| Key compromise (single key) | Information Disclosure | Unauthorized transactions | Medium | HSM storage; Shamir Secret Sharing; 30/90 day rotation |
| DDoS on Besu validators | Denial of Service | Block production stall | Medium | Multi-region deployment; Prometheus alerts on peer count |
| Front-running vendor whitelist | Tampering | Unauthorized vendor | Low | Commit-reveal pattern on whitelist updates |
| Sybil citizen accounts | Spoofing | Fake grievances | Medium | Privado ID proof-of-personhood; rate limiting |
| Shell company rings | Tampering | Fraudulent vendor payments | High | Graph-based ShellCompanyDetector (ChainLedger §4.11) |

### Application-Layer Threats

| Threat | Mitigation |
|---|---|
| Sybil citizen accounts | Privado ID proof-of-personhood; rate limiting; CAPTCHA |
| IPFS content tampering | On-chain SHA-256 hash verification; Pinata pinning; 3-geo-copy minimum |
| GNN model poisoning | Model hash committed on-chain; training data hash auditable |
| Key compromise | HSM storage; Shamir Secret Sharing for recovery; automated key rotation |
| Neo4j injection | Parameterized Cypher queries; read replicas for public access |

## Incident Response Workflow

```
T+0:00  — Alert fires (Prometheus / PagerDuty)
         ├── Chain health: besu_peers_connected < 3
         ├── Service health: up{job="gnn-inference"} == 0
         ├── Security: circuit_breaker_trips > 0
         └── AI drift: gnn_drift_detected == 1

T+0:05  — On-call engineer acknowledges

T+0:15  — Initial diagnosis
         ├── Which component? (Besu / GNN / Oracle / Prover)
         ├── Which region? (ap-south-1 / ap-south-2)
         └── Severity classification (LOW / MEDIUM / HIGH / CRITICAL)

T+0:30  — Containment
         ├── freezeDisbursement() by auditor (if fund-related)
         ├── Circuit breaker auto-opens (if oracle-related)
         └── Key rotation initiated (if key compromise suspected)

T+1:00  — Status update to stakeholders

T+6:00  — CERT-In notification (mandatory for data breaches per DPDP Act §15)

T+24:00 — Post-incident review (PIR) document

T+72:00 — Preventive measures implemented; PIR published
         └── If CRITICAL + unresolved → ConstitutionalCompliance.generateAutoFIR()
```

## Constitutional Compliance Enforcement

The `ConstitutionalCompliance.sol` contract encodes the following legal rules:

| Rule | Legal Basis | On-Chain Enforcement |
|---|---|---|
| Grants to States | Article 275 | Budget ceiling check before fund release |
| Expenditure from CFI | Article 282 | Scheme registry linkage required |
| Fiscal Deficit Limit | FRBM Act 2003 | Aggregate spending cap enforcement |
| Finance Commission Awards | 15th/16th FC | Award ceiling verification |
| State Borrowing Limits | Article 293 | State-level spending cap |

When a CRITICAL violation remains unresolved for 72 hours, the system auto-generates an FIR draft with:
- Accused entity (identified by DID)
- IPC sections (409 — criminal breach of trust, 420 — cheating)
- Digitally signed evidence (block hash as IT Act §65B certified evidence)
- Auto-submission to e-FIR portal

## Compliance Certifications (Production Target)

- ISO/IEC 27001:2022 (ISMS)
- SOC 2 Type II
- ISO/IEC 27701 (Privacy)
- CERT-In Cyber Security Directions (28 Apr 2022)
- MeitY GIGW 3.0 Guidelines
- DPDP Act 2023 §17 Government Exemption
