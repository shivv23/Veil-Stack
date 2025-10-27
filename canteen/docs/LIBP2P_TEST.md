# libp2p Testing Guide

This guide will help you verify that the libp2p cluster implementation is working correctly.

## Prerequisites

1. **Install Dependencies**
```bash
npm install
```

2. **Start Local Ethereum Node** (Ganache or similar)
```bash
# In a separate terminal
npx ganache-cli -p 8545
```

3. **Deploy Smart Contract** (Optional for cluster testing)
```bash
npm run deploy
# Note the contract address from output
```

## Test 1: Single Node Startup

**Purpose**: Verify a single node can start and initialize libp2p.

### Steps

```bash
npm start -- port=5000
```

### Expected Output

You should see:
```
Libp2p node started with PeerId: 12D3KooW...
Listening on addresses:
  /ip4/127.0.0.1/tcp/5000
  /ip4/192.168.x.x/tcp/5000
Cluster initialized. Bootstrap nodes: None (mDNS only)
Node has been registered on Canteen.
Cluster health check web service is listening on port 3000
Cluster members: None.
```

### Verification

Open another terminal and check the web endpoint:

```bash
curl http://localhost:3000/cluster | json_pp
```

Expected response:
```json
{
  "host": "127.0.0.1:5000",
  "peerId": "12D3KooW...",
  "members": ["127.0.0.1:5000"],
  "connections": 0,
  "peers": 0,
  "multiaddrs": [
    "/ip4/127.0.0.1/tcp/5000",
    "/ip4/192.168.x.x/tcp/5000"
  ]
}
```

✅ **PASS**: Node starts, shows PeerId, and web endpoint responds

## Test 2: Two Nodes with mDNS Discovery

**Purpose**: Verify automatic peer discovery on local network.

### Steps

**Terminal 1** (Node 1):
```bash
npm start -- port=5000
```

Wait 5 seconds, then **Terminal 2** (Node 2):
```bash
npm start -- port=5001
```

### Expected Output

Within 1-2 seconds after starting Node 2, both terminals should show:

**Terminal 1**:
```
Discovered peer: 12D3KooW... (Node 2's PeerId)
Connected to peer: 12D3KooW...
Cluster members: [127.0.0.1:5001]
```

**Terminal 2**:
```
Discovered peer: 12D3KooW... (Node 1's PeerId)
Connected to peer: 12D3KooW...
Cluster members: [127.0.0.1:5000]
```

### Verification

Check both endpoints:

```bash
# Node 1
curl http://localhost:3000/cluster | json_pp

# Should show connections: 1, peers: 1, members including Node 2
```

✅ **PASS**: Both nodes discover and connect to each other automatically

## Test 3: Three Nodes with Bootstrap

**Purpose**: Verify bootstrap peer functionality.

### Steps

**Terminal 1** (Bootstrap node):
```bash
npm start -- port=5000
```

**Terminal 2** (Node 2 bootstraps to Node 1):
```bash
npm start -- port=5001 nodes=127.0.0.1:5000
```

**Terminal 3** (Node 3 bootstraps to both):
```bash
npm start -- port=5002 nodes=127.0.0.1:5000,127.0.0.1:5001
```

### Expected Output

Each node should show connections to the others:

**Terminal 1**:
```
Cluster members: [127.0.0.1:5001, 127.0.0.1:5002]
```

**Terminal 2**:
```
Cluster members: [127.0.0.1:5000, 127.0.0.1:5002]
```

**Terminal 3**:
```
Cluster members: [127.0.0.1:5000, 127.0.0.1:5001]
```

### Verification

Check all three endpoints and verify each shows 2 connections:

```bash
curl http://localhost:3000/cluster | json_pp  # Node 1
# connections: 2, peers: 2
```

✅ **PASS**: All three nodes form a fully connected mesh

## Test 4: Heartbeat Monitoring

**Purpose**: Verify heartbeat messages are being sent and received.

### Steps

Start two nodes (use Test 2 setup).

### Expected Output

You should see periodic activity in the logs (every 5 seconds internally, though not always printed).

