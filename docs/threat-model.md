# PRAMAANIK Threat Model

## System Boundaries

```
┌──────────────────────────────────────────────────┐
│  TRUST BOUNDARY: Permissioned Besu Consortium     │
│  Validators: NIC, State Treasuries, CAG, RBI      │
│  Assumption: <1/3 validators are Byzantine         │
├──────────────────────────────────────────────────┤
│  TRUST BOUNDARY: Off-Chain Services               │
│  GNN, EZKL, Oracle, IPFS                          │
│  Assumption: Service operators are honest-but-     │
│  curious; outputs are verifiable on-chain          │
├──────────────────────────────────────────────────┤
│  TRUST BOUNDARY: Public Chains                     │
│  Polygon Amoy, Ethereum Sepolia                    │
│  Assumption: Public chain security guarantees hold │
└──────────────────────────────────────────────────┘
```

## STRIDE Analysis

### Spoofing
| Attack | Target | Mitigation |
|---|---|---|
| Fake admin identity | AccessGovernance | DID + VC verification; hardware key custody |
| Impersonated oracle | FundFlow.flagSuspicious() | ORACLE_ROLE access control; key rotation |
| Fake citizen grievance | GrievancePortal | CITIZEN_ROLE via Privado ID VC |

### Tampering
| Attack | Target | Mitigation |
|---|---|---|
| Modify disbursement record | FundFlow storage | Immutable Besu state; dual public anchoring |
| Alter GNN model weights | AnomalyOracle | Model hash committed on-chain; IPFS-pinned weights |
| Tamper with IPFS documents | Supporting evidence | On-chain SHA-256 hash verification |
| Rewrite Besu chain history | Full validator collusion | Polygon + Ethereum Merkle root anchoring |

### Repudiation
| Attack | Target | Mitigation |
|---|---|---|
| Admin denies disbursement | FundFlow events | Immutable event logs with msg.sender |
| Auditor denies freeze | GrievancePortal | On-chain event with auditor address |

### Information Disclosure
| Attack | Target | Mitigation |
|---|---|---|
| Beneficiary identity leak | On-chain DID data | Pseudonymous DIDs only; PII off-chain |
| Oracle data exposure | Bank account / Aadhaar | DECO zero-knowledge attestation (planned) |
| GNN model extraction | Model weights | Model hash public; weights on IPFS with access control |

### Denial of Service
| Attack | Target | Mitigation |
|---|---|---|
| Flood Besu with transactions | Network throughput | Permissioned chain — only authorized nodes submit |
| Exhaust GNN service | Inference API | Rate limiting; queue-based processing |
| IPFS node unavailability | Document retrieval | Pinata remote pinning; redundant gateways |

### Elevation of Privilege
| Attack | Target | Mitigation |
|---|---|---|
| Citizen → Admin escalation | AccessGovernance roles | Role hierarchy with DEFAULT_ADMIN_ROLE guard |
| UUPS upgrade hijack | Contract logic | UPGRADER_ROLE + TimelockController (production) |
| Oracle → Admin capabilities | FundFlow state changes | ORACLE_ROLE can only flag, not freeze or disburse |

## Risk Matrix

| Threat | Impact | Likelihood | Risk Level | Status |
|---|---|---|---|---|
| Validator collusion | Critical | Low | Medium | Mitigated (dual anchoring) |
| Admin insider fraud | High | Medium | High | Mitigated (multisig + anomaly detection) |
| Oracle manipulation | High | Medium | High | Partially mitigated (multi-source planned) |
| Smart contract exploit | Critical | Low | Medium | Mitigated (audit tools + fuzz testing) |
| GNN model poisoning | Medium | Low | Low | Mitigated (model hash commitment) |
| IPFS content loss | Medium | Low | Low | Mitigated (Pinata pinning) |
| Key compromise | Critical | Low | Medium | Mitigated (HSM + rotation) |

## Residual Risks (Honest Limitations)

1. **Garbage-in problem**: Blockchain records what it's told. A corrupt official uploading a forged geotagged photo will produce a "valid" on-chain record. Mitigation is partial (satellite/drone cross-verification, social audit attestation).

2. **Last-mile physical verification**: Whether rice actually reaches a household is a physical-world question that no blockchain can answer.

3. **Political will**: Detection ≠ accountability. The system can flag fraud; it cannot compel prosecution.

4. **Scalability ceiling**: Besu QBFT at 200-800 TPS vs PFMS's 5+ crore transactions per scheme cycle. Layer-2 batching and chain-per-state sharding are required for national scale.
