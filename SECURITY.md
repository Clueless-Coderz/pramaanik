# PRAMAANIK — Security Report

## Smart Contract Security

### Tooling

| Tool | Purpose | Status |
|---|---|---|
| Slither | Static analysis (Trail of Bits) | ✅ CI-integrated |
| Mythril | Symbolic execution | ✅ CI-integrated |
| Aderyn | Solidity security linter | ✅ CI-integrated |
| Forge Test | Unit + fuzz testing (10k runs) | ✅ ≥90% coverage target |

### OWASP Smart Contract Top 10 (2025) Mitigations

| # | Vulnerability | Mitigation in PRAMAANIK |
|---|---|---|
| SC01 | Access Control | OpenZeppelin AccessControl with role hierarchy; ADMIN_ROLE, AUDITOR_ROLE, ORACLE_ROLE, CITIZEN_ROLE |
| SC02 | Price Oracle Manipulation | Not applicable (no DeFi pricing); oracle attestations are boolean checks |
| SC03 | Logic Errors | Foundry fuzz testing with 10k+ runs; Checks-Effects-Interactions enforced |
| SC04 | Lack of Input Validation | All public functions validate inputs; custom errors for all failure modes |
| SC05 | Reentrancy | OpenZeppelin ReentrancyGuard on all state-changing functions in FundFlow |
| SC06 | Unchecked External Calls | AnomalyOracle → FundFlow call wrapped with success check |
| SC07 | Flash Loan Attacks | Not applicable (no liquidity pools) |
| SC08 | Integer Overflow | Solidity 0.8.24 checked arithmetic by default |
| SC09 | Insecure Randomness | No randomness used; IDs are deterministic keccak256 hashes |
| SC10 | Denial of Service | Paginated views; no unbounded loops in critical paths |

### Upgrade Security

- **Pattern**: UUPS (Universal Upgradeable Proxy Standard)
- **Guard**: `UPGRADER_ROLE` required for `_authorizeUpgrade()`
- **Production target**: TimelockController (48h delay) + Gnosis Safe multisig

### Key Management

| Key Type | Storage | Rotation |
|---|---|---|
| Validator keys | HSM (YubiHSM 2 / CloudHSM) | Every 90 days |
| Admin multisig | Gnosis Safe (3-of-5) | On personnel change |
| Oracle service keys | Environment variables (CI secrets) | Every 30 days |
| EZKL prover keys | Ephemeral per proof session | Per-proof |

## Threat Model

### Permissioned Chain Threats

| Threat | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Validator collusion (>1/3 BFT) | Chain halt / fork | Low (requires 3+ of 7 state actors) | Dual public anchoring detects silent rewrites |
| Insider admin mints fraud record | False disbursement | Medium | Dual-control multisig; anomaly detection on admin activity |
| Oracle manipulation | False attestation | Medium | Multi-source aggregation; TEE-attested oracle nodes planned |
| Front-running vendor whitelist | Unauthorized vendor | Low | Commit-reveal pattern on whitelist updates |
| Signature replay across chains | Double-spend illusion | Low | chainId included in all signatures |

### Application-Layer Threats

| Threat | Mitigation |
|---|---|
| Sybil citizen accounts | Privado ID proof-of-personhood; rate limiting; CAPTCHA |
| IPFS content tampering | On-chain SHA-256 hash verification; Pinata pinning |
| GNN model poisoning | Model hash committed on-chain; training data hash auditable |
| Key compromise | HSM storage; Shamir Secret Sharing for recovery; key rotation |

## Incident Response

1. **Detection**: On-chain anomaly flags + off-chain monitoring
2. **Containment**: `freezeDisbursement()` by auditor (human-in-the-loop)
3. **Investigation**: Full audit trail on-chain; Neo4j graph analysis
4. **Recovery**: UUPS upgrade if contract vulnerability; key rotation if key compromise
5. **Reporting**: CERT-In 6-hour notification requirement; DPDP Board notification

## Compliance Certifications (Production Target)

- ISO/IEC 27001:2022 (ISMS)
- SOC 2 Type II
- ISO/IEC 27701 (Privacy)
- CERT-In Cyber Security Directions (28 Apr 2022)
- MeitY GIGW 3.0 Guidelines
