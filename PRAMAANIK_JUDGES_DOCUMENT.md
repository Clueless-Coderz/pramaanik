# COMPLETE HACKATHON PROJECT REPORT: PRAMAANIK

## 1. Executive Summary
**PRAMAANIK** is an enterprise-grade, Web3-powered public fund tracking and disbursement platform. It is engineered to introduce mathematical transparency, rigorous accountability, and privacy-preserving identity verification into government financial systems. By converging **Consortium Blockchain (Hyperledger Besu)** for immutable state, **Zero-Knowledge Proofs (Privado ID)** for privacy-centric authentication, and **Relational Graph Convolutional Networks (RGCN)** for anomaly detection, PRAMAANIK prevents public fund leakage, eliminates ghost beneficiaries, and halts shell-company contract splitting before funds are dispersed.

---

## 2. Problem Statement
Current government disbursement systems suffer from critical vulnerabilities:
1. **Ghost Beneficiaries:** Funds are frequently routed to inactive or deceased accounts because legacy KYC methods are static and prone to manipulation.
2. **Shell Companies & Split Contracts:** Corrupt entities evade CAG (Comptroller and Auditor General) thresholds by splitting massive contracts (e.g., ₹2 Cr) into smaller fragments (e.g., five ₹40 Lakh payments) and routing them to linked shell vendors.
3. **Information Asymmetry & Delays:** Beneficiaries have zero visibility into where their funds are stuck in the bureaucracy.
4. **Data Vulnerability:** Centralized government databases serve as honeypots for cyberattacks, compromising citizen data (e.g., Aadhaar leaks).

---

## 3. The PRAMAANIK Solution
PRAMAANIK fundamentally shifts fund disbursement from a "trust-based" system to a "cryptographic proof-based" system. 
- Funds are transferred via Smart Contracts, ensuring zero manual tampering.
- AI operates as an on-chain Oracle, scanning every transaction against historical fraud topologies.
- Citizens, Admins, and Auditors authenticate not via passwords, but by proving cryptographic ownership of their identity.

---

## 4. Core Technologies & Stack
* **Blockchain Layer:** Hyperledger Besu (QBFT Consensus). We utilize a 4-node private consortium to ensure high throughput and zero gas fees, while anchoring Merkle roots to the **Polygon Amoy Public Testnet** for public verifiability.
* **Identity Layer:** Privado ID (Polygon ID). Enables Zero-Knowledge (ZK) authentication where users prove their identity attributes without revealing underlying PII (Personally Identifiable Information).
* **AI/ML Layer:** RGCN v2.3 (Relational Graph Convolutional Networks). A graph-based AI model that detects anomalies based on network structures rather than isolated rules.
* **Frontend:** Next.js (React), TailwindCSS, Vanilla JS for high-speed static delivery.
* **Smart Contracts:** Solidity (Hardhat/Foundry for deployment).

---

## 5. System Architecture Overview
The system architecture operates in a unified loop:
1. **Sanctioning:** Ministry sanctions a scheme via the `SchemeRegistry.sol` contract.
2. **Disbursement Intent:** An agency initiates a payment. The intent is logged in `FundFlow.sol`.
3. **AI Oracle Verification:** Before the funds actually move, the transaction data is sent to the RGCN AI model via a Chainlink-style Oracle (`AnomalyOracle.sol`). 
4. **Graph Analysis:** The AI maps the vendor's Tax IDs, IP addresses, and historical transaction links. If it detects a "Threshold Avoidance Motif", it flags the transaction.
5. **Auditor Action:** If flagged, the transaction is paused. The CAG Auditor securely logs in via ZK-Proof, reviews the AI explanation, and can invoke a `freeze` or `release` function.
6. **Public Anchoring:** The entire state is periodically summarized and published to a public chain, allowing citizens to independently verify the integrity of the system.

---

## 6. Key Features & Portals

### 6.1 The Admin Dashboard (Ministries & Agencies)
* **Function:** Used to view active schemes, monitor disbursement progress, and track overall fund utilization.
* **Features:** Live data feeds of sanctioned amounts vs. disbursed amounts, geographic heatmaps, and a ledger of recent transactions.

### 6.2 The Auditor Dashboard (CAG / Watchdogs)
* **Function:** A high-security portal for monitoring flagged transactions.
* **Features:** Displays Risk Scores (e.g., "8500/10000 Risk"), outlines the specific fraud motif (e.g., "Multi-sig pending" or "Split-contract pattern"), and provides direct on-chain controls to freeze compromised funds.

