[![Live Dashboard](https://img.shields.io/badge/Live-Dashboard-0090FF)](https://veil-stack-canteen.vercel.app/dashboard/)
[![FEVM Calibration](https://img.shields.io/badge/FEVM-Calibration-42A5F5)](https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7)

## Veil Stack: Decentralized Container Orchestrator

Veil Stack is a **decentralized container orchestration platform** governed by an **FEVM smart contract** (Canteen.sol) deployed on **Filecoin Calibration**. Node coordination runs over **libp2p**, each deployment manifest is pinned to **IPFS**, and a planned FHE layer will enable confidential scheduling for regulated workloads.

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
| Filecoin deals are mostly manual, one-off | Every container deployment **is designed to** automatically propose, monitor, and renew deals (planned V2) |
| Regulated workloads need confidentiality | Planned FHE encryption for scheduling on ciphertext |

---

### Current State

Canteen.sol **V1** is deployed on Filecoin Calibration at [`0x04dEf60e2853E4d654b366cd8103F929c456d4b7`](https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7). What exists now and what's planned next:

| Component | Status |
|---|---|
| Canteen.sol on FEVM Calibration (membership + image registry) | Deployed and working |
| Web dashboard with D3 force-directed graph | Source in `canteen/dashboard/` |
| MetaMask connection with Filecoin Calibration (chain 314159) | Working |
| Read-only and MetaMask-signed contract operations | Working |
| libp2p cluster networking (TCP, mDNS, gossip heartbeats) | Working |
| Docker container runtime (pull, create, start) | Working |
| IPFS pinning via Pinata (container metadata, image manifests) | Working |
| DealAnchored event listener + deal history table | **Planned (V2)** |
| **Automated Filecoin deal proposal from addImage()** | **Planned** |
| **Deal monitoring (proposed → active → expired/slashed)** | **Planned** |
| **CID-verified image retrieval** | **Planned** |
| **Multi-provider deal fallback** | **Planned** |
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
| **Canteen.sol (FEVM)** | Smart contract on Filecoin EVM that governs cluster membership, image registry, and storage deal anchoring _(planned)_ |
| **Dashboard** | React + D3 frontend connected via Web3 to Canteen.sol; reads contract state, visualizes cluster topology, and displays deal history |
| **Veil Node (libp2p)** | Peer-to-peer node with TCP transport, Noise encryption, mDNS/bootstrap discovery, and pubsub health gossip |
| **Scheduler** | Listens for FEVM events (MemberJoin, MemberImageUpdate) and manages Docker containers accordingly |
| **IPFS Service** | Pins deployment manifests to IPFS via Pinata, providing verifiable deployment records |
| **Filecoin Network** | Target chain for FEVM contract and Filecoin deal origination (Calibration testnet now, mainnet migration planned) |
| **Docker Socket Proxy** | `tecnativa/docker-socket-proxy` sidecar; exposes a restricted Docker API over TCP so canteen never holds a raw socket |

---

### Filecoin Integration

#### Current (V1 — Deployed)

| Feature | Description |
|---|---|
| **Canteen.sol on FEVM Calibration** | Member management (addMember, removeMember), image registry (addImage, removeImage), rebalancing, port mapping |
| **Dashboard integration** | Read contract state, register nodes, add/remove images via MetaMask on Filecoin Calibration |
| **Event-driven scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate events; schedules Docker containers accordingly |
| **IPFS pinning** | Each deployment manifest pinned to IPFS via Pinata for verifiability |

#### Planned (V2)

| Feature | Description |
|---|---|
| **StorageDeal struct** | On-chain record: `dealId`, `providerId`, `payloadCid`, `size`, `term` |
| **filecoin-service** | Backend module integrating Lotus JSON-RPC or Glif SDK for deal proposal and monitoring |
| **Deal lifecycle** | `addImage()` proposes a deal, monitors proposed → active → expired/slashed transitions |
| **CID-verified retrieval** | Before pulling an image, verify its CID matches the on-chain deal commitment |
| **Multi-provider fallback** | Re-propose to next available provider if one goes offline |
| **DealAnchored event** | V2 contract emits `DealAnchored(cid, dealId, payer)` — dashboard will display confirmations in real time |

The V2 deal pipeline is the core deliverable of the NLnet grant.

---

### Dashboard

The live dashboard at `https://veil-stack-canteen.vercel.app/dashboard/` provides:

- **Cluster visualization** — D3 force-directed graph of active Veil nodes with their assigned images
- **Contract state** — List of deployed images, member count, contract address, Web3 and cluster connectivity
- **MetaMask integration** — Connect with Filecoin Calibration to register nodes, add/remove images

**Environment** (`.env`):

```
REACT_APP_FIL_CONTRACT_ADDRESS=0x04dEf60e2853E4d654b366cd8103F929c456d4b7
REACT_APP_FIL_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
REACT_APP_FIL_CHAIN_ID=314159
REACT_APP_CLUSTER_URL=http://localhost:5001/cluster
```

IPFS pinning (optional — requires Pinata keys):

```
PINATA_API_KEY=<your-api-key>
PINATA_SECRET_KEY=<your-secret-key>
```

---

### Zama FHE — Planned Confidential Scheduling Layer

Veil Stack plans to support encrypted scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is a **planned feature** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core scheduling works without it.

---

### Zama FHE — Planned Confidential Scheduling Layer

Veil Stack plans to support encrypted scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is a **planned feature** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core Filecoin deal pipeline works without it.

---

### Key Capabilities

| Capability | Description |
|---|---|
| **Filecoin deal automation** | Every container deployment originates, monitors, and renews a paid Filecoin storage deal _(planned V2)_ |
| **FEVM-governed scheduling** | Smart contract on Filecoin EVM manages membership and image registry |
| **libp2p cluster networking** | Peer discovery, gossipsub heartbeats, pubsub messaging — no central control plane |
| **Docker container runtime** | Pull, create, start, and remove containers via Docker Engine API |
| **IPFS pinning (Pinata)** | Container metadata and image manifests pinned to IPFS for verifiable, tamper-evident storage |
| **React + D3 dashboard** | Web3-connected, Filecoin Calibration-native |
| **Confidential scheduling (FHE)** | Planned Zama FHE encrypted telemetry and scheduling for regulated workloads |
| **CID-verified retrieval** | Tamper-evident image pulling with on-chain deal commitment verification _(planned V2)_ |
| **Multi-provider deal fallback** | Automatic re-proposal if a storage provider goes offline _(planned V2)_ |

---

### Example Use Cases

| Use Case | Why Veil Stack |
|---|---|
| **Decentralized cloud compute** | Container orchestration with on-chain governance and IPFS-backed metadata storage |
| **Regulated workloads** | Planned FHE layer keeps scheduling metrics encrypted; audit trail on-chain via FEVM |
| **Cross-org compute cooperatives** | libp2p federation + FEVM governance enable multi-org clusters without trust |
| **AI/ML training pipelines** | Verifiable workload scheduling with tamper-evident audit trail _(planned: on-chain deal anchoring)_ |

---

### Example Use Cases

| Use Case | Why Veil Stack |
|---|---|
| **Decentralized cloud compute** | Container orchestration with automatic Filecoin deal origination — every workload creates storage demand |
| **Regulated workloads** | Planned FHE layer keeps scheduling metrics encrypted; audit trail on-chain via FEVM |
| **Cross-org compute cooperatives** | libp2p federation + FEVM governance enable multi-org clusters without trust |
| **AI/ML training pipelines** | Large model artifacts stored on Filecoin, verified before each training run |

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
npm run migrate:filecoin

# Or use the deploy script (see canteen/docs/FEVM_CALIBRATION_SETUP.md for details)
node deploy-fevm.cjs

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
| P0 | IPFS deployment pinning | Done |
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
