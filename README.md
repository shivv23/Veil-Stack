## Veil Stack: Decentralized Container Orchestrator

Veil Stack is a **decentralized container orchestration platform** governed by an **FEVM smart contract**. Node coordination runs over **libp2p**, cluster state is managed on-chain, and a planned FHE layer will enable confidential scheduling for regulated workloads.

The long-term vision is to link every scheduled workload to a **paid Filecoin storage deal**, turning container orchestration into a programmatic demand engine for Filecoin's storage market. V1 establishes the on-chain governance and cluster networking foundation; V2 adds the Filecoin deal pipeline.

---

### Current State

Canteen.sol **V1** is deployed on Filecoin Calibration at [`0x04dEf60e2853E4d654b366cd8103F929c456d4b7`](https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7). What exists now and what's planned next:

| Component | Status |
|---|---|
| Canteen.sol on FEVM Calibration (membership + image registry) | Deployed and working |
| Web dashboard with D3 force-directed graph | Live at `/dashboard/` |
| MetaMask connection with Filecoin Calibration (chain 314159) | Working |
| Read-only and MetaMask-signed contract operations | Working |
| libp2p cluster networking (TCP, mDNS, gossip heartbeats) | Working |
| Docker container runtime (pull, create, start, stop) | Working |
| Event-driven scheduler (MemberJoin, MemberLeave, MemberImageUpdate) | Working |
| **StorageDeal struct + deal proposal from addImage()** | **Planned (V2)** |
| **Deal monitoring (proposed → active → expired/slashed)** | **Planned (V2)** |
| **CID-verified image retrieval** | **Planned (V2)** |
| **Multi-provider deal fallback** | **Planned (V2)** |
| **FHE confidential scheduling** | **Research** |

---

### Architecture

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
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  Docker Host │    │  Docker Host │    │  Docker Host │
    └──────────────┘    └──────────────┘    └──────────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │  Filecoin Network │
                     │  (Calibration →   │
                     │   Mainnet)        │
                     └──────────────────┘
```

**Components:**

| Component | Description |
|---|---|
| **Canteen.sol (FEVM)** | Smart contract on Filecoin EVM that governs cluster membership, image registry, and (V2) storage deal anchoring |
| **Dashboard** | React + D3 frontend connected via Web3 to Canteen.sol; reads contract state, visualizes cluster topology |
| **Veil Node (libp2p)** | Peer-to-peer node with TCP transport, Noise encryption, mDNS/bootstrap discovery, and pubsub health gossip |
| **Scheduler** | Listens for FEVM events (MemberJoin, MemberLeave, MemberImageUpdate) and manages Docker containers accordingly |

---

### Filecoin Integration

#### Current (V1 — Deployed)

| Feature | Description |
|---|---|
| **Canteen.sol on FEVM Calibration** | Member management (addMember, removeMember), image registry (addImage, removeImage), rebalancing, port mapping |
| **Dashboard integration** | Read contract state, register nodes, add/remove images via MetaMask on Filecoin Calibration |
| **Event-driven scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate events; schedules Docker containers accordingly |

#### Planned (V2)

| Feature | Description |
|---|---|
| **StorageDeal struct** | On-chain record: `dealId`, `providerId`, `payloadCid`, `size`, `term` |
| **filecoin-service** | Backend module integrating Lotus JSON-RPC for deal proposal and monitoring |
| **Deal lifecycle** | `addImage()` proposes a deal, monitors proposed → active → expired/slashed transitions |
| **CID-verified retrieval** | Before pulling an image, verify its CID matches the on-chain deal commitment |
| **Multi-provider fallback** | Re-propose to next available provider if one goes offline |

---

### Zama FHE — Planned Confidential Scheduling Layer

Veil Stack plans to support encrypted scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is a **planned feature** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core scheduling pipeline works without it.

---

### Key Capabilities

| Capability | Description |
|---|---|
| **FEVM-governed scheduling** | Smart contract on Filecoin EVM manages membership, image registry |
| **libp2p cluster networking** | Peer discovery, gossip heartbeats, pubsub messaging — no central control plane |
| **Docker container runtime** | Pull, create, start, stop, remove containers via Docker Engine API |
| **Event-driven scheduler** | Responds to on-chain events to assign containers to nodes |
| **React + D3 dashboard** | Web3-connected, Filecoin Calibration-native, token-gated |
| **Filecoin deal automation** | Every container deployment originates a paid Filecoin storage deal _(planned V2)_ |
| **CID-verified retrieval** | Tamper-evident image pulling with on-chain deal commitment verification _(planned V2)_ |
| **Confidential scheduling (FHE)** | Planned Zama FHE encrypted telemetry and scheduling for regulated workloads |

---

### Example Use Cases

| Use Case | Why Veil Stack |
|---|---|
| **Decentralized cloud compute** | On-chain governed container orchestration with libp2p cluster networking |
| **Regulated workloads** | Planned FHE layer keeps scheduling metrics encrypted; audit trail on-chain via FEVM |
| **Cross-org compute cooperatives** | libp2p federation + FEVM governance enable multi-org clusters without trust |
| **AI/ML training pipelines** | Large model artifacts stored on Filecoin with CID verification _(planned V2)_ |

---

### Quick Start

**Connect to the live deployment:**

Open the dashboard at `https://veil-stack-canteen.vercel.app/dashboard/` and connect MetaMask to Filecoin Calibration (chain ID 314159).

**Run a local node:**

```bash
# Clone the repository
git clone https://github.com/seetadev/Veil-Stack.git
cd Veil-Stack/canteen

# Install dependencies
npm install

# Deploy Canteen.sol to Filecoin Calibration
npx truffle migrate --network filecoin

# Start a Veil node
npm start
```

**Build the dashboard:**

```bash
cd canteen/dashboard
npm install
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

---

### Roadmap

| Priority | Feature | Status |
|---|---|---|
| P0 | Canteen.sol V1 on FEVM Calibration | Done |
| P0 | Web dashboard with D3 visualization | Done |
| P0 | libp2p cluster networking | Done |
| P0 | Docker container management | Done |
| P0 | V2 contract with StorageDeal + DealAnchored | Planned |
| P0 | Filecoin deal proposal and monitoring | Planned |
| P0 | CID-verified image retrieval | Planned |
| P0 | Deal lifecycle dashboard visualization | Planned |
| P1 | Multi-provider deal fallback | Planned |
| P1 | Mainnet migration | Future |
| P2 | Zama FHE confidential scheduling | Research |
| P2 | 10-node cluster CI + federation model | Research |
| P3 | Security audit | Planned |

---

### License

MIT
