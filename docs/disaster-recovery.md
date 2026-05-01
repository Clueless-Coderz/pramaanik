# PRAMAANIK — Disaster Recovery & Business Continuity Plan

## Gap #7 Fix: Multi-region HA, replication, and documented RTO/RPO targets.

---

## Recovery Objectives

| Component | RPO (Max Data Loss) | RTO (Max Downtime) | Justification |
|---|---|---|---|
| Besu Validators | 0 (zero) | 15 minutes | QBFT consensus — loss of <1/3 validators is self-healing |
| Anchor Publisher | 15 minutes | 30 minutes | Anchor interval is 15 min; one missed anchor is tolerable |
| GNN Inference | 5 minutes | 10 minutes | Stateless service; restart with last model weights |
| EZKL Prover | 30 minutes | 60 minutes | Proofs can be re-queued from Redis; batch is idempotent |
| Neo4j Graph DB | 1 minute | 15 minutes | Causal cluster with 3 replicas; automatic failover |
| IPFS / Pinata | 0 (zero) | N/A | Content-addressed; data is inherently replicated |
| Frontend | N/A | 5 minutes | Stateless CDN deployment; instant failover |
| Redis (Job Queue) | 1 minute | 5 minutes | AOF persistence; Sentinel for auto-failover |

---

## Multi-Region Deployment

### Production Topology

```
┌─────────────────────────────────────┐
│          REGION: ap-south-1          │
│  Besu Validator 1 (NIC)              │
│  Besu Validator 2 (MoF)             │
│  Neo4j Primary + Read Replica       │
│  GNN Inference (GPU: p3.2xlarge)    │
│  EZKL Prover (GPU: p3.2xlarge)      │
│  Redis Primary (Sentinel)            │
│  Anchor Publisher                    │
│  Oracle Relayer                      │
│  Frontend (Vercel Edge ap-south-1)   │
├─────────────────────────────────────┤
│          REGION: ap-south-2          │
│  Besu Validator 3 (CAG)              │
│  Besu Validator 4 (RBI)             │
│  Neo4j Read Replica                  │
│  GNN Inference (standby)            │
│  Redis Replica (Sentinel)            │
│  Frontend (Vercel Edge ap-south-2)   │
├─────────────────────────────────────┤
│          REGION: eu-west-1           │
│  Besu Validator 5 (Observer)        │
│  Neo4j Disaster Recovery Replica     │
│  IPFS Pinning Node (Pinata)         │
│  Cold archive of Anchor TXs         │
└─────────────────────────────────────┘
```

### docker-compose.ha.yml (Production Override)

```yaml
version: '3.8'

services:
  # Neo4j Causal Cluster (3-node)
  neo4j-core-1:
    image: neo4j:5-enterprise
    environment:
      - NEO4J_server_default__advertised__address=neo4j-core-1
      - NEO4J_dbms_cluster_discovery_endpoints=neo4j-core-1:5000,neo4j-core-2:5000,neo4j-core-3:5000
      - NEO4J_initial_dbms_default__primaries__count=3
      - NEO4J_server_cluster_raft_listen__address=:6000
      - NEO4J_server_discovery_listen__address=:5000
    volumes:
      - neo4j-core-1-data:/data

  neo4j-core-2:
    image: neo4j:5-enterprise
    environment:
      - NEO4J_server_default__advertised__address=neo4j-core-2
      - NEO4J_dbms_cluster_discovery_endpoints=neo4j-core-1:5000,neo4j-core-2:5000,neo4j-core-3:5000
      - NEO4J_initial_dbms_default__primaries__count=3
    volumes:
      - neo4j-core-2-data:/data

  neo4j-core-3:
    image: neo4j:5-enterprise
    environment:
      - NEO4J_server_default__advertised__address=neo4j-core-3
      - NEO4J_dbms_cluster_discovery_endpoints=neo4j-core-1:5000,neo4j-core-2:5000,neo4j-core-3:5000
      - NEO4J_initial_dbms_default__primaries__count=3
    volumes:
      - neo4j-core-3-data:/data

  # Redis Sentinel (HA)
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes --appendfsync everysec
    volumes:
      - redis-master-data:/data

  redis-sentinel-1:
    image: redis:7-alpine
    command: >
      redis-sentinel /etc/sentinel.conf
    volumes:
      - ./config/sentinel.conf:/etc/sentinel.conf

  redis-sentinel-2:
    image: redis:7-alpine
    command: redis-sentinel /etc/sentinel.conf
    volumes:
      - ./config/sentinel.conf:/etc/sentinel.conf

volumes:
  neo4j-core-1-data:
  neo4j-core-2-data:
  neo4j-core-3-data:
  redis-master-data:
```

