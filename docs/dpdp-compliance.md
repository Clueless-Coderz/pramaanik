# DPDP Act 2023 Compliance Assessment — PRAMAANIK

## Overview

The Digital Personal Data Protection Act, 2023 (DPDP Act) and the Digital Personal Data Protection Rules, 2025 establish India's comprehensive data protection framework. This document maps PRAMAANIK's architecture against each applicable DPDP requirement.

## Data Classification

| Data Category | Location | DPDP Classification |
|---|---|---|
| Scheme names, budgets, timestamps | On-chain | Non-personal (public data) |
| Disbursement amounts | On-chain | Non-personal (public expenditure) |
| Pseudonymous DID hashes | On-chain | Pseudonymized — not PII if no re-identification path |
| SHA-256 document hashes | On-chain | Non-personal (cryptographic digest) |
| zk-SNARK proof bytes | On-chain | Non-personal (mathematical proof) |
| Aadhaar numbers | **Never stored** | Not processed — derived VC only |
| Bank account numbers | Off-chain (encrypted IPFS) | Sensitive personal data |
| Physical addresses | Off-chain (encrypted IPFS) | Personal data |
| Beneficiary names | Off-chain (encrypted IPFS) | Personal data |
| Supporting documents | Off-chain (encrypted IPFS) | May contain personal data |

## Contract-Level DPDP Mapping

| Smart Contract | DPDP Functionality / Obligation Managed |
|---|---|
| **AccessGovernance.sol** | **Identity Masking**: Maps DIDs to addresses without storing PII. Handles Role Revocation if consent is withdrawn. |
| **FundFlow.sol** | **Data Minimization**: Stores only pseudonymous `toPseudonymDid` and encrypted IPFS `supportingDocHash`. |
| **GrievancePortal.sol** | **§13 Right to Grievance**: Provides a tamper-proof mechanism for citizens to exercise their data rights and complain. |
| **ConstitutionalCompliance.sol** | **§15 Breach Notification**: Automatically escalates violations after 72 hours (SLA enforcement), aligning with CERT-In and DPBI breach reporting timelines. |
| **AnomalyOracle.sol** | **Algorithmic Transparency**: Verifies zkML proofs on-chain, proving that AI risk profiling was deterministic and untampered (combating algorithmic bias). |

## DPDP Compliance Matrix

| DPDP Provision | Requirement | PRAMAANIK Implementation |
|---|---|---|
| §4 — Consent | Lawful basis for processing | Government function exemption (§17); explicit consent via Privado ID wallet for citizen portal |
| §5 — Purpose Limitation | Data used only for stated purpose | Smart contract logic enforces purpose — fund tracking and audit only |
| §6 — Data Minimization | Collect only what's necessary | On-chain: only pseudonymous DIDs + amounts + hashes. No PII on-chain. |
| §8 — Quality | Data accuracy | Oracle attestation at disbursement time; immutable audit trail |
| §9 — Storage Limitation | Retain only as long as necessary | §17 exemption: State entities exempt from storage limitation for public expenditure audit |
| §11 — Right to Correction | Correct inaccurate data | Off-chain data correctable; on-chain append-only (new record + correction event) |
| §12 — Right to Erasure | Delete personal data | Off-chain: cryptographic erasure via key rotation. On-chain: §17 exemption applies |
| §13 — Right to Grievance | Data principal grievance mechanism | GrievancePortal smart contract provides on-chain, tamper-proof grievance filing |
| §15 — Breach Notification | Notify DPBI and individuals | CERT-In 6-hour notification protocol; on-chain event logging for audit trail |
| §17 — Government Exemption | State entity processing for public interest | **Primary legal basis** — storage limitation and erasure rights do not apply |
| §21 — Data Protection Officer | Appoint DPO | Required for production deployment; not applicable to hackathon demo |

## The Immutability Paradox — Resolution

**Problem**: Blockchain immutability conflicts with the right to erasure.

**Solution stack implemented in PRAMAANIK**:

1. **Data minimization by design**: PII never touches the blockchain. On-chain data consists only of pseudonymous DID hashes, amounts, and document hashes.

2. **Cryptographic erasure**: Off-chain personal data is encrypted with scheme-specific keys. Rotating the key renders historical ciphertext irrecoverable — functionally equivalent to deletion.

3. **Government exemption (§17)**: For State entities processing data for prevention/investigation of offenses or enforcement of legal rights, the storage limitation and erasure provisions do not apply.

4. **Append-only correction**: Instead of modifying on-chain records, correction events are appended with reference to the original record.

## Privado ID Integration

- Citizens authenticate via Privado ID (W3C DID + Verifiable Credentials)
- Selective disclosure: citizen proves "I am eligible for scheme X" without revealing identity
- No Aadhaar number is ever transmitted or stored — only a derived verifiable credential
- Credential revocation supported for identity lifecycle management

## Recommendations for Production

1. Complete DPIA (Data Protection Impact Assessment) before production deployment
2. Appoint Data Protection Officer per §21
3. Establish Data Processing Agreement with cloud/infrastructure providers
4. Implement consent management for voluntary citizen portal usage
5. Regular privacy audits aligned with DPBI guidelines
