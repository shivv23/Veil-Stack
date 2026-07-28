# Veil Stack — Grant Application

## Project Summary

**Veil Stack** is a decentralized container orchestration platform that shifts infrastructure control from cloud vendor lock-in to open, user-operated systems.

The core problem: container orchestration — the layer that decides where code runs — is controlled by a small number of centralized vendors using proprietary schedulers and closed APIs. Veil Stack replaces this with an open smart contract on Filecoin EVM, peer-to-peer coordination via libp2p, and verifiable storage via IPFS/Filecoin.

**What exists today (V1)**: A working orchestrator with on-chain membership management, event-driven container scheduling, a web dashboard, and 20 tests (8 contract + 5 integration + 7 dashboard) — deployed and verified on Filecoin Calibration.

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

A decentralized orchestration layer, with an open smart contract on a public chain for membership and configuration, peer-to-peer coordination, and verifiable storage, is a direct contribution to the open internet stack. It shifts infrastructure control from vendor platforms to the operators that run them.

Veil Stack addresses all four gaps with a working V1: on-chain membership management (FEVM), decentralized networking (libp2p), event-driven scheduling, and a web dashboard. V2 will add verifiable storage (IPFS/Filecoin) and confidential computing (FHE).

---

## Current State (V1 — Working)

| Component | What Exists | Evidence |
|---|---|---|
| **Canteen.sol (FEVM)** | Smart contract: on-chain membership registry, image configuration, replica ratio calculation, port mapping, **status reporting** | Deployed on Calibration, [verified on Filfox](https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A) |
| **On-chain feedback loop** | Scheduler reports container state (running/stopped/crashed) back to contract via `reportStatus()` | Implemented in `scheduler.js` |
| **Web Dashboard** | React + D3 force-directed cluster visualization, MetaMask integration, contract state reader | Live on Vercel |
| **libp2p Cluster** | TCP transport, Noise encryption, mplex, mDNS/bootstrap discovery, GossipSub heartbeat gossip | Working in `cluster.js` |
| **Docker Runtime** | Pull, create, start, stop, remove containers via Docker Engine API; **resource limits** (512MB RAM, 50% CPU) | Working in `scheduler.js` |
| **Event-Driven Scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate, **StatusReport** on-chain events | Working in `scheduler.js` |
| **Health Checks** | Container status reported on-chain; `getMemberStatus(host)` returns image + state + timestamp | Working |
| **REST API** | `/status`, `/containers`, `/cluster`, `/ipfs` endpoints for backend introspection | Working in `web-server.js` |
| **CLI Tool** | `veilstack` — status, containers, nodes, add-image commands | Working in `veilstack.js` |
| **IPFS Pinning** | Deployment manifests pinned to IPFS via Pinata for verifiable records | Working in `ipfs-service.js` |
| **Docker Compose** | One-command local deployment with Docker socket mounting | `docker-compose.yml` |
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
| **Kubernetes** | Centralized control plane (etcd + scheduler + API server) | No central control plane; on-chain membership and configuration via FEVM; libp2p for peer coordination |
| **Docker Swarm** | Built into Docker; manager nodes with Raft consensus | On-chain membership via FEVM; container state reported to smart contract for auditability |
| **Nomad (HashiCorp)** | Centralized scheduler with plugin architecture | Decentralized scheduling with on-chain events; Filecoin storage deal integration (planned) |
| **K3s** | Lightweight Kubernetes for edge | Still requires centralized server; Veil Stack nodes are fully autonomous peers |
| **Akash Network** | Decentralized compute marketplace on Cosmos | Akash uses own chain; Veil Stack leverages FEVM + Filecoin storage for verifiable deployment records |
| **Flux (RunOnFlux)** | Decentralized compute on Zcash | Flux uses proprietary infrastructure; Veil Stack uses open standards (libp2p, FEVM, IPFS) |