---

## Besu Validator Recovery

### Scenario: Single Validator Failure
- **Detection**: Prometheus alert on `besu_peers_connected < 3`
- **Action**: Automatic. QBFT continues with 3-of-4 validators.
- **Recovery**: Restart validator VM. Besu syncs from peers (fast-sync mode).
- **RTO**: < 15 minutes (VM restart + sync)

### Scenario: 2+ Validator Failure (Loss of Consensus)
- **Detection**: Block production stops. Prometheus alert on `besu_blocks_behind > 10`.
- **Action**: Manual. Identify root cause (network partition vs. coordinated failure).
- **Recovery**:
  1. Restart validators in sequence
  2. If data corruption: restore from latest Anchor checkpoint + replay from public chain
  3. Worst case: re-deploy from backup and fast-sync from remaining peers
- **RTO**: 1-4 hours depending on cause

### Scenario: Complete Chain Loss
- **Detection**: All validators down simultaneously (e.g., data center incident)
- **Recovery**:
  1. Last Anchor checkpoint on Polygon Amoy provides verifiable state root
  2. Replay all transactions from off-chain event logs
  3. Verify reconstructed state against anchored Merkle root
- **RTO**: 4-24 hours
- **RPO**: 15 minutes (anchor interval)

---

## IPFS Redundancy

| Pinning Provider | Geography | Purpose |
|---|---|---|
| Self-hosted IPFS node | ap-south-1 | Primary hot storage |
| Pinata (paid plan) | Global CDN | Secondary persistent pinning |
| Web3.Storage / Filecoin | Decentralized | Cold archival |

Minimum pinning policy: **3 geographic copies** of all documents.

---

## Backup Schedule

| Data | Frequency | Retention | Storage |
|---|---|---|---|
| Besu chain data | Continuous (peer sync) | Permanent | 3 validator nodes |
| Neo4j graph DB | Every 6 hours | 90 days | S3 ap-south-1 + eu-west-1 |
| Redis AOF | Every second | 7 days | Local + S3 |
| IPFS pinned CIDs | On upload | Permanent | 3 geographic pins |
| Anchor TX hashes | On creation | Permanent | On-chain (public chains) |
| Configuration / secrets | On change | 365 days | AWS Secrets Manager + backup vault |

---

## Runbook: Incident Response Timeline

```
T+0:00  — Alert fires (Prometheus/PagerDuty)
T+0:05  — On-call engineer acknowledges
T+0:15  — Initial diagnosis: which component, which region
T+0:30  — Remediation initiated (auto-restart, manual intervention, or failover)
T+1:00  — Status update to stakeholders
T+2:00  — Root cause identified (or escalation)
T+6:00  — CERT-In notification (if data breach per DPDP Act §15)
T+24:00 — Post-incident review (PIR) document
T+72:00 — PIR published to team; preventive measures implemented
```

---

## Testing

- **DR drill frequency**: Quarterly
- **Chaos engineering**: Monthly (kill random validator, simulate network partition)
- **Backup restore test**: Monthly (restore Neo4j from S3 backup, verify integrity)
- **Anchor verification**: Weekly (verify latest Polygon Amoy root matches Besu state)
