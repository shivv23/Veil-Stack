# Canteen Local Setup

Quick guide to run the Canteen container orchestrator locally.

## Prerequisites

- **Node.js**: v18+ recommended
- **Docker**: Running with socket access (`/var/run/docker.sock`)
- **npm**: Bundled with Node.js

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Blockchain

In a separate terminal, start Ganache:

```bash
npx ganache --wallet.totalAccounts 10
```

Keep this running. Note the first account's **private key** from the output.

### 3. Compile & Deploy Contracts

```bash
# Compile Solidity contracts
npx truffle compile

# Deploy to local network
npx truffle migrate --network development --reset
```

Note the deployed **Canteen contract address** from the output.

### 4. Configure Application

Update `index.js` with your deployment details:

```javascript
scheduler.start(
  new Web3.providers.HttpProvider('http://localhost:8545'),
  '0xYOUR_DEPLOYED_CONTRACT_ADDRESS',  // From step 3
  '0xYOUR_GANACHE_PRIVATE_KEY'         // From step 2 (account 0)
)
```

### 5. Start Canteen Node

```bash
npm start -- port=5000 webPort=5001
```

Expected output:
```
Libp2p node started with PeerId: 12D3Koo...
Cluster started successfully
Cluster health check web service is listening on port 5001
Node has been registered on Canteen.
```

### 6. Verify Running

Check cluster health:

```bash
curl http://localhost:5001/cluster
```

Should return JSON with cluster info.

### 7. Start Dashboard (Optional)

In a separate terminal:

```bash
cd dashboard
npm install  # First time only
npm start
```

The dashboard will open automatically at http://localhost:3001

**Expected status bar:** `web3:ok | contract:ok | cluster:ok`

**Dashboard Configuration** (already set in `dashboard/.env`):
- API endpoint: `http://localhost:5001/cluster`
- Contract address: (auto-updated from deployment)
- Ganache RPC: `http://localhost:8545`

## Using the Dashboard

### View Cluster Status
- See connected nodes in the visualization
- Monitor cluster health in the status bar
- View deployed images and replica counts

### Schedule a Container via Dashboard

1. Scroll to the **"Add Image"** section
2. Enter image name: `crccheck/hello-world`
3. Enter number of replicas: `1`
4. Click **"Add Image"**

The backend will:
- Pull the Docker image
- Start a container on an available node
- Show the container in `docker ps`

### View Results

```bash
# Check running containers
docker ps

# View backend logs (Terminal 2)
# Should show: "Starting up a container with the image 'crccheck/hello-world'"
```

## Schedule a Container (CLI Alternative)

Open Truffle console:

```bash
npx truffle console --network development
```

Schedule an image:

```javascript
const c = await Canteen.deployed()
await c.addImage("crccheck/hello-world", 1)
```

The node will pull and start the Docker container automatically.

Verify:

```bash
docker ps
```

## Multi-Node Cluster (Optional)

Start additional nodes pointing to the first:

```bash
npm start -- port=5001 webPort=5002 nodes=127.0.0.1:5000
npm start -- port=5002 webPort=5003 nodes=127.0.0.1:5000
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Ganache   │───▶│   Canteen    │───▶│   Docker    │
│ (Ethereum)  │     │   Node(s)    │     │  Containers │
└─────────────┘     └──────────────┘     └─────────────┘
      :8545         libp2p + scheduler         local
```

## Ports

- **8545**: Ganache RPC
- **5000**: Cluster node (libp2p)
- **5001**: Backend Health API
- **3001**: Dashboard UI
- **8000/8080**: Container ports (varies by image)

## Common Issues

### Backend Issues

**"Owner-only" revert errors**
- Ensure the private key in `index.js` matches the account that deployed the contract

**Docker permission denied or "Cannot read properties of null"**
- **Docker Desktop users**: The scheduler auto-detects Docker Desktop socket
- **Native Docker**: Add your user to the `docker` group: `sudo usermod -aG docker $USER`
- Re-login for changes to take effect
- Verify Docker is running: `docker ps`

**Port conflicts**
- Change `port` and `webPort` parameters when starting the node

**ESM/CommonJS errors**
- `truffle-config.js` is a symlink to `truffle-config.cjs` (don't delete either)
- Migration files use `.js` extension (Truffle requirement)

### Dashboard Issues

**Dashboard shows `cluster:down`**
- Ensure backend is running on port 5001: `curl http://localhost:5001/cluster`
- Check `dashboard/.env` has correct URL: `REACT_APP_CLUSTER_URL=http://localhost:5001/cluster`
- **Important**: Restart dashboard after changing `.env` (Ctrl+C then `npm start`)

**"Out of Gas" or ABI errors**
- Copy latest contract: `cp build/contracts/Canteen.json dashboard/src/Canteen.json`
- Update contract address in `dashboard/.env`
- Restart dashboard

**CORS errors**
- Backend CORS is already configured for `*` (all origins)
- Ensure backend is running before starting dashboard

## Complete Shutdown

Stop all services in order:

```bash
# 1. Stop dashboard (Terminal 3)
Ctrl+C

# 2. Stop backend node (Terminal 2)
Ctrl+C

# 3. Stop Ganache (Terminal 1)
Ctrl+C

# 4. Clean up containers
docker rm -f $(docker ps -aq)
```

## Testing

Run contract tests:

```bash
npm test
```

## Tech Stack

- **Solidity 0.8.20**: Smart contracts
- **libp2p**: P2P cluster networking
- **Web3.js v4**: Blockchain interaction
- **Docker API**: Container orchestration
- **Express**: Health check API
- **Truffle v5**: Development framework

## Quick Reference: Full Stack Startup

**Terminal 1 - Ganache:**
```bash
npx ganache --wallet.totalAccounts 10
```

**Terminal 2 - Backend:**
```bash
npm start -- port=5000 webPort=5001
```

**Terminal 3 - Dashboard:**
```bash
cd dashboard && npm start
```

**Browser:**
Open http://localhost:3001

**Status Check:**
- Dashboard status bar should show: `web3:ok | contract:ok | cluster:ok`
- Cluster health: `curl http://localhost:5001/cluster`

## Next Steps

- Schedule multiple images with different replica counts via dashboard
- Run multiple nodes to see container distribution
- Monitor cluster state via health endpoint or dashboard visualization
- Check [E2E_TESTING.md](E2E_TESTING.md) for detailed troubleshooting
- Check [SOLIDITY_UPGRADE.md](SOLIDITY_UPGRADE.md) for contract upgrade details