**Key differentiator**: V1 delivers on-chain membership management (FEVM) and decentralized networking (libp2p). V2 will add verifiable storage (Filecoin deal origination) and confidential computing (FHE) — combining four capabilities no other orchestrator offers in a single platform.

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **FEVM contract bugs** | Medium | High | Extensive test suite (8 contract tests + 5 integration tests); CI enforced; plan external audit in M4 |
| **Filecoin mainnet instability** | Low | High | Calibration testnet for all development; mainnet migration only after stability confirmed |
| **libp2p NAT traversal failures** | Medium | Medium | mDNS for local networks; bootstrap peers for public; relay circuit as fallback |
| **Docker socket access security** | Low | High | Docker socket mounted locally only; resource limits enforced; read-only mode available; V2 will add socket proxy |
| **FHE performance overhead** | High | Medium | FHE is optional toggle; plaintext scheduling default; performance benchmarks planned |
| **Team bandwidth** | Medium | Medium | Work is divided: Shivam leads M1+M3 (Solidity, Lotus, FHE); Sumanjeet leads M2+M4 (CID verification, testing, CI); M3 runs in parallel with M1/M2 |
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

## Contract Upgrade Strategy

Smart contracts on FEVM are immutable once deployed. Veil Stack V2 requires a new contract version (`CanteenV2.sol`) with the `StorageDeal` struct and related functions. The migration strategy:

1. **Deploy `CanteenV2.sol`** to Calibration with all V1 functions preserved plus V2 additions
2. **Re-register members** via the new contract — the V1 membership list is small (testnet phase) and re-registration is a one-time cost
3. **Dual-read period**: Dashboard reads from both V1 (historical data) and V2 (active deals) during transition
4. **V1 sunset**: Once V2 is verified on Calibration, V1 contract is deprecated and V2 becomes the sole contract
5. **Mainnet deployment**: Only V2 is deployed to mainnet — no migration needed

This is feasible because Veil Stack is in testnet/development phase. A production-grade upgrade proxy pattern (e.g., OpenZeppelin Transparent Proxy) is planned for mainnet if needed.

---

## Funding-Led Milestones

### Milestone 1: Filecoin Deal Pipeline (€15,000)

**Goal**: Every container deployment originates a paid Filecoin storage deal.

| Deliverable | Description | Timeline |
|---|---|---|
| Canteen.sol V2 | Add `StorageDeal` struct (dealId, providerId, payloadCid, size, term, status) + `DealAnchored` event | Month 1-2 |
| `filecoin-service.js` | Backend module: Lotus JSON-RPC client for `Filecoin.MarketPublishDeal`, deal status polling | Month 2-3 |
| Deal lifecycle in scheduler | `addImage()` proposes a deal; scheduler monitors proposed → active → expired/slashed | Month 3-4 |
| Dashboard: deal tab + analytics | Visualize deal status, provider info, CID, term length; historical deal analytics | Month 4-5 |
| IPFS manifest pinning | Deployment manifests pinned to IPFS with CID anchored on-chain for verifiable records | Month 4-5 |
| Error handling + retry logic | Exponential backoff, provider fallback, deal retry on failure | Month 4-5 |
| Integration tests | Automated tests: deal proposal, status transitions, CID verification | Month 5 |
| Deal lifecycle documentation | Provider setup guide, deal lifecycle docs | Month 5 |

**Exit criteria**: Deploy `nginx:latest` on node A → `filecoin-service.js` calls `Filecoin.MarketPublishDeal` → deal appears with status `active` on Calibration within 30 minutes → `GET /deals` returns deal with `status: 'active'`, valid `providerId`, and correct `payloadCid` → dashboard deal tab displays deal info.

---

### Milestone 2: CID-Verified Retrieval + Multi-Provider (€12,000)

**Goal**: Tamper-evident image pulling with provider resilience.

