import random
import uuid
import json
import datetime

def generate_synthetic_fund_flows(num_schemes=2, num_agencies=5, num_vendors=20, num_beneficiaries=500):
    """
    Generates a synthetic dataset of fund flows for GNN training.
    Includes normal patterns and specific injected anomaly motifs (e.g., split contracts, ghost vendors).
    """
    print(f"Generating synthetic fund flows...")
    
    nodes = []
    edges = []
    
    # Generate Entities (Nodes)
    schemes = [f"SCHEME_{i}" for i in range(num_schemes)]
    agencies = [f"AGENCY_{i}" for i in range(num_agencies)]
    vendors = [f"VENDOR_{i}" for i in range(num_vendors)]
    beneficiaries = [f"BENEFICIARY_{i}" for i in range(num_beneficiaries)]
    
    # Normal Flow: Sanction -> Agency -> Vendor/Beneficiary
    for i in range(1000):
        agency = random.choice(agencies)
        amount = random.randint(10000, 500000)
        
        # 80% to beneficiaries, 20% to vendors
        if random.random() < 0.8:
            recipient = random.choice(beneficiaries)
            edge_type = "DIRECT_BENEFIT"
        else:
            recipient = random.choice(vendors)
            edge_type = "PROCUREMENT"
            
        edges.append({
            "tx_id": str(uuid.uuid4()),
            "from": agency,
            "to": recipient,
            "amount": amount,
            "type": edge_type,
            "timestamp": (datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 365))).isoformat(),
            "is_anomaly": False
        })
        
    # Anomaly Motif 1: Split Contracts (Gujarat Dahod pattern)
    # Multiple transactions just below a threshold to the same vendor in a short time
    anomalous_vendor = vendors[0]
    corrupt_agency = agencies[0]
    
    for i in range(5):
        edges.append({
            "tx_id": str(uuid.uuid4()),
            "from": corrupt_agency,
            "to": anomalous_vendor,
            "amount": 490000, # Just below 5L threshold
            "type": "PROCUREMENT_SPLIT",
            "timestamp": datetime.datetime.now().isoformat(),
            "is_anomaly": True,
            "motif_label": "SPLIT_CONTRACT"
        })
        
    # Anomaly Motif 2: Beneficiary Account Duplication (PMKVY pattern)
    # Same bank account linked to multiple distinct beneficiaries
    duplicated_account_vendor = vendors[1]
    for i in range(20):
        fake_beneficiary = f"GHOST_BENEFICIARY_{i}"
        edges.append({
            "tx_id": str(uuid.uuid4()),
            "from": corrupt_agency,
            "to": fake_beneficiary,
            "amount": 15000,
            "type": "DIRECT_BENEFIT",
            "timestamp": datetime.datetime.now().isoformat(),
            "is_anomaly": True,
            "motif_label": "BANK_ACCOUNT_REUSE",
            "shared_account_ref": "ACC_11111111"
        })

    with open("data/synthetic_transactions.json", "w") as f:
        json.dump({"nodes": nodes, "edges": edges}, f, indent=2)
        
    print(f"Generated {len(edges)} transactions. Written to data/synthetic_transactions.json")

if __name__ == "__main__":
    generate_synthetic_fund_flows()
