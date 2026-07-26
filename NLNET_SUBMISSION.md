# Veil Stack — Grant Application

## Project Summary

**Veil Stack** is a decentralized container orchestration platform that shifts infrastructure control from cloud vendor lock-in to open, community-governed systems.

The core problem: container orchestration — the layer that decides where code runs — is controlled by a small number of centralized vendors using proprietary schedulers and closed APIs. Veil Stack replaces this with an open smart contract on Filecoin EVM, peer-to-peer coordination via libp2p, and verifiable storage via IPFS/Filecoin.

**What exists today (V1)**: A working orchestrator with on-chain member management, event-driven scheduling, container lifecycle control, a web dashboard, and 13 contract tests — deployed and verified on Filecoin Calibration.

**What this funding builds (V2)**: A Filecoin storage deal pipeline (every deployment = a verifiable storage deal), CID-verified image retrieval, and a confidential scheduling layer using FHE for regulated workloads.

- **Repository**: https://github.com/shivv23/Veil-Stack
- **License**: MIT
- **Deployed Contract**: [`0x686d5d622298cfca880168Badf83ac3F71C4a33A`](https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A) on FEVM Calibration
- **Live Dashboard**: https://veil-stack-canteen.vercel.app/dashboard/
- **CI**: GitHub Actions (contract tests + Docker compose build) — passing

---

## Problem Statement

### The Infrastructure Sovereignty Gap

Every application we use runs on containers managed by a handful of centralized orchestrators — Kubernetes, Docker Swarm, managed ECS. Three companies control the scheduling layer for most of the world's cloud-native workloads. This creates compounding risks:

**1. Single Points of Failure**
A Kubernetes control plane outage cascades to every workload it governs. In 2025, multiple major cloud providers experienced control plane failures that took down services across entire regions. When the orchestrator goes down, everything goes down — there is no fallback.

**2. Vendor Lock-In and Pricing Power**
Cloud providers control scheduling, pricing, and data placement. Organizations that build on managed orchestration services (EKS, GKE, AKS) face escalating costs and contractual dependency. Migrating away is technically costly and operationally risky, creating a ratchet effect.

**3. No Verifiable Deployment Record**
Container images sit on opaque registries. Deployment metadata is stored in proprietary databases. There is no cryptographic proof of what was deployed, when, or by whom. For regulated industries — healthcare, finance, government — this is a compliance gap with no current solution.

**4. No Privacy in Multi-Org Clusters**
Organizations sharing a cluster must expose resource metrics (CPU, memory, disk) to a shared control plane. In multi-tenant or consortium environments, this leaks competitive intelligence and violates data protection principles. Current orchestrators have no mechanism for encrypted scheduling.

### Why This Is an Open Internet Problem

The internet's infrastructure layer is becoming as concentrated as the applications it hosts. Container orchestration — the system that decides where code runs — is controlled by a small number of vendors using closed-source schedulers, proprietary APIs, and centralized consensus. This is the opposite of the open, user-operated internet.

A decentralized orchestration layer, governed by an open smart contract on a public chain, with peer-to-peer coordination and verifiable storage, is a direct contribution to the open internet stack. It shifts infrastructure control from vendor platforms to the communities that run them.

Veil Stack addresses all four gaps with a working implementation: on-chain governance (FEVM), decentralized networking (libp2p), verifiable storage (IPFS/Filecoin), and planned confidential computing (FHE).

---

## Current State (V1 — Working)