| Deliverable | Description | Timeline |
|---|---|---|
| CID verification in scheduler | Before `docker pull`, verify image CID matches on-chain deal commitment | Month 1-2 |
| Multi-provider fallback | If primary provider is offline, re-propose to next available provider | Month 2-3 |
| Deal retry logic | Exponential backoff + provider rotation on deal failure | Month 3 |
| Provider health monitoring | Uptime tracking, latency measurement, on-chain reputation scoring | Month 3-4 |
| IPFS content routing | Redundant pinning across multiple gateways for resilience | Month 3-4 |
| End-to-end test suite | 3-node cluster, provider failure simulation, CID integrity checks | Month 3-4 |
| Dashboard: provider health view | Failover status, CID audit log, provider performance history | Month 4 |
| Documentation | Provider setup guide, deal lifecycle docs, troubleshooting | Month 4 |

**Exit criteria**: Pull image → scheduler verifies CID against on-chain deal record → CID matches → if primary provider returns error, scheduler re-routes to next provider within 60 seconds → image pulls successfully from fallback → `GET /providers` returns health status for all providers.

---

### Milestone 3: Confidential Scheduling — FHE Layer (€13,000)

**Goal**: Encrypted scheduling inputs for zero-trust and regulated environments.

**Risk note**: FHE integration is a research-level problem. Month 1 includes a 2-week spike to assess Zama fhEVM compatibility with off-chain scheduling. If fhEVM cannot support off-chain libp2p telemetry encryption, we will scope a custom FHE solution or defer the ciphertext scheduling component to a follow-up milestone, reallocating hours to benchmarks and the demo cluster.

| Deliverable | Description | Timeline |
|---|---|---|
| Zama FHE SDK integration | Encrypted telemetry: nodes encrypt CPU/memory/disk metrics before libp2p gossip | Month 1-3 |
| Ciphertext scheduling | Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics | Month 3-5 |
| Toggle mechanism | `VEIL_FHE_MODE=enabled\|disabled` — plaintext scheduling default, FHE for sensitive clusters | Month 5 |
| Performance benchmarks | Latency/throughput comparison: plaintext vs FHE scheduling across 5-10 nodes | Month 5-6 |
| Demo cluster | 5-node encrypted scheduling demo on Calibration | Month 6 |

**Exit criteria**: 5-node cluster with FHE enabled → nodes encrypt CPU/memory metrics before gossip → scheduling decisions use encrypted inputs → `GET /fhe/status` returns `enabled` → benchmark report shows latency overhead ≤ 3× plaintext baseline.

---

### Milestone 4: Production Hardening (€5,000)

**Goal**: Audit, multi-node CI, mainnet readiness.

| Deliverable | Description | Timeline |
|---|---|---|
| Security audit of Canteen.sol | External or community audit of V2 contract | Month 1-2 |
| 10-node CI pipeline | Automated multi-node cluster testing in GitHub Actions | Month 2-3 |
| Federation model | Cross-org cluster coordination with role-based access | Month 3-4 |
| Mainnet migration plan | Deployment script + checklist for Filecoin mainnet | Month 4 |
| Documentation overhaul | Architecture docs, API reference, contribution guide | Month 4-5 |

**Exit criteria**: Canteen.sol V2 audited with no critical findings → 10-node CI pipeline runs contract + integration tests across 10 nodes → all tests pass → mainnet deployment script tested on Calibration → documentation covers architecture, API, and contribution workflow.

---

## Budget Summary

| Milestone | Focus | Amount | Est. Hours | Timeline | Depends On |
|---|---|---|---|---|---|
| M1 | Filecoin Deal Pipeline | €15,000 | ~600 hrs | Months 1-4 | — |
| M2 | CID Verification + Multi-Provider | €12,000 | ~480 hrs | Months 3-5 | M1 |
| M3 | FHE Confidential Scheduling | €13,000 | ~520 hrs | Months 2-6 | Parallel |
| M4 | Production Hardening | €5,000 | ~200 hrs | Months 5-6 | M1-M3 |
| **Total** | | **€45,000** | **~1,800 hrs** | **6 months** | |

### Budget Breakdown by Task

