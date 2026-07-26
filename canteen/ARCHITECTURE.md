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
│  ┌─────────────────────────────────────────┐                   │
│  │        Filecoin Calibration             │                   │
│  │        (Testnet)                        │                   │
│  └────────────────┬────────────────────────┘                   │
│                   │                                            │
│      ┌────────────▼────────────────────────┐                   │
│      │    Canteen Smart Contract           │                   │
│      │  - addImage()                       │                   │
│      │  - addMember()                      │                   │
│      │  - getImages()                      │                   │
│      │  - reportStatus() / getMemberStatus()                   │
│      │  - Events: MemberJoin, MemberLeave, MemberImageUpdate, StatusReport │
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
│  │  ┌──────────────┐  ┌──────────────┐                          │     │
│  │  │  Config      │  │  Web3        │                          │     │
│  │  │  Module      │  │  Service     │                          │     │
│  │  │  - Chains    │  │  - Events    │                          │     │
│  │  │  - RPC URLs  │  │  - Read-only │                          │     │
│  │  └──────────────┘  └──────────────┘                          │     │
│  │                                                         │     │
│  │  ┌─────────────────────────────────────────────────┐    │     │
│  │  │         Scheduler (Event-Driven)                │    │     │
│  │  │  - Listen to MemberJoin, MemberLeave, MemberImageUpdate events  │
│  │  │  - Orchestrate container lifecycle              │    │     │
│  │  │  - Report status back to contract               │    │     │
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
Display Account Address
```

### 2. Node Registration
```
User clicks "Register Node"
  ↓
Dashboard → MetaMask (sign transaction)
  ↓
MetaMask → Blockchain (addMember())
  ↓
Blockchain emits MemberJoin event
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
Blockchain emits MemberImageUpdate event
  ↓
Backend listens → detects event
  ↓
Backend → Docker (pull image)
  ↓
Backend → Docker (create + start container)
  ↓
Container running!
```

## Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: MetaMask Wallet                                   │
│  ✓ Private keys stored locally by user                      │
│  ✓ User controls all transactions                           │
│  ✓ No backend access to keys                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 2: Smart Contract (Filecoin Calibration)             │
│  ✓ Immutable code on-chain                                  │
│  ✓ Owner-only functions (addMember, addImage, etc.)         │
│  ✓ reportAddr validation on status reporting                │
│  ✓ transferOwnership for admin handoff                      │
│  ✓ Event-driven architecture                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 3: Backend (Read-Only)                               │
│  ✓ No private key storage (MetaMask mode)                   │
│  ✓ Event listener only                                      │
│  ✓ Cannot initiate transactions                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 4: Docker Isolation                                  │
│  ✓ Containerized workloads                                  │
│  ✓ Resource limits (512MB RAM, 50% CPU)                     │
│  ✓ Network isolation                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
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
scheduler.js ─────────┤
cluster.js ───────────┤
web-server.js ────────┘

Frontend:
App.js ──► Render UI (React + D3 + Web3)
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
                                               veilstack.js

.env (Frontend) ──────────► React App ──────► App.js (Web3 + MetaMask)
```

---