| Component | What Exists | Evidence |
|---|---|---|
| **Canteen.sol (FEVM)** | Smart contract: member management, image registry, replica balancing, port mapping, **status reporting** | Deployed on Calibration, [verified on Filfox](https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A) |
| **On-chain feedback loop** | Scheduler reports container state (running/stopped/crashed) back to contract via `reportStatus()` | Implemented in `scheduler.js` |
| **Web Dashboard** | React + D3 force-directed cluster visualization, MetaMask integration, contract state reader | Live on Vercel |
| **libp2p Cluster** | TCP transport, Noise encryption, mplex, mDNS/bootstrap discovery, GossipSub heartbeat gossip | Working in `cluster.js` |
| **Docker Runtime** | Pull, create, start, stop, remove containers via Docker Engine API; **resource limits** (512MB RAM, 50% CPU) | Working in `scheduler.js` |
| **Event-Driven Scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate, **StatusReport** on-chain events | Working in `scheduler.js` |
| **Health Checks** | Container status reported on-chain; `getMemberStatus(host)` returns image + state + timestamp | Working |
| **REST API** | `/status`, `/containers`, `/cluster`, `/ipfs` endpoints for backend introspection | Working in `web-server.js` |
| **CLI Tool** | `veilstack` — status, containers, nodes, add-image, remove-image commands | Working in `veilstack.js` |
| **IPFS Pinning** | Deployment manifests pinned to IPFS via Pinata for verifiable records | Working in `ipfs-service.js` |
| **Docker Compose** | One-command local deployment with Docker socket proxy | `docker-compose.yml` |
| **CI/CD** | GitHub Actions: contract tests (Ganache + Truffle), Docker Compose build, npm audit | `.github/workflows/test.yml` — passing |
| **Integration Tests** | 5 end-to-end tests against live backend (status, cluster, containers, lifecycle) | `test/integration_test.js` |
| **Contract Tests** | 8 tests covering membership, images, ports, status reporting, event emission, node count | `test/canteen_test.js` |
| **Structured Logging** | JSON-formatted logs with timestamps and component tags (`logger.js`) | Replaces all `console.log` across codebase |
| **Graceful Shutdown** | SIGTERM/SIGINT handlers clean up containers, libp2p, and event polling | `index.js` |
| **Health Check Endpoint** | `GET /health` returns uptime, version, status for monitoring | `web-server.js` |
| **Pre-commit Hooks** | husky + lint-staged for syntax validation before commits | `canteen/.husky/pre-commit` |
| **Dependency Audit** | `npm audit` runs in CI; `package-lock.json` committed | Supply chain security |
| **Edge Case Documentation** | Failure modes and recovery at every layer (contract, scheduler, cluster, web, network) | `docs/EDGE_CASES.md` |
| **Performance Benchmarks** | Scheduler latency, container lifecycle, gas costs, libp2p metrics, resource usage | `docs/BENCHMARKS.md` |
| **OpenAPI Spec** | OpenAPI 3.0 specification for all REST API endpoints | `docs/openapi.yaml` |
| **CONTRIBUTING.md** | Development setup, code style, PR guidelines, architecture overview | Present |
| **SECURITY.md** | Vulnerability reporting, threat model, known limitations, dependency security | Present |
| **CHANGELOG.md** | Version history with categorized changes (Added, Fixed, Changed) | Present |

### Smart Contract: Canteen.sol

```
Key functions:
- addMember(host) / removeMember(host)     — cluster membership
- addImage(name, replicas) / removeImage() — container registry
- rebalanceWithUnfortunateImage()          — ratio-based replica scheduling
- addPortForImage() / getPortsForImage()   — port mapping
- reportStatus(host, image, state)         — on-chain status reporting (NEW)
- getMemberStatus(host)                    — read node health (NEW)
- getNodeCount()                           — count active members (NEW)
```

Events: `MemberJoin`, `MemberLeave`, `MemberImageUpdate`, `StatusReport` — consumed by the scheduler off-chain.

### Feedback Loop Flow

```
┌──────────┐     MemberJoin      ┌──────────────┐    docker pull    ┌──────────┐
│  FEVM    │ ──────────────────► │  Scheduler   │ ───────────────► │  Docker  │
│ Contract │                     │  (libp2p)    │                  │  Host    │
│          │ ◄────────────────── │              │                  │          │
│          │   reportStatus()    │              │  container up    │          │
└──────────┘                     └──────────────┘                  └──────────┘
     │
     │  StatusReport event
     ▼
┌──────────┐
│  Other   │  (observes cluster state via event log)
│  Nodes   │
└──────────┘
```

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
   + health      + health      + health
   checks        checks        checks
        │           │           │
        ▼           ▼           ▼
   Docker Host   Docker Host   Docker Host
   (512MB,       (512MB,       (512MB,
    50% CPU)      50% CPU)      50% CPU)
        │           │           │
        └───────────┼───────────┘
                    ▼
            Filecoin Network
       (Calibration → Mainnet)
