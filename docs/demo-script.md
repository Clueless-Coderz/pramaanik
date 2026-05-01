# ChainLedger Demo Script — Hackathon Presentation

## Pre-Demo Setup (Do This Before Going on Stage)

```bash
# 1. Start all services
docker compose up --build -d

# 2. Wait for Besu QBFT to initialize (~30 seconds)
# Verify: curl http://localhost:8545 should return JSON-RPC response

# 3. Deploy contracts
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545

# 4. Seed demo data
forge script script/SeedDemo.s.sol --broadcast --rpc-url http://localhost:8545

# 5. Open the frontend
# Navigate to http://localhost:3000
```

---

## Demo Flow (5 Minutes)

### Act 1: The Problem (30 seconds)

> "India loses 20-40% of welfare funds to corruption. The CAG found that 94% of PMKVY
> beneficiary records had missing or shared bank accounts. ₹71 Crore was siphoned from
> a single MGNREGA project in Gujarat. Current systems like PFMS are centralized — a
> single corrupt admin can delete the evidence."

### Act 2: Show the Happy Path (1 minute)

1. **Admin Portal** → Show 3 registered schemes (PM-KISAN, MGNREGA, Ayushman Bharat)
2. **Create a new disbursement** → Point out the live Oracle checks appearing:
   - ✅ GST Valid (GSTN Sandbox API)
   - ✅ Bank Account Unique (NPCI NACH)
   - ✅ Geotag Verified (NIC)
3. **Advance the disbursement** through stages: Sanctioned → Released to State → Released to Agency
4. **Citizen Portal** → Show a citizen tracing their ₹6,000 PM-KISAN payment from Ministry to their bank

### Act 3: Catch the Fraud (2 minutes) — THE WOW MOMENT

1. **Show the suspicious transactions** → 5 payments of ₹49.8 Lakh to the same vendor
   > "These were designed to stay just below the ₹50 Lakh audit threshold. In PFMS, this would go unnoticed."

2. **Show the GNN detecting it** → Open the GNN service log or the `/predict` response
   - Risk score: 8500 basis points (85%)
   - Explanation: "Split contract pattern: 5 txns of 49.8L to same vendor in 24h"

3. **Show the zk-SNARK proof** → The EZKL prover generates a Halo2 proof
   > "This proof mathematically guarantees that our AI model ran correctly on this data.
   > No one tampered with the result. The proof is verified ON-CHAIN."

4. **Auditor Dashboard** → Show the flagged transactions with red alerts
   - Click "Freeze" → The smart contract physically blocks the money
   > "The auditor doesn't need to trust anyone. The blockchain enforces the freeze."

### Act 4: The High-Value Multi-Sig (30 seconds)

1. **Show the ₹6 Crore Ayushman disbursement** → Status: "Awaiting 2nd Approval"
   > "For any transaction above ₹5 Crore, the smart contract requires 2-of-3 officials
   > to approve. A single corrupt official cannot move large amounts."
2. **Second admin approves** → Now the transaction can advance

### Act 5: Constitutional Compliance (30 seconds)

> "If a CRITICAL fraud remains unresolved for 72 hours, the system automatically generates
> an FIR draft with IPC sections 409 and 420, digitally signed with the block hash as
> IT Act Section 65B certified evidence. It's auto-submitted to the e-FIR portal and
> the Lokpal receives a real-time feed."

### Act 6: Why Blockchain? (30 seconds)

> "Why not just a database? Three reasons:
> 1. **Permanent evidence** — once recorded, no admin can delete a transaction
> 2. **Programmable money** — the smart contract physically blocks payments if checks fail
> 3. **Public trust** — every 15 minutes, we anchor a cryptographic snapshot to public
>    Ethereum. Even if all government nodes collude, citizens can verify the data is untampered."

---

## Killer Technical Points to Mention

If a judge asks "how is this different from just using blockchain?", drop these:

- **zkML**: "We don't just use blockchain. We use Zero-Knowledge Machine Learning. Our AI's fraud
  detection is verified on-chain with zk-SNARK proofs. No other system does this."
- **5-Tier Hierarchy**: "We mirror India's constitutional governance structure — Central, State,
  District, City, Village — directly in the smart contract."
- **Shell Company Detection**: "Our GNN doesn't just look at transactions. It builds a graph of
  vendor relationships — shared directors, same addresses — to detect shell company rings."
- **DPDP Act**: "We're fully compliant. Citizen data never touches the blockchain. We use
  Zero-Knowledge Identity (Privado ID) so a citizen can prove eligibility without revealing
  their Aadhaar or bank account."

---

## Emergency Backup

If Docker/Besu fails to start on stage:
1. Open the Integration Test file → Run through the test names verbally
2. Show the smart contract code → Point out multi-sig, util certs, constitutional compliance
3. Show the ARCHITECTURE.md diagram
4. Show the SECURITY.md threat model