### Verification

Check the web endpoint multiple times:

```bash
# Check Node 1 sees Node 2
watch -n 2 'curl -s http://localhost:3000/cluster | json_pp'
```

The `members` array should consistently show the peer.

✅ **PASS**: Members list remains stable, indicating heartbeats working

## Test 5: Peer Failure Detection

**Purpose**: Verify automatic peer removal when a node goes down.

### Steps

1. Start two nodes (use Test 2 setup)
2. Verify they see each other
3. **Kill Node 2**: Press `Ctrl+C` in Terminal 2
4. Watch Terminal 1 for ~15 seconds

### Expected Output

**Terminal 1** (within 15 seconds):
```
Disconnected from peer: 12D3KooW...
Pruned 1 inactive peer(s)
Cluster members: None.
```

### Verification

```bash
curl http://localhost:3000/cluster | json_pp
```

Should show:
```json
{
  "connections": 0,
  "peers": 0,
  "members": ["127.0.0.1:5000"]
}
```

✅ **PASS**: Failed peer detected and removed within timeout period

## Test 6: Peer Recovery

**Purpose**: Verify a node can rejoin after going down.

### Steps

1. Continue from Test 5 (Node 2 is down)
2. Restart Node 2:
```bash
npm start -- port=5001 nodes=127.0.0.1:5000
```
3. Watch both terminals

### Expected Output

Both nodes should reconnect within 1-2 seconds:

**Terminal 1**:
```
Connected to peer: 12D3KooW...
Cluster members: [127.0.0.1:5001]
```

✅ **PASS**: Node successfully rejoins the cluster

## Test 7: Event Emitters

**Purpose**: Verify membership change events fire correctly.

### Steps

Create a test script `test-events.js`:

```javascript
import cluster from './cluster.js'

cluster.on('memberJoin', (peerId) => {
  console.log(`✅ EVENT: Member joined - ${peerId}`)
})

cluster.on('memberLeave', (peerId) => {
  console.log(`❌ EVENT: Member left - ${peerId}`)
})

cluster.start(5000, []).then(() => {
  console.log('Cluster started. Waiting for events...')
})
```

Run it:
```bash
babel-node test-events.js
```

In another terminal, start and stop a second node.

### Expected Output

```
✅ EVENT: Member joined - 12D3KooW...
❌ EVENT: Member left - 12D3KooW...
```

✅ **PASS**: Events fire correctly for joins and leaves

## Test 8: Stress Test (Multiple Nodes)

**Purpose**: Verify the system handles multiple nodes gracefully.

### Steps

Create a script `start-cluster.sh`:

```bash
#!/bin/bash

# Start bootstrap node
npm start -- port=5000 &
PIDS=$!
sleep 2

# Start 4 more nodes
for port in 5001 5002 5003 5004; do
  npm start -- port=$port nodes=127.0.0.1:5000 &
  PIDS="$PIDS $!"
  sleep 1
done

echo "Started 5 nodes. PIDs: $PIDS"
echo "Press Ctrl+C to stop all"

trap "kill $PIDS" EXIT
wait
```

Run it:
```bash
chmod +x start-cluster.sh
./start-cluster.sh
```

### Verification

```bash
# Check each node
for port in 3000; do
  echo "=== Node on port $port ==="
  curl -s http://localhost:$port/cluster | json_pp
  echo ""
done
```

Each should show 4 members (all others).

✅ **PASS**: System handles 5+ nodes without issues

## Common Issues & Solutions

### Issue 1: "Cannot find module 'libp2p'"

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Peers not discovering each other

**Symptoms**: Nodes start but `members` array stays empty.

**Diagnosis**:
```bash
# Check if ports are listening
netstat -an | grep LISTEN | grep 5000
```

**Solutions**:
- Ensure firewall allows TCP on ports 5000-5002
- Try explicit bootstrap instead of mDNS:
  ```bash
  npm start -- port=5001 nodes=127.0.0.1:5000
  ```
- Check both nodes are on same network for mDNS

### Issue 3: "Contract from address not specified"