**Rate**: €25/hr (team of 2: Shivam + Sumanjeet)

| Task | Hours | Rate | Cost | Milestone |
|---|---|---|---|---|
| Canteen.sol V2: `StorageDeal` struct, events, `DealAnchored`/`DealExpired`/`DealSlashed` | 120 | €25/hr | €3,000 | M1 |
| `filecoin-service.js`: Lotus JSON-RPC client, `Filecoin.MarketPublishDeal`, deal status polling | 100 | €25/hr | €2,500 | M1 |
| Deal lifecycle in scheduler: propose → monitor → settle → alert | 80 | €25/hr | €2,000 | M1 |
| Provider negotiation + multi-provider selection logic | 60 | €25/hr | €1,500 | M1 |
| Integration tests: deal proposal, status transitions, CID verification | 60 | €25/hr | €1,500 | M1 |
| Dashboard deal tab: status, provider, CID, term visualization | 50 | €25/hr | €1,250 | M1 |
| Deal analytics dashboard: historical deals, provider performance | 40 | €25/hr | €1,000 | M1 |
| Error handling: retry logic, exponential backoff, provider fallback | 40 | €25/hr | €1,000 | M1 |
| Deal lifecycle documentation + provider setup guide | 30 | €25/hr | €750 | M1 |
| Deployment manifest IPFS pinning + CID anchoring on-chain | 20 | €25/hr | €500 | M1 |
| **M1 Subtotal** | **600** | | **€15,000** | |
| CID verification in scheduler: hash check before `docker pull` | 80 | €25/hr | €2,000 | M2 |
| Multi-provider failover: automatic re-propose on provider offline | 70 | €25/hr | €1,750 | M2 |
| Provider health monitoring: uptime, latency, reputation scoring | 60 | €25/hr | €1,500 | M2 |
| Deal retry logic: exponential backoff + provider rotation | 50 | €25/hr | €1,250 | M2 |
| End-to-end test suite: 3-node cluster, failure simulation, CID integrity | 60 | €25/hr | €1,500 | M2 |
| Dashboard: provider health view, failover status, CID audit log | 50 | €25/hr | €1,250 | M2 |
| Provider reputation system: on-chain scoring, performance history | 40 | €25/hr | €1,000 | M2 |
| IPFS content routing: redundant pinning across multiple gateways | 30 | €25/hr | €750 | M2 |
| Documentation: provider setup, deal lifecycle, troubleshooting | 40 | €25/hr | €1,000 | M2 |
| **M2 Subtotal** | **480** | | **€12,000** | |
| Zama FHE SDK integration: encrypted telemetry from nodes | 130 | €25/hr | €3,250 | M3 |
| Ciphertext scheduling: cost functions on encrypted inputs | 100 | €25/hr | €2,500 | M3 |
| FHE toggle mechanism: `VEIL_FHE_MODE=enabled\|disabled` | 50 | €25/hr | €1,250 | M3 |
| Performance benchmarks: latency/throughput plaintext vs FHE | 80 | €25/hr | €2,000 | M3 |
| Demo cluster: 5-node encrypted scheduling on Calibration | 50 | €25/hr | €1,250 | M3 |
| FHE key management: key generation, rotation, secure storage | 40 | €25/hr | €1,000 | M3 |
| FHE security audit + side-channel resistance review | 40 | €25/hr | €1,000 | M3 |
| FHE integration documentation + operator guide | 30 | €25/hr | €750 | M3 |
| **M3 Subtotal** | **520** | | **€13,000** | |
| Security audit coordination + remediation | 60 | €25/hr | €1,500 | M4 |
| 10-node CI pipeline: automated multi-node cluster in GitHub Actions | 50 | €25/hr | €1,250 | M4 |
| Federation model: cross-org cluster coordination, role-based access | 40 | €25/hr | €1,000 | M4 |
| Mainnet migration: deployment script + checklist + dry-run on Calibration | 30 | €25/hr | €750 | M4 |
| Documentation overhaul: architecture, API reference, contribution guide | 20 | €25/hr | €500 | M4 |
| **M4 Subtotal** | **200** | | **€5,000** | |

