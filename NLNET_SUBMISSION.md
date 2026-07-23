# Veil Stack — NLnet Grant Application

## Project Summary

**Veil Stack** is a decentralized container orchestration platform governed by an FEVM (Filecoin EVM) smart contract. Node coordination runs over libp2p, cluster state is managed on-chain, and a planned FHE layer will enable confidential scheduling for regulated workloads.

The long-term vision: link every scheduled workload to a **paid Filecoin storage deal**, turning container orchestration into a programmatic demand engine for Filecoin's storage market.

- **Repository**: https://github.com/shivv23/Veil-Stack
- **License**: MIT
- **Deployed Contract**: [`0x04dEf60e2853E4d654b366cd8103F929c456d4b7`](https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7) on FEVM Calibration
- **Live Dashboard**: https://veil-stack-canteen.vercel.app/dashboard/

---

## Problem Statement

Container orchestration today is centralized (Kubernetes, Docker Swarm). This creates:

1. **Single points of failure** — if the orchestrator goes down, the entire stack is affected.
2. **Vendor lock-in** — cloud providers control scheduling, pricing, and data placement.
3. **No verifiable storage** — container images and deployment metadata sit on opaque registries with no cryptographic audit trail.
4. **No privacy for multi-org clusters** — organizations must expose resource metrics to a shared control plane.

Veil Stack solves these by moving governance on-chain (FEVM), networking to libp2p (no central control plane), storage to IPFS/Filecoin (verifiable), and scheduling metrics to encrypted (FHE, planned).

---

## Current State (V1 — Working)

| Component | What Exists | Evidence |
|---|---|---|
| **Canteen.sol (FEVM)** | Smart contract: member management, image registry, replica balancing, port mapping | Deployed on Calibration, verified on Filfox |
| **Web Dashboard** | React + D3 force-directed cluster visualization, MetaMask integration, contract state reader | Live on Vercel |
| **libp2p Cluster** | TCP transport, Noise encryption, mplex, mDNS/bootstrap discovery, GossipSub heartbeat gossip | Working in `cluster.js` |
| **Docker Runtime** | Pull, create, start, stop, remove containers via Docker Engine API | Working in `scheduler.js` |
| **Event-Driven Scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate on-chain events, manages container lifecycle | Working in `scheduler.js` |
| **IPFS Pinning** | Deployment manifests pinned to IPFS via Pinata for verifiable records | Working in `ipfs-service.js` |
| **Docker Compose Stack** | Ganache (local dev), Socket Proxy, Canteen Node, Dashboard — one-command local setup | `docker-compose.yml` |
| **CI/CD** | GitHub Actions: contract tests (Ganache + Truffle), Docker Compose build | `.github/workflows/test.yml` |

### Smart Contract: Canteen.sol

```
Key functions:
- addMember(host) / removeMember(host)     — cluster membership
- addImage(name, replicas) / removeImage() — container registry
- rebalanceWithUnfortunateImage()          — ratio-based replica scheduling
- addPortForImage() / getPortsForImage()   — port mapping
```

Events: `MemberJoin`, `MemberLeave`, `MemberImageUpdate` — consumed by the scheduler off-chain.

### Architecture

```
   Operator / Dashboard (React + D3 + Web3)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   FEVM Contract (Canteen.sol)
        │           │           │
        ▼           ▼           ▼
   Veil Node A   Veil Node B   Veil Node C
   (libp2p)      (libp2p)      (libp2p)
   + scheduler   + scheduler   + scheduler
        │           │           │
        ▼           ▼           ▼
   Docker Host   Docker Host   Docker Host
        │           │           │
        └───────────┼───────────┘
                    ▼
            Filecoin Network
       (Calibration → Mainnet)
```

---

## What's Missing (V2 Gaps)

| Gap | Impact | Priority |
|---|---|---|
| **StorageDeal struct** | No on-chain deal record per deployment | P0 |
| **Lotus JSON-RPC integration** | Cannot propose Filecoin deals from the scheduler | P0 |
| **Deal lifecycle monitoring** | No proposed → active → expired/slashed tracking | P0 |
| **CID-verified image retrieval** | Images pulled without on-chain commitment check | P0 |
| **Multi-provider fallback** | Single provider failure breaks deal origination | P1 |
| **FHE confidential scheduling** | Scheduling metrics are plaintext — unusable for regulated workloads | P2 |
| **10-node CI + federation model** | No automated multi-node testing | P2 |
| **Security audit** | No formal audit of Canteen.sol | P3 |

---

## Funding-Led Milestones

### Milestone 1: Filecoin Deal Pipeline (€15,000)

**Goal**: Every container deployment originates a paid Filecoin storage deal.

