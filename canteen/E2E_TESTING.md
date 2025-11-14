# End-to-End Testing Guide

Quick guide to test the complete Canteen stack (contracts → backend → dashboard).

## Current Configuration

Based on your deployment:
- **Ganache**: http://localhost:8545
- **Canteen Contract**: `0x8CFCC7a1826DA4f4b7ca856A9E8820a3Afefe102`
- **Backend API**: http://localhost:5001
- **Dashboard**: http://localhost:3001

## Step-by-Step Testing

### 1. Start Ganache

**Terminal 1:**
```bash
npx ganache --wallet.totalAccounts 10
```

Keep this running. You should see:
- Available accounts with addresses
- Private keys for each account
- "RPC Listening on 127.0.0.1:8545"

### 2. Verify Contracts Are Deployed

```bash
# Check if contracts exist
cat build/contracts/Canteen.json | grep -A 3 '"networks"'

# If empty, redeploy:
npx truffle migrate --network development --reset
```

Note the deployed Canteen contract address from output.

### 3. Start Backend Node

**Terminal 2:**
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

**Verify backend:**
```bash
curl http://localhost:5001/cluster
```

Should return JSON with cluster info.

### 4. Start Dashboard

**Terminal 3:**
```bash
cd dashboard
npm start
```

Dashboard opens automatically at http://localhost:3001

**If it doesn't open automatically:**
```bash
open http://localhost:3001  # macOS
xdg-open http://localhost:3001  # Linux
```

### 5. Verify Dashboard Connection

In the browser (http://localhost:3001), check the status bar at the top:

✅ **Good**: `web3:ok cluster:ok`
❌ **Bad**: `web3:down` or `cluster:down`

**If you see errors:**

1. **Open Browser Console** (F12 → Console tab)
2. Look for errors:
   - CORS errors → Backend not running or wrong URL
   - "Out of Gas" errors → Wrong contract address or ABI mismatch
   - Network errors → Ganache not running

### 6. Test Contract Interaction

In the dashboard, try adding an image:

1. Scroll to "Add Image" section
2. Enter image name: `crccheck/hello-world`
3. Enter replicas: `1`
4. Click "Add Image"

**Expected flow:**
- MetaMask popup (if installed) OR
- Transaction submitted in console
- Backend logs show: "Starting up a container..."
- Docker pulls the image
- Container starts

**Verify:**
```bash
docker ps
```

Should show the running container.

### 7. Test Multi-Node (Optional)

**Terminal 4:**
```bash
npm start -- port=5002 webPort=5003 nodes=127.0.0.1:5000
```

**Expected:**
- Node 2 starts
- Terminal 2 shows: "Connected to peer: 12D3Koo..."
- Dashboard shows 2 nodes in cluster

## Troubleshooting

### Issue: "CORS request did not succeed"

**Problem**: Dashboard can't reach backend API

**Check:**
```bash
# Is backend running?
curl http://localhost:5001/cluster

# Wrong port?
cat dashboard/.env | grep CLUSTER_URL
# Should be: REACT_APP_CLUSTER_URL=http://localhost:5001/cluster
```

**Fix:**
```bash
cd dashboard
# Edit .env
echo "REACT_APP_CLUSTER_URL=http://localhost:5001/cluster" >> .env
# Restart dashboard (Ctrl+C then npm start)
```

### Issue: "Returned values aren't valid, did it run Out of Gas?"

**Problem**: Contract ABI mismatch or wrong address

**Check:**
```bash
# Contract address in dashboard matches deployment?
cat dashboard/.env | grep CANTEEN_CONTRACT
# Should match: 0x8CFCC7a1826DA4f4b7ca856A9E8820a3Afefe102

# ABI is up to date?
diff build/contracts/Canteen.json dashboard/src/Canteen.json
```

**Fix:**
```bash
# Update contract address
cd dashboard
echo "REACT_APP_CANTEEN_CONTRACT=0x8CFCC7a1826DA4f4b7ca856A9E8820a3Afefe102" >> .env

# Update ABI
cp ../build/contracts/Canteen.json src/Canteen.json

# Restart dashboard
```

### Issue: "web3:down" in dashboard

**Problem**: Ganache not running or wrong URL

**Check:**
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Should return: {"id":1,"jsonrpc":"2.0","result":"0x..."}
```

**Fix:**
```bash
# Start Ganache
npx ganache --wallet.totalAccounts 10

# Check dashboard .env
cat dashboard/.env | grep WEB3_PROVIDER
# Should be: REACT_APP_WEB3_PROVIDER=http://localhost:8545
```

### Issue: Container not starting

**Problem**: Docker not running or permission issues

**Check:**
```bash
# Docker running?
docker ps

# Check backend logs in Terminal 2
# Should see: "Starting up a container with the image..."
```

**Fix:**
```bash
# Start Docker daemon
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Issue: Dashboard shows old data

**Problem**: React development server caching

**Fix:**
```bash
cd dashboard
rm -rf node_modules/.cache
npm start
```

## Complete Reset (Nuclear Option)

If nothing works, start fresh:

```bash
# Stop all processes (Ctrl+C in each terminal)

# Clean everything
rm -rf build/
rm -rf dashboard/node_modules/.cache
docker rm -f $(docker ps -aq)

# Restart Ganache (new blockchain)
npx ganache --wallet.totalAccounts 10

# Redeploy contracts
npx truffle migrate --network development --reset
# Note the NEW contract address!

# Update index.js with new address and private key

# Update dashboard/.env with new address

# Copy new ABI
cp build/contracts/Canteen.json dashboard/src/Canteen.json

# Start backend
npm start -- port=5000 webPort=5001

# Start dashboard
cd dashboard && npm start
```

## Verification Checklist

- [ ] Ganache running on port 8545
- [ ] Contracts deployed (check build/contracts/Canteen.json)
- [ ] Backend running on port 5001
- [ ] Backend API responds: `curl http://localhost:5001/cluster`
- [ ] Dashboard running on port 3001
- [ ] Dashboard shows `web3:ok cluster:ok`
- [ ] Can add images through dashboard
- [ ] Docker containers start when images scheduled
- [ ] Multi-node cluster (optional)

## Quick Test Script

```bash
#!/bin/bash

echo "🔍 Checking Canteen Stack..."

# Check Ganache
echo -n "Ganache (8545): "
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 | grep -q "result" && echo "✅" || echo "❌"

# Check Backend
echo -n "Backend (5001): "
curl -s http://localhost:5001/cluster | grep -q "peerId" && echo "✅" || echo "❌"

# Check Dashboard
echo -n "Dashboard (3001): "
curl -s http://localhost:3001 | grep -q "canteen" && echo "✅" || echo "❌"

echo ""
echo "Open http://localhost:3001 in your browser"
```

Save as `check-stack.sh`, make executable (`chmod +x check-stack.sh`), and run.

## Success Criteria

Your stack is fully operational when:

1. ✅ All three services running (Ganache, Backend, Dashboard)
2. ✅ Dashboard status bar shows: `web3:ok cluster:ok`
3. ✅ Can see cluster nodes visualized on dashboard
4. ✅ Can add/remove images through dashboard UI
5. ✅ Docker containers start automatically
6. ✅ No console errors in browser dev tools

Once everything is green, you have a fully working decentralized container orchestrator! 🎉