**Symptom**: Error when starting scheduler.

**Solution**: This is expected if Ganache isn't running. For cluster-only testing, you can comment out the scheduler start in `index.js`:

```javascript
// scheduler.start(...)  // Comment this out for cluster-only testing
```

### Issue 4: Port already in use

**Symptom**: `Error: listen EADDRINUSE`

**Solution**:
```bash
# Find and kill process using the port
lsof -ti:5000 | xargs kill -9

# Or use different ports
npm start -- port=6000
```

### Issue 5: High CPU usage

**Symptom**: Node process using significant CPU.

**Cause**: Normal during initial connection establishment.

**Solution**: Wait 10-15 seconds. If it persists, check for connection loops in logs.

## Quick Validation Checklist

Run through this checklist for a complete test:

- [ ] Single node starts without errors
- [ ] Web endpoint responds with valid JSON
- [ ] Two nodes discover each other (mDNS)
- [ ] Two nodes connect via bootstrap
- [ ] Members array populated correctly
- [ ] Killing a node triggers removal after ~15s
- [ ] Restarting a node allows it to rejoin
- [ ] Multiple nodes (3+) form full mesh
- [ ] No error messages in logs
- [ ] CPU/memory usage is reasonable

## Automated Test Script

Create `test-libp2p.sh`:

```bash
#!/bin/bash

echo "🧪 Testing libp2p Implementation"
echo "================================"

# Test 1: Single node
echo ""
echo "Test 1: Starting single node..."
timeout 10 npm start -- port=5000 > /tmp/node1.log 2>&1 &
PID1=$!
sleep 5

if kill -0 $PID1 2>/dev/null; then
  echo "✅ Node 1 started successfully"
else
  echo "❌ Node 1 failed to start"
  exit 1
fi

# Test 2: Check web endpoint
echo ""
echo "Test 2: Checking web endpoint..."
RESPONSE=$(curl -s http://localhost:3000/cluster)
if echo $RESPONSE | grep -q "peerId"; then
  echo "✅ Web endpoint responding"
else
  echo "❌ Web endpoint not responding"
  kill $PID1
  exit 1
fi

# Test 3: Second node
echo ""
echo "Test 3: Starting second node..."
timeout 10 npm start -- port=5001 nodes=127.0.0.1:5000 > /tmp/node2.log 2>&1 &
PID2=$!
sleep 8

# Check if they connected
MEMBERS=$(curl -s http://localhost:3000/cluster | grep -o '"connections":[0-9]*' | cut -d: -f2)
if [ "$MEMBERS" -ge 1 ]; then
  echo "✅ Nodes connected (connections: $MEMBERS)"
else
  echo "❌ Nodes did not connect"
  kill $PID1 $PID2
  exit 1
fi

# Test 4: Failure detection
echo ""
echo "Test 4: Testing failure detection..."
kill $PID2
sleep 18

MEMBERS_AFTER=$(curl -s http://localhost:3000/cluster | grep -o '"connections":[0-9]*' | cut -d: -f2)
if [ "$MEMBERS_AFTER" -eq 0 ]; then
  echo "✅ Failed node detected and removed"
else
  echo "❌ Failed node not detected"
  kill $PID1
  exit 1
fi

# Cleanup
kill $PID1 2>/dev/null

echo ""
echo "================================"
echo "🎉 All tests passed!"
```

Run it:
```bash
chmod +x test-libp2p.sh
./test-libp2p.sh
```

## Success Criteria

Your libp2p implementation is working correctly if:

1. ✅ Nodes start and show PeerId
2. ✅ Nodes discover each other (mDNS or bootstrap)
3. ✅ Heartbeats maintain peer list
4. ✅ Failed nodes detected within 15 seconds
5. ✅ Nodes can rejoin after restart
6. ✅ Web endpoint shows accurate cluster state
7. ✅ No persistent errors in logs
8. ✅ Resource usage is reasonable (<5% CPU idle, <200MB RAM per node)

Once all tests pass, your libp2p cluster implementation is production-ready! 🚀