| Deliverable | Description | Timeline |
|---|---|---|
| Canteen.sol V2 | Add `StorageDeal` struct (dealId, providerId, payloadCid, size, term, status) + `DealAnchored` event | Month 1-2 |
| `filecoin-service.js` | Backend module: Lotus JSON-RPC client for `Filecoin.MarketPublishDeal`, deal status polling | Month 2-3 |
| Deal lifecycle in scheduler | `addImage()` proposes a deal; scheduler monitors proposed → active → expired/slashed | Month 3-4 |
| Integration tests | Automated tests: deal proposal, status transitions, CID verification | Month 4 |
| Dashboard: deal tab | Visualize deal status, provider info, CID, term length | Month 4-5 |

**Exit criteria**: Deploy a container on a Veil node → deal is proposed to a Calibration provider → deal goes active → dashboard shows deal status.

---

### Milestone 2: CID-Verified Retrieval + Multi-Provider (€12,000)

**Goal**: Tamper-evident image pulling with provider resilience.

| Deliverable | Description | Timeline |
|---|---|---|
| CID verification in scheduler | Before `docker pull`, verify image CID matches on-chain deal commitment | Month 1-2 |
| Multi-provider fallback | If primary provider is offline, re-propose to next available provider | Month 2-3 |
| Deal retry logic | Exponential backoff + provider rotation on deal failure | Month 3 |
| End-to-end test suite | 3-node cluster, provider failure simulation, CID integrity checks | Month 3-4 |
| Documentation | Provider setup guide, deal lifecycle docs, troubleshooting | Month 4 |

**Exit criteria**: Pull an image → CID is verified against on-chain record → if provider fails, deal re-routes automatically.

---

### Milestone 3: Confidential Scheduling — FHE Layer (€10,000)

**Goal**: Encrypted scheduling inputs for zero-trust and regulated environments.

| Deliverable | Description | Timeline |
|---|---|---|
| Zama FHE SDK integration | Encrypted telemetry: nodes encrypt CPU/memory/disk metrics before libp2p gossip | Month 1-3 |
| Ciphertext scheduling | Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics | Month 3-5 |
| Toggle mechanism | `VEIL_FHE_MODE=enabled\|disabled` — plaintext scheduling default, FHE for sensitive clusters | Month 5 |
| Performance benchmarks | Latency/throughput comparison: plaintext vs FHE scheduling across 5-10 nodes | Month 5-6 |
| Demo cluster | 5-node encrypted scheduling demo on Calibration | Month 6 |

**Exit criteria**: 5-node cluster with FHE scheduling → nodes cannot read each other's resource metrics → scheduling decisions are correct → benchmark report published.

---

### Milestone 4: Production Hardening (€8,000)

**Goal**: Audit, multi-node CI, mainnet readiness.

| Deliverable | Description | Timeline |
|---|---|---|
| Security audit of Canteen.sol | External or community audit of V2 contract | Month 1-2 |
| 10-node CI pipeline | Automated multi-node cluster testing in GitHub Actions | Month 2-3 |
| Federation model | Cross-org cluster coordination with role-based access | Month 3-4 |
| Mainnet migration plan | Deployment script + checklist for Filecoin mainnet | Month 4 |
| Documentation overhaul | Architecture docs, API reference, contribution guide | Month 4-5 |

**Exit criteria**: Canteen.sol V2 audited → 10-node CI passes → mainnet deployment script tested on Calibration.

---

## Budget Summary

| Milestone | Focus | Amount | Timeline |
|---|---|---|---|
| M1 | Filecoin Deal Pipeline | €15,000 | Months 1-5 |
| M2 | CID Verification + Multi-Provider | €12,000 | Months 1-4 |
| M3 | FHE Confidential Scheduling | €10,000 | Months 1-6 |
| M4 | Production Hardening | €8,000 | Months 1-5 |
| **Total** | | **€45,000** | **6 months** |

---

## Why This Matters

| Current State | With Veil Stack V2 |
|---|---|
| Containers deployed to opaque registries | Every deployment pinned to IPFS + Filecoin with CID verification |
| No on-chain audit trail | StorageDeal struct on FEVM provides immutable deployment record |
| Single cloud provider dependency | Multi-provider deal fallback across Filecoin storage providers |
| Scheduling metrics exposed in plaintext | FHE-encrypted telemetry for regulated workloads |
| Manual scaling | Event-driven on-chain governance with automatic rebalancing |

---

## Team

- **Sumanjeet** — Smart contract development, FEVM integration
- **Shivam Kumar (shivv23)** — Full-stack development, libp2p networking, CI/CD

---

## Links

- Repository: https://github.com/shivv23/Veil-Stack
- Contract: https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7
- Dashboard: https://veil-stack-canteen.vercel.app/dashboard/
- License: MIT