### 6.3 The Citizen Portal (Public Transparency)
* **Function:** A public interface for end-users to track their entitlements.
* **Features:** Citizens can check scheme health and file grievances directly on-chain. This creates an un-deletable record that forces government accountability.

---

## 7. Fraud Detection Methodology (How the AI Works)
Traditional systems use linear rules (e.g., "Flag transactions over ₹50 Lakh"). Fraudsters easily bypass this by sending ₹49.9 Lakh.
PRAMAANIK uses **Graph Neural Networks (RGCN)**:
* We represent entities (Vendors, Accounts, IPs, PANs) as **Nodes**.
* We represent transactions as **Edges**.
* The AI looks at the *shape* of the graph. If it sees one central agency making 5 rapid connections to 5 seemingly different vendors, but all 5 vendors connect to the same PAN prefix or IP address node, the AI immediately recognizes the "Shell Company Motif" and halts the transaction.

---

## 8. Business Value & Impact
* **Economic:** Saves billions in public funds by proactively stopping leakage rather than recovering it post-audit.
* **Efficiency:** Reduces the audit lifecycle from months to milliseconds.
* **Trust:** Restores public faith in government institutions through verifiable mathematics.

---

## 9. Future Scope
* **CBDC Integration:** Direct integration with the e-Rupee (Central Bank Digital Currency) for atomic settlements.
* **Cross-Border Grants:** Expanding the system for international aid (e.g., UN or World Bank grants) to track global fund utilization.
* **Advanced Biometrics:** Integrating behavioral biometrics (keystroke dynamics) during the ZK-proof generation to prevent device-theft fraud.

---

## 10. Q&A Section for Judges

### Q1: Why use a Blockchain instead of a standard centralized database?
**Answer:** "A centralized database requires us to implicitly trust the database administrator. If an official is corrupt, they can simply delete the logs of a fraudulent transfer. By using a Consortium Blockchain, the ledger is distributed. Every transaction is immutable and cryptographically secured. We remove 'trust' from the equation and replace it with mathematical certainty."

### Q2: What exactly is a "Zero-Knowledge Proof" and why did you use it?
**Answer:** "Zero-Knowledge (ZK) allows a user to prove a statement is true without revealing the data that makes it true. For example, a farmer can prove they belong to a specific district to claim a subsidy without revealing their actual Aadhaar number to the web portal. We integrated Privado ID so users authenticate via their mobile wallets, totally eliminating passwords and preventing massive government data breaches."

### Q3: How does your AI detect fraud differently than normal banking rules?
**Answer:** "Simple rules catch simple fraud. Corrupt actors use complex methods, like splitting a 2 Crore contract into five 40 Lakh contracts sent to different vendors who secretly share the same PAN card prefix. Our AI uses Relational Graph Convolutional Networks (RGCN). Instead of looking at single transactions, it looks at the entire *network* of relationships between addresses, IDs, and timestamps to catch sophisticated shell-company rings."

### Q4: What happens if the AI makes a mistake and flags a legitimate transaction?
**Answer:** "The AI does not automatically burn or steal funds. It acts as an 'Oracle' that pauses the transaction in an escrow state. A human Auditor reviews the AI's explanation on their dashboard. If it's a false positive, the Auditor clicks 'Approve', and the money is released immediately. It is an AI-assisted process, keeping humans in the loop for final accountability."

### Q5: Is this scalable for a country as large as India?
**Answer:** "Yes. We chose a private Consortium Blockchain (Hyperledger Besu) instead of a public chain like Ethereum. This means we process thousands of transactions per second with zero gas fees. To ensure public trust is maintained, we 'anchor' a cryptographic Merkle root of our private chain to the public Polygon network periodically. This gives us the immense speed of a private database with the absolute trust of a public blockchain."

### Q6: What was the hardest technical challenge you faced during this hackathon?
**Answer:** "The most challenging aspect was bridging the off-chain mobile Zero-Knowledge authentication with our on-chain identity roles. We built a custom simulation flow that listens for the cryptographic proof from the wallet and instantly routes the user to the correct role-based dashboard seamlessly, proving that Web3 security doesn't have to ruin the Web2 user experience."
