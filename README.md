## Veil Stack: Decentralized Container Orchestrator — Every Workload Originates a Paid Filecoin Storage Deal

> **FIL-ProPGF Batch 3** — This project has submitted a $30k, 6-month grant to build the automated Filecoin deal pipeline for container deployments. [Live Dashboard](https://veil-stack-canteen.vercel.app/dashboard/)

Veil Stack is a **decentralized container orchestration platform** that connects container scheduling to **paid Filecoin storage deals**. Node coordination runs over **libp2p**, cluster state is governed by an **FEVM smart contract** (Canteen.sol) deployed on **Filecoin Calibration**, and each deployment manifest is pinned to **IPFS**.

In the post-grant vision, every scheduled workload automatically originates a Filecoin deal:

- An `addImage()` call proposes a Filecoin storage deal for the container image
- The scheduler rejects images without a valid, active deal on-chain
- CID-verified retrieval ensures pulled images match the on-chain deal commitment
- Deal lifecycle (proposed → active → expired/slashed) is tracked in the dashboard

This turns container orchestration into a **Filecoin deal origination engine** — each deployment creates net-new paid storage demand.

---

### Why This Matters

Filecoin's storage market needs **programmatic, recurring demand**. Veil Stack supplies exactly that:

| Problem | Veil Stack Solution |
|---|---|
| Filecoin deals are mostly manual, one-off | Every container deployment **automatically** proposes, monitors, and renews deals |
| FEVM is underutilized beyond simple storage contracts | Canteen.sol on FEVM proves real-time scheduling logic on Filecoin |
| Decentralized cloud lacks a verifiable storage substrate | IPFS CID pinning + Filecoin deal anchoring = tamper-evident image delivery |
| Multi-organization clusters need trust-minimized coordination | libp2p federation + FEVM governance enable cross-org clusters |

---

### Current State

Canteen.sol **V1** is deployed on Filecoin Calibration at [`0x04dEf60e2853E4d654b366cd8103F929c456d4b7`](https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7). What exists now and what the FIL-ProPGF grant will fund:

| Component | Status |
|---|---|
| Canteen.sol on FEVM Calibration (membership + image registry) | Deployed and working |
| Web dashboard with D3 force-directed graph | Live at `/dashboard/` |
| MetaMask connection with Filecoin Calibration (chain 314159) | Working |
| Read-only and MetaMask-signed contract operations | Working |
| libp2p cluster networking (TCP, mDNS, gossip heartbeats) | Working |
| Docker container runtime (pull, create, start, stop) | Working |
| IPFS deployment manifest pinning via Pinata | Working |
| DealAnchored event listener + deal history table (V2-ready) | Built, awaiting V2 contract |
| **Automated Filecoin deal proposal from addImage()** | **Grant scope** |
| **Deal monitoring (proposed → active → expired/slashed)** | **Grant scope** |
| **CID-verified image retrieval** | **Grant scope** |
| **Multi-provider deal fallback** | **Grant scope** |
| **FHE confidential scheduling** | **Future exploration** |

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
    │  + IPFS pin  │    │  + IPFS pin  │    │  + IPFS pin  │
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
| **Canteen.sol (FEVM)** | Smart contract on Filecoin EVM that governs cluster membership, image registry, and storage deal anchoring |
| **Dashboard** | React + D3 frontend connected via Web3 to Canteen.sol; reads contract state, visualizes cluster topology, and displays deal history |
| **Veil Node (libp2p)** | Peer-to-peer node with TCP transport, Noise encryption, mDNS/bootstrap discovery, and pubsub health gossip |
| **Scheduler** | Listens for FEVM events (MemberJoin, MemberImageUpdate) and manages Docker containers accordingly; pins deployment manifests to IPFS |
| **IPFS Service** | Pins deployment manifests to IPFS via Pinata, providing verifiable deployment records |
| **Filecoin Network** | Target chain for FEVM contract and Filecoin deal origination (Calibration testnet now, mainnet after grant) |

---

### Filecoin Integration

The Filecoin layer is the centerpiece of Veil Stack's architecture:

#### Current (V1 — Deployed)

| Feature | Description |
|---|---|
| **Canteen.sol on FEVM Calibration** | Member management (addMember, removeMember), image registry (addImage, removeImage), rebalancing, port mapping |
| **Dashboard integration** | Read contract state, register nodes, add/remove images via MetaMask on Filecoin Calibration |
| **Event-driven scheduler** | Listens for MemberJoin, MemberLeave, MemberImageUpdate events; schedules Docker containers accordingly |
| **IPFS manifest pinning** | Each deployment manifest pinned to IPFS via Pinata for verifiability |

#### Grant Scope (V2)

| Feature | Description |
|---|---|
| **StorageDeal struct** | On-chain record: `dealId`, `providerId`, `payloadCid`, `size`, `term` |
| **filecoin-service** | Backend module integrating Lotus JSON-RPC or Glif SDK for deal proposal and monitoring |
| **Deal lifecycle** | `addImage()` proposes a deal, monitors proposed → active → expired/slashed transitions |
| **CID-verified retrieval** | Before pulling an image, verify its CID matches the on-chain deal commitment |
| **Multi-provider fallback** | Re-propose to next available provider if one goes offline |
| **DealAnchored event** | V2 contract emits `DealAnchored(cid, dealId, payer)` — listener already built in dashboard |

---

### Dashboard

The live dashboard at `https://veil-stack-canteen.vercel.app/dashboard/` provides:

- **Cluster visualization** — D3 force-directed graph of active Veil nodes with their assigned images
- **Contract state** — List of deployed images, member count, contract address, Web3 and cluster connectivity
- **MetaMask integration** — Connect with Filecoin Calibration to register nodes, add/remove images
- **IPFS status** — Shows recent deployment pins with gateway links
- **DealAnchored listener** — Subscribes to V2 contract events; gracefully displays "V2 pending" until grant contract deploys
- **Deal history table** — Ready to display anchored deals with CID, deal ID, payer, and status

**Environment** (`.env`):

```
REACT_APP_FIL_CONTRACT_ADDRESS=0x04dEf60e2853E4d654b366cd8103F929c456d4b7
REACT_APP_FIL_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
REACT_APP_FIL_CHAIN_ID=314159
REACT_APP_CLUSTER_URL=http://localhost:5001/cluster
REACT_APP_IPFS_URL=http://localhost:5001/ipfs
```

---

### Key Capabilities

| Capability | Description |
|---|---|
| **Filecoin deal automation** | Every container deployment originates, monitors, and renews a paid Filecoin storage deal *(grant scope)* |
| **FEVM-governed scheduling** | Smart contract on Filecoin EVM manages membership, image registry, deal anchoring |
| **libp2p cluster networking** | Peer discovery, SWIM health gossip, pubsub messaging — no central control plane |
| **Docker container runtime** | Pull, create, start, stop, remove containers via Docker Engine API |
| **React + D3 dashboard** | Web3-connected, Filecoin Calibration-native, token-gated |
| **IPFS deployment pinning** | Verifiable deployment manifest storage via Pinata |
| **CID-verified retrieval** | Tamper-evident image pulling with on-chain deal commitment verification *(grant scope)* |
| **Multi-provider deal fallback** | Automatic re-proposal if a storage provider goes offline *(grant scope)* |

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
| P0 | V2 contract with StorageDeal + DealAnchored | Grant scope (M1) |
| P0 | Filecoin deal proposal and monitoring | Grant scope (M1-M2) |
| P0 | CID-verified image retrieval | Grant scope (M2) |
| P0 | Deal lifecycle dashboard visualization | Grant scope (M2-M3) |
| P1 | Multi-provider deal fallback | Grant scope (M3) |
| P1 | Mainnet migration | Post-grant |
| P2 | Zama FHE confidential scheduling | Research |
| P2 | 10-node cluster CI + federation model | Research |
| P3 | Security audit | Planned |

---

### License

MIT
