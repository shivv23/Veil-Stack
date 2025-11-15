# Canteen Architecture Diagram

## System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                         │
│                                                                │
│  ┌───────────────┐        ┌──────────────────────────────┐     │
│  │   Browser     │        │      MetaMask Wallet         │     │
│  │               │◄──────►│  - Sign transactions         │     │
│  │  Dashboard UI │        │  - Manage accounts           │     │
│  │  (React App)  │        │  - Switch networks           │     │
│  └───────┬───────┘        └──────────────┬───────────────┘     │
│          │                               │                     │
└──────────┼───────────────────────────────┼─────────────────────┘
           │                               │
           │ HTTP API                      │ Web3 RPC
           │                               │
┌──────────▼───────────────────────────────▼─────────────────────┐
│                      BLOCKCHAIN LAYER                          │
│                                                                │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │   Ethereum      │         │   Filecoin      │               │
│  │   Sepolia       │         │   Calibration   │               │
│  │   (Testnet)     │         │   (Testnet)     │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                        │
│      ┌────▼──────────────────────────▼─────┐                   │
│      │    Canteen Smart Contract           │                   │
│      │  - addImage()                        │                  │
│      │  - addMember()                       │                  │
│      │  - getImages()                       │                  │
│      │  - Events: ImageAdded, MemberAdded   │                  │
│      └────────────────┬─────────────────────┘                  │
│                       │                                        │
└───────────────────────┼────────────────────────────────────────┘
                        │ Event Subscription
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │           Canteen Node (Read-Only Mode)                 │     │
│  │                                                         │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐    │     │
│  │  │  Config      │  │  Web3        │  │  Token      │    │     │
│  │  │  Module      │  │  Service     │  │  Gate       │    │     │
│  │  │  - Chains    │  │  - Events    │  │  - ERC20    │    │     │
│  │  │  - Tokens    │  │  - Read-only │  │  - ERC721   │    │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘    │     │
│  │                                                         │     │
│  │  ┌─────────────────────────────────────────────────┐    │     │
│  │  │         Scheduler (Event-Driven)                │    │     │
│  │  │  - Listen to ImageAdded events                  │    │     │
│  │  │  - Listen to MemberAdded events                 │    │     │
│  │  │  - Orchestrate container lifecycle              │    │     │
│  │  └────────────────────┬────────────────────────────┘    │     │
│  │                       │                                 │     │
│  └───────────────────────┼─────────────────────────────────┘     │
│                          │                                       │
│  ┌───────────────────────▼────────────────────────┐              │
│  │         libp2p Cluster Network                 │              │
│  │  - Peer discovery (mDNS)                       │              │
│  │  - Gossipsub messaging                         │              │
│  │  - Multi-node coordination                     │              │
│  └────────────────────────────────────────────────┘              │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    CONTAINER RUNTIME                             │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ Container  │  │ Container  │  │ Container  │                  │
│  │   Image 1  │  │   Image 2  │  │   Image 3  │                  │
│  │            │  │            │  │            │                  │
│  │ hello-world│  │   nginx    │  │  rethinkdb │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                  │
│                    Docker Engine                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Wallet Connection
```
User → Dashboard → MetaMask
  ↓
MetaMask approves
  ↓
Dashboard ← Web3 Provider ← MetaMask
  ↓
Check Token Balance (if enabled)
  ↓
Display Access Status
```

### 2. Node Registration
```
User clicks "Register Node"
  ↓
Dashboard → MetaMask (sign transaction)
  ↓
MetaMask → Blockchain (addMember())
  ↓
Blockchain emits MemberAdded event
  ↓
Backend listens → detects event
  ↓
Backend starts scheduling loop
```

### 3. Image Scheduling
```
User enters image + replicas
  ↓
Dashboard → MetaMask (sign transaction)
  ↓
MetaMask → Blockchain (addImage())
  ↓
Blockchain emits ImageAdded event
  ↓
Backend listens → detects event
  ↓
Backend → Docker (pull image)
  ↓
Backend → Docker (create + start container)
  ↓
Container running!
```