---

## Budget Justification

### Rate

€25/hr reflects two contributors working from South Asia, where infrastructure and living costs are significantly lower than Western Europe or North America. This rate is competitive for Solidity + libp2p + Filecoin development in the region and allows the team to deliver the full scope within the €45,000 budget.

### Hour Allocation Rationale

| Task Category | Hours | Justification |
|---|---|---|
| **Solidity development** (Canteen.sol V2) | 120 | StorageDeal struct, events, integration with Lotus JSON-RPC. Smart contract development requires careful testing and gas optimization. |
| **Backend services** (filecoin-service.js, scheduler, provider logic) | 430 | Lotus JSON-RPC integration, deal lifecycle, multi-provider failover, CID verification, retry logic. This is the bulk of V2 — new backend modules that don't exist yet. |
| **FHE integration** | 300 | Research-level work (Zama fhEVM SDK), encrypted telemetry, ciphertext scheduling, key management. Includes 2-week spike to assess feasibility. |
| **Frontend** (dashboard, analytics) | 100 | Deal tab, provider health view, FHE status dashboard. Build on existing React + D3 foundation. |
| **Testing & CI** | 220 | Integration tests, 10-node CI pipeline, end-to-end cluster tests, failure simulation. |
| **Security audit** | 100 | External audit coordination, remediation, side-channel review for FHE. |
| **Documentation** | 90 | Architecture docs, API reference, provider setup guides, operator manuals. |
| **Project management** | 440 | Cross-milestone coordination, dependency management, CI/CD maintenance, code review. |

### Cost per Milestone

| Milestone | Hours | Cost | What the Hours Buy |
|---|---|---|---|
| M1 | 600 | €15,000 | 600 hrs ÷ 2 people = ~15 weeks of focused development on Filecoin deal pipeline |
| M2 | 480 | €12,000 | 480 hrs ÷ 2 people = ~12 weeks on CID verification + multi-provider |
| M3 | 520 | €13,000 | 520 hrs ÷ 2 people = ~13 weeks on FHE (includes research spike) |
| M4 | 200 | €5,000 | 200 hrs ÷ 2 people = ~5 weeks on hardening + audit |

---

## Sustainability

### Post-Grant Maintenance

Veil Stack is designed for low ongoing maintenance costs:
- **Infrastructure**: Calibration testnet is free; mainnet storage deals are self-funding (users pay gas + deal fees)
- **Development**: The codebase is Node.js + Solidity — no expensive toolchains or licenses
- **Community**: Open source under MIT; contributions welcome via GitHub PRs

### Revenue Model (Post-Grant)

Veil Stack is not a SaaS product — it's infrastructure software. Long-term sustainability comes from:

1. **Consulting and integration**: Organizations deploying Veil Stack in production will need setup, customization, and ongoing support. This is the primary revenue path for small open source teams.
2. **Managed deployment packages**: Pre-configured Docker Compose or Helm charts for specific use cases (research computing, fintech compliance, multi-org clusters).
3. **Filecoin ecosystem grants**: As Veil Stack drives storage deal volume, it becomes eligible for Filecoin ecosystem funding (Filecoin Foundation, Protocol Labs grants).
4. **EU funding alignment**: European digital sovereignty initiatives (Gaia-X, IPCEI Cloud) may fund infrastructure projects that reduce hyperscaler dependency.

### Risk: What if the team disbands?

The codebase is open source and MIT-licensed. If the core team stops development:
- The existing V1 code continues to work (no external dependencies that expire)
- The smart contract is immutable on-chain — it cannot be shut down
- Any competent Solidity + Node.js developer can fork and maintain the project
- The libp2p and Docker components are well-documented open standards

### Community Building Plan

