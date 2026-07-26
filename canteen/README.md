# Canteen

A decentralized container orchestration system built on Filecoin EVM (FEVM).

Canteen replaces centralized container orchestrators with an open smart contract on Filecoin, peer-to-peer coordination via libp2p, and verifiable storage via IPFS. Members register on-chain, images are managed through the contract, and an event-driven scheduler orchestrates container lifecycle across the cluster.

## Architecture

```
Operator / Dashboard (React + D3 + Web3)
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  FEVM Contract (Canteen.sol)
    │         │         │
    ▼         ▼         ▼
  Node A    Node B    Node C
  (libp2p)  (libp2p)  (libp2p)
  +scheduler +scheduler +scheduler
    │         │         │
    ▼         ▼         ▼
  Docker    Docker    Docker
```

## Key Features

- **On-chain governance** — cluster membership, image registry, and status reporting on FEVM
- **Event-driven scheduling** — reacts to on-chain events (MemberJoin, MemberLeave, MemberImageUpdate, StatusReport)
- **libp2p networking** — TCP transport, Noise encryption, GossipSub heartbeat gossip
- **Docker runtime** — pull, create, start, stop containers with resource limits (512MB RAM, 50% CPU)
- **Web dashboard** — React + D3 force-directed cluster visualization with MetaMask integration
- **REST API** — `/status`, `/containers`, `/cluster`, `/health` endpoints
- **CLI tool** — `veilstack status|containers|nodes|add-image`
- **CI/CD** — GitHub Actions: contract tests + Docker compose build

## Quick Start

### Docker Compose (Recommended)

```bash
cd canteen
cp .env.example .env  # Edit with your values
docker compose up --build
```

### Local Development

```bash
cd canteen
npm install
cp .env.example .env
npm start
```

### Running Tests

```bash
# Contract tests (requires Ganache)
npx ganache --port 8545 --deterministic &
sleep 3
npx truffle test --config truffle-config.cjs
kill %1

# Integration tests (requires running backend on port 5001)
node test/integration_test.js
```

## Smart Contract

Deployed on **Filecoin Calibration** at [`0x686d5d622298cfca880168Badf83ac3F71C4a33A`](https://calibration.filfox.info/en/address/0x686d5d622298cfca880168Badf83ac3F71C4a33A)

Key functions:
- `addMember(host)` / `removeMember(host)` — cluster membership
- `addImage(name, replicas)` / `removeImage()` — container registry
- `rebalanceWithUnfortunateImage()` — ratio-based replica scheduling
- `reportStatus(host, image, state)` — on-chain status reporting
- `getMemberStatus(host)` / `getNodeCount()` — cluster queries
- `transferOwnership(newOwner)` — admin handoff

## CLI

```bash
npx veilstack status          # Node and cluster status
npx veilstack containers      # List running containers
npx veilstack nodes           # List cluster members
npx veilstack add-image       # Register an image on-chain
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
ACTIVE_CHAIN=filecoin
FIL_CONTRACT_ADDRESS=0x686d5d622298cfca880168Badf83ac3F71C4a33A
FIL_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
# PRIVATE_KEY=0x...  # Optional: enables on-chain status reporting
```

## Project Structure

```
canteen/
├── contracts/
│   ├── Canteen.sol          # FEVM smart contract
│   └── Migrations.sol       # Truffle migrations
├── scheduler.js             # Event-driven scheduler + container lifecycle
├── cluster.js               # libp2p networking (TCP, Noise, GossipSub)
├── web-server.js            # REST API (/status, /containers, /cluster, /health)
├── index.js                 # Entry point, graceful shutdown
├── config.js                # Multi-chain configuration
├── veilstack.js             # CLI tool
├── ipfs-service.js          # IPFS pinning via Pinata
├── logger.js                # Structured JSON logging
├── test/
│   ├── canteen_test.js      # 8 contract tests
│   └── integration_test.js  # 5 integration tests
├── dashboard/               # React + D3 + Web3 dashboard
└── deploy-fevm.cjs          # FEVM deployment script
```

## License

MIT
