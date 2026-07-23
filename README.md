[![Live Dashboard](https://img.shields.io/badge/Live-Dashboard-0090FF)](https://veil-stack-canteen.vercel.app/dashboard/)
[![FEVM Calibration](https://img.shields.io/badge/FEVM-Calibration-42A5F5)](https://calibration.filfox.info/en/address/0x1731f4A5CC4c2f9a542389A42714aF7A1000f449)
[![CI](https://img.shields.io/github/actions/workflow/status/shivv23/Veil-Stack/test.yml?label=CI)](https://github.com/shivv23/Veil-Stack/actions)

## Veil Stack: Decentralized Container Orchestrator

Veil Stack is a **decentralized container orchestration platform** governed by an **FEVM smart contract**. Node coordination runs over **libp2p**, cluster state is managed on-chain, and a planned FHE layer will enable confidential scheduling for regulated workloads.

The long-term vision is to link every scheduled workload to a **paid Filecoin storage deal**, turning container orchestration into a programmatic demand engine for Filecoin's storage market. V1 establishes the on-chain governance and cluster networking foundation; V2 adds the Filecoin deal pipeline.

---

### Current State

Canteen.sol is deployed on Filecoin Calibration at [`0x1731f4A5CC4c2f9a542389A42714aF7A1000f449`](https://calibration.filfox.info/en/address/0x1731f4A5CC4c2f9a542389A42714aF7A1000f449).

| Component | Status |
|---|---|
| Canteen.sol on FEVM Calibration (membership, image registry, status reporting) | Deployed and working |
| On-chain feedback loop (scheduler reports container state to contract) | Working |
| Web dashboard with D3 force-directed graph | Live at `/dashboard/` |
| MetaMask connection with Filecoin Calibration (chain 314159) | Working |
| Read-only and MetaMask-signed contract operations | Working |
| libp2p cluster networking (TCP, Noise, mDNS, GossipSub) | Working |
| Docker container runtime (pull, create, start, stop, remove) | Working |
| Container resource limits (512MB memory, 50% CPU, restart policy) | Working |
| IPFS pinning via Pinata (container metadata, image manifests) | Working |
| Event-driven scheduler (MemberJoin, MemberLeave, MemberImageUpdate) | Working |
| Health checks (container status reported on-chain via StatusReport) | Working |
| REST API (`/status`, `/containers`, `/cluster`, `/ipfs`) | Working |
| CLI tool (`veilstack` — status, containers, nodes, add-image) | Working |
| CI/CD (GitHub Actions: contract tests + Docker compose build) | Passing |
| Docker Compose (one-command local deployment) | Working |
| Windows compatibility (Docker named pipe, cross-platform socket detection) | Working |
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
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │   StatusReport    │   StatusReport    │
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
| **Canteen.sol (FEVM)** | Smart contract on Filecoin EVM: cluster membership, image registry, status reporting, replica rebalancing, port mapping |
| **Dashboard** | React + D3 frontend connected via Web3 to Canteen.sol; reads contract state, visualizes cluster topology |
| **Veil Node (libp2p)** | Peer-to-peer node with TCP transport, Noise encryption, mDNS/bootstrap discovery, GossipSub heartbeat gossip |
| **Scheduler** | Listens for FEVM events, manages Docker containers, reports container status back to contract (feedback loop) |
| **REST API** | Express endpoints: `/status`, `/containers`, `/cluster`, `/ipfs` for backend introspection |
| **CLI (`veilstack`)** | Command-line tool for cluster inspection: status, containers, nodes |
| **IPFS Service** | Pins deployment manifests to IPFS via Pinata for verifiable, tamper-evident storage |
| **Filecoin Network** | Target chain for FEVM contract and Filecoin deal origination (Calibration testnet now, mainnet planned) |
| **Docker Socket Proxy** | `tecnativa/docker-socket-proxy` sidecar; exposes a restricted Docker API over TCP |

---

### Feedback Loop

Veil Stack implements a **closed feedback loop** between nodes and the on-chain contract:

1. **Scheduler starts** → bootstraps by checking on-chain registration via `getMemberDetails()`
2. **Event poller** → detects `MemberJoin`, `MemberLeave`, `MemberImageUpdate`, `StatusReport` events
3. **Container lifecycle** → scheduler pulls image, creates container with resource limits (512MB RAM, 50% CPU)
4. **Status reporting** → after container start/stop, scheduler calls `reportStatus(host, image, state)` on-chain
5. **On-chain state** → contract stores `{image, state, lastReported}` per member, emits `StatusReport` event
6. **Other nodes observe** → `StatusReport` events are gossiped via GossipSub and logged by peer schedulers

This means cluster state is always verifiable on-chain — any observer can call `getMemberStatus(host)` to see what image a node is running and whether it's `running`, `stopped`, or `crashed`.

---

### REST API

| Endpoint | Method | Description |
|---|---|---|
| `GET /status` | GET | Node status: host, container image/state, Docker availability, read-only mode |
| `GET /containers` | GET | List all Docker containers managed by this node (id, image, name, state, ports) |
| `GET /cluster` | GET | Cluster topology: host, peerId, peers, members, multiaddrs |
| `GET /ipfs` | GET | List pinned IPFS records (requires Pinata keys) |
| `POST /ipfs` | POST | Pin a JSON manifest to IPFS (`{name, data}`) |
| `DELETE /ipfs/:cid` | DELETE | Unpin a CID from IPFS |

**Example — `/status` response:**

```json
{
  "host": "veil-node-abc123",
  "container": {
    "image": "nginx:latest",
    "state": "running",
    "lastReported": 1700000000
  },
  "docker": true,
  "readOnlyMode": true,
  "registered": true
}
```

---

### Filecoin Integration

#### Current (V1 — Deployed)

| Feature | Description |
|---|---|
| **Canteen.sol on FEVM Calibration** | Member management, image registry, status reporting, rebalancing, port mapping |
| **Dashboard integration** | Read contract state, register nodes, add/remove images via MetaMask on Filecoin Calibration |
| **Event-driven scheduler** | Listens for on-chain events; schedules Docker containers accordingly |
| **On-chain feedback loop** | Scheduler reports container state back to contract; cluster state verifiable on-chain |
| **IPFS pinning** | Each deployment manifest pinned to IPFS via Pinata for verifiability |

#### Planned (V2)

| Feature | Description |
|---|---|
| **StorageDeal struct** | On-chain record: `dealId`, `providerId`, `payloadCid`, `size`, `term` |
| **filecoin-service** | Backend module integrating Lotus JSON-RPC for deal proposal and monitoring |
| **Deal lifecycle** | `addImage()` proposes a deal, monitors proposed → active → expired/slashed transitions |
| **CID-verified retrieval** | Before pulling an image, verify its CID matches the on-chain deal commitment |
| **Multi-provider fallback** | Re-propose to next available provider if one goes offline |

---

### Dashboard

The live dashboard at `https://veil-stack-canteen.vercel.app/dashboard/` provides:

- **Cluster visualization** — D3 force-directed graph of active Veil nodes with their assigned images
- **Contract state** — List of deployed images, member count, contract address, Web3 and cluster connectivity
- **MetaMask integration** — Connect with Filecoin Calibration to register nodes, add/remove images
- **Live container status** — On-chain `StatusReport` data shows node health

**Environment** (`.env`):

```
REACT_APP_FIL_CONTRACT_ADDRESS=0x1731f4A5CC4c2f9a542389A42714aF7A1000f449
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

### CLI

Veil Stack includes a command-line tool for cluster inspection:

```bash
# Install globally
npm install -g ./canteen

# Or run directly
node canteen/veilstack.js <command>
```

| Command | Description |
|---|---|
| `veilstack status` | Chain, contract, members, images, and backend status |
| `veilstack containers` | List running Docker containers managed by the scheduler |
| `veilstack nodes` | Cluster topology and libp2p peer info |
| `veilstack add-image <name> [replicas]` | Check image status on contract |
| `veilstack help` | Show help |

---

### Docker Compose

One-command local deployment:

```bash
cd canteen
docker compose up --build
```

This starts the canteen node with Docker socket access, connected to Filecoin Calibration.

---

### Zama FHE — Planned Confidential Scheduling Layer

Veil Stack plans to support encrypted scheduling inputs using **Zama's Universal FHE SDK** for zero-trust and regulated environments:

- **Encrypted telemetry**: Nodes encrypt CPU, memory, and disk metrics before gossiping via libp2p heartbeats
- **Ciphertext scheduling**: Scheduling cost functions execute on encrypted inputs — no node sees another's raw metrics
- **Toggle-able**: `VEIL_FHE_MODE=enabled|disabled` — plaintext scheduling is the default; FHE is ON for sensitive clusters

This is a **planned feature** for clusters that need confidentiality (healthcare, defense, cross-cloud ML). The core scheduling pipeline works without it.

---

### Quick Start

**Connect to the live deployment:**

Open the dashboard at `https://veil-stack-canteen.vercel.app/dashboard/` and connect MetaMask to Filecoin Calibration (chain ID 314159).

**Run a local node:**

```bash
# Clone the repository
git clone https://github.com/shivv23/Veil-Stack.git
cd Veil-Stack/canteen

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your settings

# Start a Veil node
npm start
```

**Build the dashboard:**

```bash
cd canteen/dashboard
npm install
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

**Run tests:**

```bash
# Contract tests (requires Ganache)
npx ganache --port 8545 --deterministic &
npx truffle test --config truffle-config.cjs

# Integration tests (requires running backend)
node test/integration_test.js
```

---

### Roadmap

| Priority | Feature | Status |
|---|---|---|
| P0 | Canteen.sol on FEVM Calibration | Done |
| P0 | Web dashboard with D3 visualization | Done |
| P0 | libp2p cluster networking | Done |
| P0 | Docker container management | Done |
| P0 | IPFS deployment pinning | Done |
| P0 | On-chain feedback loop (reportStatus) | Done |
| P0 | Container resource limits & health checks | Done |
| P0 | REST API (/status, /containers, /cluster) | Done |
| P0 | CLI tool (veilstack) | Done |
| P0 | CI/CD pipeline (GitHub Actions) | Done |
| P0 | Docker Compose deployment | Done |
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