- **M1-M2**: Publish blog posts on Filecoin and libp2p community forums documenting the deal pipeline architecture
- **M3**: Present FHE scheduling demo at Filecoin community calls or EthGlobal hackathons
- **M4**: Submit to Filecoin ecosystem directory; publish security audit results publicly
- **Post-grant**: Maintain GitHub Issues/PRs; respond to community contributions within 48 hours

---

## Timeline

```
Month    1         2         3         4         5         6
         ┌─────────────────────────────────┐
M1       │ Canteen V2 │ Lotus │ Deal    │ Dashboard + Tests │
(€15k)   │ Solidity   │ JSON  │ Lifecycle│ Integration       │
         │            │ RPC   │          │                   │
         └─────────────────────────────────┘
                                 ┌─────────────────────────┐
M2                          ┌────│ CID Verify │ Multi-     │
(€12k)                       │    │ + Tests    │ Provider   │
                             │    │            │ + Docs     │
                             │    └─────────────────────────┘
              ┌──────────────────────────────────────────┐
M3           │ Research │ SDK    │ Ciphertext │ Bench- │
(€13k)       │ Spike    │ Integ │ Scheduling │ marks  │
             │ (2 wk)   │       │            │ + Demo │
             └──────────────────────────────────────────┘
                                                   ┌─────────────┐
M4                                            ┌────│ Audit │ CI  │
(€5k)                                         │    │ + Docs│     │
                                              │    └─────────────┘
```

**Key dependencies**:
- M2 depends on M1 (CID verification requires deal records from M1)
- M3 runs in parallel with M1/M2 (no dependency on deal pipeline)
- M4 depends on M1-M3 (audit and hardening after features are complete)

---

## Societal Impact & Strategic Relevance

### Who Benefits

**European SMEs and Research Institutions**
A German research hospital needs to run ML inference workloads across three distributed nodes without exposing patient data to a shared control plane. A Polish fintech startup needs verifiable deployment records for ECB compliance but cannot afford a dedicated DevOps team. A Dutch university consortium wants to share compute resources across campuses without centralizing control with any single institution. These organizations are currently locked into hyperscaler orchestration (EKS, GKE) — paying escalating costs, losing control over data placement, and facing compliance gaps with no current solution. Veil Stack provides an open alternative: deploy on your own infrastructure, governed by a public smart contract, with no vendor dependency.

**Regulated Industries**
Healthcare, finance, and government organizations cannot expose scheduling metrics to shared control planes. Veil Stack's planned FHE layer (M3) will enable confidential scheduling — nodes participate in a cluster without seeing each other's resource data. This makes multi-org collaboration possible where it is currently blocked by data protection requirements.

**The Filecoin Ecosystem**
Veil Stack creates programmatic demand for Filecoin's storage market. V1 already pins deployment manifests to IPFS via Pinata for verifiable records. V2 will tie every container deployment to a paid Filecoin storage deal — turning container orchestration into a demand engine for decentralized storage and directly advancing the network's utility.