```

---

## Prior Art & Differentiation

| Project | Approach | Veil Stack Difference |
|---|---|---|
| **Kubernetes** | Centralized control plane (etcd + scheduler + API server) | No central control plane; governance on FEVM smart contract; libp2p for peer coordination |
| **Docker Swarm** | Built into Docker; manager nodes with Raft consensus | On-chain membership via FEVM; container state reported to smart contract for auditability |
| **Nomad (HashiCorp)** | Centralized scheduler with plugin architecture | Decentralized scheduling with on-chain events; Filecoin storage deal integration (planned) |
| **K3s** | Lightweight Kubernetes for edge | Still requires centralized server; Veil Stack nodes are fully autonomous peers |
| **Akash Network** | Decentralized compute marketplace on Cosmos | Akash uses own chain; Veil Stack leverages FEVM + Filecoin storage for verifiable deployment records |
| **Flux (RunOnFlux)** | Decentralized compute on Zcash | Flux uses proprietary infrastructure; Veil Stack uses open standards (libp2p, FEVM, IPFS) |

**Key differentiator**: Veil Stack is the only orchestrator that combines on-chain governance (FEVM), decentralized networking (libp2p), verifiable storage (IPFS/Filecoin), and planned confidential computing (FHE) in a single platform.

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **FEVM contract bugs** | Medium | High | Extensive test suite (8 contract tests + 5 integration tests); CI enforced; plan external audit in M4 |
| **Filecoin mainnet instability** | Low | High | Calibration testnet for all development; mainnet migration only after stability confirmed |
| **libp2p NAT traversal failures** | Medium | Medium | mDNS for local networks; bootstrap peers for public; relay circuit as fallback |
| **Docker socket access security** | Low | High | Docker socket proxy (tecnativa); resource limits enforced; read-only mode available |
| **FHE performance overhead** | High | Medium | FHE is optional toggle; plaintext scheduling default; performance benchmarks planned |
| **Team bandwidth** | Medium | Medium | Milestones are sequential; P0 items already delivered; FHE can slip without blocking V2 |
| **Filecoin storage provider availability** | Medium | Medium | Multi-provider fallback planned in M2; provider rotation with exponential backoff |

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

| Milestone | Focus | Amount | Estimated Hours | Timeline |
|---|---|---|---|---|
| M1 | Filecoin Deal Pipeline | €15,000 | ~250 hrs | Months 1-5 |
| M2 | CID Verification + Multi-Provider | €12,000 | ~200 hrs | Months 1-4 |
| M3 | FHE Confidential Scheduling | €10,000 | ~170 hrs | Months 1-6 |
| M4 | Production Hardening | €8,000 | ~130 hrs | Months 1-5 |
| **Total** | | **€45,000** | **~750 hrs** | **6 months** |

### Budget Breakdown by Task

| Task | Hours | Rate | Cost | Milestone |
|---|---|---|---|---|
| Solidity contract V2 (StorageDeal struct, events, access control) | 60 | €25/hr | €1,500 | M1 |
| Lotus JSON-RPC integration (filecoin-service.js) | 50 | €25/hr | €1,250 | M1 |
| Deal lifecycle in scheduler (propose → monitor → settle) | 40 | €25/hr | €1,000 | M1 |
| Dashboard deal visualization tab | 30 | €25/hr | €750 | M1 |
| Integration tests (deal proposal, status transitions) | 40 | €25/hr | €1,000 | M1 |
| CID verification in scheduler | 45 | €25/hr | €1,125 | M2 |
| Multi-provider fallback + retry logic | 50 | €25/hr | €1,250 | M2 |
| End-to-end test suite (3-node, failure simulation) | 40 | €25/hr | €1,000 | M2 |
| Documentation (provider setup, deal lifecycle) | 25 | €25/hr | €625 | M2 |
| Zama FHE SDK integration | 60 | €25/hr | €1,500 | M3 |
| Ciphertext scheduling (encrypted cost functions) | 50 | €25/hr | €1,250 | M3 |
| FHE toggle + performance benchmarks | 35 | €25/hr | €875 | M3 |
| Demo cluster (5-node FHE scheduling) | 25 | €25/hr | €625 | M3 |
| Security audit coordination + remediation | 40 | €25/hr | €1,000 | M4 |
| 10-node CI pipeline | 35 | €25/hr | €875 | M4 |
| Federation model + role-based access | 30 | €25/hr | €750 | M4 |
| Mainnet migration plan + documentation | 25 | €25/hr | €625 | M4 |

---

## Societal Impact & Strategic Relevance

### Who Benefits

**European SMEs and Research Institutions**
Small companies and universities building cloud-native applications are locked into hyperscaler orchestration (EKS, GKE). They pay escalating costs, lose control over data placement, and have no portability path. Veil Stack provides a self-sovereign alternative: deploy on your own infrastructure, governed by an open contract, with no vendor dependency.

**Regulated Industries**
Healthcare, finance, and government organizations cannot expose scheduling metrics to shared control planes. Veil Stack's planned FHE layer enables confidential scheduling — nodes participate in a cluster without seeing each other's resource data. This makes multi-org collaboration possible where it is currently blocked by data protection requirements.

**The Filecoin Ecosystem**
Every container deployment on Veil Stack originates a paid Filecoin storage deal. This creates programmatic demand for Filecoin's storage market, turning container orchestration into a demand engine for decentralized storage — directly advancing the Filecoin network's utility and economic sustainability.

**Open Source Infrastructure Commons**
Veil Stack is built entirely on open standards: libp2p (used by IPFS, Ethereum 2.0, Polkadot), FEVM (Filecoin's EVM), IPFS (verifiable content addressing), and Docker (open container runtime). No proprietary components. The entire stack is MIT-licensed and auditable.

### Contribution to the Open Internet

| Open Internet Principle | How Veil Stack Advances It |
|---|---|
| **User sovereignty** | Cluster governance lives on a public smart contract, not a vendor's API server |
| **Open standards** | libp2p, FEVM, IPFS, Docker — all open protocols, no proprietary lock-in |
| **Verifiable computation** | Every deployment is pinned to IPFS with a CID; every state change is on-chain |
| **Privacy by design** | FHE scheduling (planned) enables confidential clusters without trusted intermediaries |
| **Decentralized infrastructure** | No central control plane; nodes are autonomous peers coordinating via libp2p |

### European Dimension

Cloud infrastructure concentration is a core concern for European digital sovereignty. The EU's Gaia-X initiative and the Data Act both seek to reduce dependency on non-European cloud providers. Veil Stack contributes to this goal by providing an open-source, standards-based orchestration layer that any European organization can deploy, audit, and govern — without dependency on AWS, GCP, or Azure.

### Measurable Outcomes (If Funded)

- **M1**: Every container deployment triggers a Filecoin storage deal — first verifiable deployment pipeline
- **M2**: CID-verified image retrieval — tamper-evident supply chain for container images
- **M3**: 5-node FHE scheduling demo — first encrypted orchestration cluster on Filecoin
- **M4**: Security audit + 10-node CI — production-grade open source orchestrator

### Comparison to Existing Approaches

| Project | Approach | Limitation | Veil Stack Advantage |
|---|---|---|---|
| **Kubernetes** | Centralized control plane (etcd + scheduler) | Single point of failure; vendor-controlled | No central plane; on-chain governance |
| **Akash Network** | Decentralized compute marketplace (Cosmos) | Own L1 chain; no storage integration | FEVM-native; Filecoin deal origination |
| **Flux** | Decentralized compute (Zcash) | Proprietary infrastructure | Open standards (libp2p, FEVM, IPFS) |
| **Nomad** | Centralized scheduler with plugins | Still requires trusted server | Autonomous peers; no trusted coordinator |

**Key differentiator**: Veil Stack is the only orchestrator that combines on-chain governance (FEVM), decentralized networking (libp2p), verifiable storage (IPFS/Filecoin), and confidential computing (FHE) in a single platform.

---

## Test Coverage

### Contract Tests (`test/canteen_test.js`)

| Category | Tests | Coverage |
|---|---|---|
| Initial state | 1 | Zero members, zero images |
| Member lifecycle | 1 | Add/remove members, image assignment |
| Image management | 1 | Add/remove images, rebalancing, port mapping |
| Status reporting | 5 | reportStatus, getMemberStatus, event emission, non-member rejection, cleanup on removal |
| Node counting | 1 | getNodeCount accuracy across add/remove |

### Integration Tests (`test/integration_test.js`)

| Test | What it verifies |
|---|---|
| GET /status | Valid JSON with container info, Docker status |
| GET /cluster | Peer info, members array, multiaddrs |
| GET /containers | Container list structure, Docker availability |
| Container lifecycle | Running state reported when container is up |
| Docker detection | Backend correctly detects Docker availability |

---

## Team

### Shivam Kumar ([@shivv23](https://github.com/shivv23))

Full-stack developer with experience across distributed systems, cloud-native infrastructure, and open source contributions. Active contributor to [Meshery](https://github.com/meshery/meshery) (CNCF cloud native manager), [libp2p](https://github.com/libp2p) peer-to-peer networking, and [Sugar Labs](https://github.com/sugarlabs/musicblocks) education software. Technical stack spans Go, Rust, TypeScript, and Python with production experience in Docker, Kubernetes, and cloud infrastructure (AWS, GCP). Built and shipped Veil Stack V1 — smart contract, scheduler, libp2p cluster, web dashboard, CI/CD pipeline.

### Sumanjeet ([@sumanjeet0012](https://github.com/sumanjeet0012))

Open source contributor with 100+ public repositories and active involvement in the [libp2p](https://github.com/libp2p/py-libp2p) ecosystem. Core contributor to py-libp2p universal connectivity project — authored the pub-sub example ([PR #515](https://github.com/libp2p/py-libp2p/pull/515)) and leads the Kademlia DHT implementation ([#540](https://github.com/libp2p/py-libp2p/issues/540)). Experience with decentralized systems, agent-based architectures, and peer-to-peer protocols. Developed Canteen.sol smart contract and FEVM integration for Veil Stack.

---

## Links

- Repository: https://github.com/shivv23/Veil-Stack
- Contract: https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A
- Dashboard: https://veil-stack-canteen.vercel.app/dashboard/
- License: MIT
