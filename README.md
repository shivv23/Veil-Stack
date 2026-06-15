## Veil Stack: Decentralized Container Orchestrator — Every Workload Originates a Paid Filecoin Storage Deal

Veil Stack is a **decentralized container orchestration platform** where every scheduled workload automatically originates a **paid Filecoin storage deal**. Cluster scheduling is governed by an **FEVM smart contract**, node coordination runs over **libp2p**, and an optional **Zama FHE** layer enables confidential scheduling for regulated workloads.

In Veil Stack, scheduling a container is inseparably linked to making a Filecoin deal:
- Every `addImage()` call proposes a Filecoin storage deal for the container image
- The scheduler rejects images without a valid, active deal
- CID-verified retrieval ensures the pulled image matches the on-chain deal commitment
- Deal lifecycle (proposed → active → expired/slashed) is tracked in the dashboard

This turns container orchestration into a **Filecoin deal origination engine** — every deployment creates net-new paid storage demand on Filecoin.

---

### Why This Matters

Filecoin's storage market needs **programmatic, recurring demand**. Veil Stack supplies exactly that:

| Problem | Veil Stack Solution |
|---|---|
| Filecoin deals are mostly manual, one-off | Every container deployment **automatically** proposes, monitors, and renews deals |
| FEVM is underutilized beyond storage contracts | Canteen.sol on FEVM proves real-time scheduling logic on Filecoin |
| Decentralized cloud lacks a storage substrate | IPFS CID verification + Filecoin deal anchoring = tamper-evident image delivery |
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

### Filecoin Integration

The Filecoin layer is the centerpiece of Veil Stack's architecture:

| Component | Description |
|---|---|
| **Canteen.sol on FEVM** | Smart contract on Filecoin EVM (Calibration → Mainnet) governs membership, image registry, storage deal anchoring |
| **StorageDeal struct** | On-chain record: `dealId`, `providerId`, `payloadCid`, `size`, `term`. Images without active deals are rejected |
| **filecoin-service.js** | Backend module integrating Lotus JSON-RPC or Glif SDK. On `addImage()`: compute CID, propose deal, monitor state |
| **CID-verified retrieval** | Before pulling an image, verify its CID matches the on-chain deal. Tamper-evident, auditable |
| **Multi-provider fallback** | If a deal provider goes offline, automatically re-propose to the next available provider |

#### Deal Lifecycle

```
addImage(image)
  │
  ├── compute IPFS CID of image layers
  ├── propose Filecoin storage deal
  │     └── monitor: proposed → active → (expired | slashed)
  ├── link deal to image in Canteen.sol
  └── image ready for scheduling
        │
        scheduler: reject images without active deals
        pull: verify CID matches on-chain commitment
        if verification fails: fall back to IPFS gateway, flag for admin
```

---

### Zama FHE — Optional Confidential Scheduling Layer

Veil Stack can optionally encrypt scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p SWIM heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is an **optional add-on** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core Filecoin deal pipeline works with or without it.

---

### Key Capabilities

| Capability | Description |
|---|---|
| **Filecoin deal automation** | Every container deployment originates, monitors, and renews a paid Filecoin storage deal |
| **FEVM-governed scheduling** | Smart contract on Filecoin EVM manages membership, image registry, deal anchoring |
| **libp2p cluster networking** | Peer discovery, SWIM health gossip, pubsub messaging — no central control plane |
| **Docker container runtime** | Pull, create, start, stop, remove containers via Docker Engine API |
| **React + D3 dashboard** | Web3-connected, multi-chain (Ethereum Sepolia + Filecoin Calibration), token-gated |
| **Confidential scheduling (FHE)** | Optional Zama FHE encrypted telemetry and scheduling for regulated workloads |
| **CID-verified retrieval** | Tamper-evident image pulling with on-chain deal commitment verification |
| **Multi-provider deal fallback** | Automatic re-proposal if a storage provider goes offline |

---

### Example Use Cases

| Use Case | Why Veil Stack |
|---|---|
| **Decentralized cloud compute** | Container orchestration with automatic Filecoin deal origination — every workload creates storage demand |
| **Regulated workloads** | FHE layer keeps scheduling metrics encrypted; audit trail on-chain via FEVM |
| **Cross-org compute cooperatives** | libp2p federation + FEVM governance enable multi-org clusters without trust |
| **AI/ML training pipelines** | Large model artifacts stored on Filecoin, verified before each training run |

---

### Quick Start

1. **Deploy Canteen.sol** to Filecoin Calibration or Ethereum Sepolia
2. **Configure** `.env` with contract address, bootstrap peer, and Filecoin endpoint
3. **Start nodes**: `docker compose up` — Ganache, Canteen backend, Dashboard
4. **Add an image**: `addImage()` → proposes Filecoin deal, links CID to contract
5. **Schedule**: The event-driven scheduler assigns containers to nodes with active deals

```bash
# Example: Filecoin Calibration deployment
npx truffle migrate --network filecoin
```

---

### Extensions & Roadmap

| Priority | Feature | Status |
|---|---|---|
| P0 | FEVM contract deployment + StorageDeal struct | Planned |
| P0 | filecoin-service.js — deal proposal & monitoring | Planned |
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