**Open Source Infrastructure Commons**
Veil Stack is built entirely on open standards: libp2p (used by IPFS, Ethereum 2.0, Polkadot), FEVM (Filecoin's EVM), IPFS (verifiable content addressing), and Docker (open container runtime). No proprietary components. The entire stack is MIT-licensed and auditable.

### Contribution to the Open Internet

| Open Internet Principle | How Veil Stack Advances It |
|---|---|
| **User sovereignty** | Cluster membership and configuration live on a public smart contract, not a vendor's API server |
| **Open standards** | libp2p, FEVM, IPFS, Docker — all open protocols, no proprietary lock-in |
| **Verifiable computation** | Deployment manifests are pinned to IPFS with a CID (V1); V2 will anchor every deployment CID on-chain |
| **Privacy by design** | FHE scheduling (planned) enables confidential clusters without trusted intermediaries |
| **Decentralized infrastructure** | No central control plane; nodes are autonomous peers coordinating via libp2p |

### European Dimension

Cloud infrastructure concentration is a core concern for European digital sovereignty. The EU's Gaia-X initiative and the Data Act both seek to reduce dependency on non-European cloud providers. Veil Stack contributes to this goal by providing an open-source, standards-based orchestration layer that any European organization can deploy, audit, and operate — without dependency on AWS, GCP, or Azure.

### Measurable Outcomes (If Funded)

**V1 (Already Delivered)**:
- Smart contract deployed and verified on Filecoin Calibration with on-chain membership management
- Event-driven scheduler with Docker runtime integration
- Web dashboard with D3 cluster visualization and MetaMask integration
- 20 tests (8 contract + 5 integration + 7 dashboard), CI passing

**V2 (This Funding)**:
- **M1**: Every container deployment triggers a Filecoin storage deal — first verifiable deployment pipeline on FEVM
- **M2**: CID-verified image retrieval with automatic provider failover — tamper-evident supply chain for container images
- **M3**: 5-node FHE scheduling demo — first encrypted orchestration cluster on Filecoin (pending fhEVM compatibility assessment)
- **M4**: Security audit passed + 10-node CI pipeline passing — production-grade open source orchestrator ready for mainnet

### Comparison to Existing Approaches

| Project | Approach | Limitation | Veil Stack Advantage |
|---|---|---|---|
| **Kubernetes** | Centralized control plane (etcd + scheduler) | Single point of failure; vendor-controlled | No central plane; on-chain membership management |
| **Akash Network** | Decentralized compute marketplace (Cosmos) | Own L1 chain; no storage integration | FEVM-native; Filecoin deal origination |
| **Flux** | Decentralized compute (Zcash) | Proprietary infrastructure | Open standards (libp2p, FEVM, IPFS) |
| **Nomad** | Centralized scheduler with plugins | Still requires trusted server | Autonomous peers; no trusted coordinator |

**Key differentiator**: V1 delivers on-chain membership management (FEVM) and decentralized networking (libp2p). V2 will add verifiable storage (Filecoin deal origination) and confidential computing (FHE) — combining four capabilities no other orchestrator offers in a single platform.

---

## Test Coverage

### Contract Tests (`test/canteen_test.js`)

| Category | Tests | Coverage |
|---|---|---|
| Initial state | 1 | Zero members, zero images |
| Member lifecycle | 1 | Add/remove members, image assignment |
| Image management | 1 | Add/remove images, rebalancing, port mapping |
| Status reporting | 4 | reportStatus, getMemberStatus, event emission, non-member rejection, cleanup on removal |
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

Built and shipped Veil Stack V1 end-to-end: designed and implemented the event-driven scheduler, libp2p cluster networking (TCP transport, Noise encryption, GossipSub), Docker runtime integration, web dashboard (React + D3), REST API, CLI tool, CI/CD pipeline, and the full test suite. Extended `Canteen.sol` with `reportAddr` validation, `transferOwnership()`, and on-chain status reporting. Background in distributed systems and cloud-native infrastructure (Go, Rust, TypeScript, Python) with prior contributions to [Meshery](https://github.com/meshery/meshery) (CNCF) and [libp2p](https://github.com/libp2p).

### Sumanjeet ([@sumanjeet0012](https://github.com/sumanjeet0012))

Active contributor to [py-libp2p](https://github.com/libp2p/py-libp2p): authored the pub-sub example ([PR #515](https://github.com/libp2p/py-libp2p/pull/515)) and leads the Kademlia DHT implementation ([#540](https://github.com/libp2p/py-libp2p/issues/540)) — directly relevant to Veil Stack's peer-to-peer coordination layer. Sumanjeet will lead V2's CID verification pipeline (M2), multi-provider failover logic, end-to-end test suite, and CI infrastructure (M4), leveraging his libp2p networking expertise for the provider health monitoring and reputation system.

---

## Links

- Repository: https://github.com/shivv23/Veil-Stack
- Contract: https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A
- Dashboard: https://veil-stack-canteen.vercel.app/dashboard/
- License: MIT