## Token Gating Flow

```
┌──────────────────────────────────────────┐
│          User Connects Wallet            │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│   Check if Token Gating is Enabled       │
└───────────┬──────────────┬───────────────┘
            │              │
       YES  │              │  NO
            ▼              ▼
┌─────────────────┐   ┌──────────────────┐
│ Read Token      │   │  Grant Full      │
│ Contract        │   │  Access          │
│ balanceOf()     │   └──────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  balance >= required?   │
└───────┬────────┬────────┘
        │        │
   YES  │        │  NO
        ▼        ▼
┌──────────┐  ┌──────────────┐
│  Grant   │  │  Deny Access │
│  Access  │  │  Show Error  │
└──────────┘  └──────────────┘
```

## Multi-Chain Architecture

```
                    ┌──────────────────┐
                    │   Dashboard      │
                    │   (React App)    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Chain Selector  │
                    └────┬────────┬────┘
                         │        │
              Ethereum   │        │   Filecoin
                         │        │
          ┌──────────────▼───┐ ┌─▼──────────────┐
          │  Ethereum Node   │ │  Filecoin Node │
          │  (Sepolia)       │ │  (Calibration) │
          └──────────────────┘ └────────────────┘
                         │        │
          ┌──────────────▼───┐ ┌─▼──────────────┐
          │  Canteen         │ │  Canteen       │
          │  Contract        │ │  Contract      │
          │  0xAAA...        │ │  0xBBB...      │
          └──────────────────┘ └────────────────┘
```

## Security Model

```
┌─────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 1: MetaMask Wallet                           │
│  ✓ Private keys stored locally by user              │
│  ✓ User controls all transactions                   │
│  ✓ No backend access to keys                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 2: Smart Contract                            │
│  ✓ Immutable code on blockchain                     │
│  ✓ Owner-only functions                             │
│  ✓ Event-driven architecture                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 3: Token Gating (Optional)                   │
│  ✓ ERC20/ERC721 balance verification                │
│  ✓ On-chain access control                          │
│  ✓ Real-time balance checks                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 4: Backend (Read-Only)                       │
│  ✓ No private key storage                           │
│  ✓ Event listener only                              │
│  ✓ Cannot initiate transactions                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 5: Docker Isolation                          │
│  ✓ Containerized workloads                          │
│  ✓ Resource limits                                  │
│  ✓ Network isolation                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Data Flow

```
Write Operations (Requires MetaMask):
User → Dashboard → MetaMask → Blockchain → Event → Backend → Docker

Read Operations (No MetaMask needed):
Dashboard → Backend API → Data
Dashboard → Blockchain RPC → Contract State
```

## Module Dependencies

```
Backend:
config.js ────────────┐
                      ├──► index.js ──► Start Application
web3-service.js ──────┤
                      │
token-gate.js ────────┤
                      │
scheduler.js ─────────┘

Frontend:
useWeb3.js ───────────┐
                      ├──► App.js ──► Render UI
useTokenGate.js ──────┤
                      │
WalletConnect.js ─────┘
```

## Port Mapping

```
┌─────────────────────────────────────────┐
│  Service          │  Port   │  Purpose  │
├───────────────────┼─────────┼───────────┤
│  libp2p P2P       │  5000   │  Cluster  │
│  Health API       │  5001   │  Backend  │
│  Dashboard        │  3001   │  Frontend │
│  Containers       │  8000+  │  Apps     │
└─────────────────────────────────────────┘
```

## Environment Configuration Flow

```
.env (Backend) ───────────► config.js ───────► index.js
                                               scheduler.js
                                               web3-service.js

.env (Frontend) ──────────► React App ──────► useWeb3.js
                                               useTokenGate.js
```

---
