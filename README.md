## Veil Stack: Decentralized Container Orchestrator

Veil Stack is a **decentralized container orchestration platform** governed by an **FEVM smart contract**. Cluster scheduling runs over **libp2p**, node coordination is managed on-chain, and an optional **Zama FHE** layer enables confidential scheduling for regulated workloads.

Current V1 implementation:
- Canteen.sol on FEVM Calibration manages membership and image registry
- libp2p gossip heartbeats for peer discovery and health monitoring
- Docker container runtime (pull, create, start, remove)
- IPFS pinning via Pinata for container metadata and image manifests
- React + D3 dashboard with MetaMask integration

**Planned (V2)**: Every `addImage()` call will propose a Filecoin storage deal, with CID-verified retrieval and deal lifecycle tracking.

---

### Why This Matters

Decentralized container orchestration needs **on-chain governance** and **verifiable storage**:

| Problem | Veil Stack Solution |
|---|---|
| Container orchestration is centralized | FEVM smart contract governs membership and scheduling |
| No verifiable link between workloads and storage | IPFS pinning for tamper-evident metadata storage |
| Regulated workloads need confidentiality | Optional Zama FHE encryption for scheduling on ciphertext |

---

### Architecture Overview

```
                  ┌──────────────────────────┐
                  │   Operator / Dashboard    │
                  │  (React + D3 + Web3)      │
                  └────────────┬─────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  FEVM        │    │  FEVM        │    │  FEVM        │
   │  Contract    │◄──►│  Contract    │◄──►│  Contract    │
   │  (Canteen)   │    │  (Canteen)   │    │  (Canteen)   │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Veil Node A │◄──►│  Veil Node B │◄──►│  Veil Node C │
   │  (libp2p)    │    │  (libp2p)    │    │  (libp2p)    │
   │  + scheduler │    │  + scheduler │    │  + scheduler │
   │  + (FHE)     │    │  + (FHE)     │    │  + (FHE)     │
   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │  Docker Host │    │  Docker Host │    │  Docker Host │
   │  + Filecoin  │    │  + Filecoin  │    │  + Filecoin  │
   │  deal agent  │    │  deal agent  │    │  deal agent  │
   └──────────────┘    └──────────────┘    └──────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Filecoin Network │
                    │  (deal proposal,  │
                    │   retrieval, CID) │
                    └──────────────────┘
```

---

### Filecoin Integration (Current V1)

| Component | Status |
|---|---|
| **Canteen.sol on FEVM** | Deployed on Calibration. Membership + image registry. No deal logic yet. |
| **IPFS pinning (Pinata)** | Container metadata and image manifests pinned automatically |
| **Multi-chain config** | Ethereum Sepolia + Filecoin Calibration |

#### Planned V2: Deal Pipeline

```
addImage(image)
  │
  ├── compute IPFS CID of image layers
  ├── propose Filecoin storage deal
  │     └── monitor: proposed → active → (expired | slashed)
  ├── link deal to image in Canteen.sol
  └── image ready for scheduling
```

The V2 deal pipeline is the core deliverable of the NLnet grant.

---

### Zama FHE — Optional Confidential Scheduling Layer

Veil Stack can optionally encrypt scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p gossipsub heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is an **optional add-on** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core scheduling works with or without it.

---

### Key Capabilities

| Capability | Description |
|---|---|
| **Filecoin deal automation** | Every container deployment originates, monitors, and renews a paid Filecoin storage deal _(planned V2)_ |
| **FEVM-governed scheduling** | Smart contract on Filecoin EVM manages membership and image registry |
| **libp2p cluster networking** | Peer discovery, gossipsub heartbeats, pubsub messaging — no central control plane |
| **Docker container runtime** | Pull, create, start, and remove containers via Docker Engine API |
| **React + D3 dashboard** | Web3-connected, multi-chain (Ethereum Sepolia + Filecoin Calibration), token-gated |
| **Confidential scheduling (FHE)** | Optional Zama FHE encrypted telemetry and scheduling for regulated workloads _(planned)_ |
| **CID-verified retrieval** | Tamper-evident image pulling with on-chain deal commitment verification _(planned V2)_ |
| **Multi-provider deal fallback** | Automatic re-proposal if a storage provider goes offline _(planned V2)_ |

---

### Example Use Cases

| Use Case | Why Veil Stack |
|---|---|
| **Decentralized cloud compute** | Container orchestration with on-chain governance and IPFS-backed metadata storage |
| **Regulated workloads** | FHE layer keeps scheduling metrics encrypted; audit trail on-chain via FEVM |
| **Cross-org compute cooperatives** | libp2p federation + FEVM governance enable multi-org clusters without trust |
| **AI/ML training pipelines** | Verifiable workload scheduling with tamper-evident audit trail _(planned: on-chain deal anchoring)_ |

---

### Quick Start

1. **Deploy Canteen.sol** to Filecoin Calibration or Ethereum Sepolia
2. **Configure** `.env` with contract address, bootstrap peer, and Filecoin endpoint
3. **Start nodes**: `docker compose up` — Ganache, Canteen backend, Dashboard
4. **Add an image**: `addImage()` → registers image in contract, ready for scheduling
5. **Schedule**: The event-driven scheduler assigns containers to nodes with active deals

```bash
# Example: Filecoin Calibration deployment
npx truffle migrate --network filecoin
```

---

### Extensions & Roadmap

| Priority | Feature | Status |
|---|---|---|
| P0 | FEVM contract upgrade + StorageDeal struct | Planned |
| P0 | Deal proposal & monitoring service | Planned |
| P0 | CID-verified image retrieval | Planned |
| P0 | Dashboard deal lifecycle visualization | Planned |
| P1 | Multi-provider deal fallback & health monitoring | Planned |
| P1 | Zama FHE encrypted scheduling integration | Research |
| P2 | State channels for high-frequency scheduling | Research |
| P2 | 10-node cluster CI + federation model | Research |
| P3 | Security audit | Planned |

---

### License

MIT
