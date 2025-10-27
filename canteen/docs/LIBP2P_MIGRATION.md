# libp2p Migration Guide

This guide covers the migration from SWIM to libp2p for cluster management in Canteen.

## Overview

The new implementation replaces the deprecated SWIM protocol with a modern libp2p-based solution that provides:

- **Peer Discovery**: Both mDNS (for local networks) and bootstrap peers (for known nodes)
- **Health Tracking**: Heartbeat-based peer monitoring with automatic timeout/pruning
- **Event System**: Real-time notifications for membership changes
- **Better Reliability**: Built on battle-tested libp2p stack used by IPFS and other major projects

## Architecture

### Components

1. **Transport Layer**: TCP for peer connections
2. **Security**: Noise protocol for encrypted connections
3. **Multiplexing**: mplex for stream multiplexing
4. **Discovery**: 
   - mDNS for automatic local peer discovery
   - Bootstrap for connecting to known peers
5. **Messaging**: GossipSub for heartbeat broadcasting

### Heartbeat System

- Each node broadcasts a heartbeat every **5 seconds**
- Peers are marked as active if heartbeat received within **15 seconds**
- Inactive peers are automatically pruned from the member list
- Heartbeats include the node's host information (IP:port)

## Installation

First, install the new dependencies:

```bash
npm install
```

Key new dependencies:
- `libp2p`: Core P2P networking library
- `@libp2p/tcp`: TCP transport
- `@chainsafe/libp2p-noise`: Connection encryption
- `@libp2p/mplex`: Stream multiplexing
- `@libp2p/mdns`: Local network discovery
- `@libp2p/bootstrap`: Bootstrap peer discovery
- `@chainsafe/libp2p-gossipsub`: Pub/sub messaging

## Usage

### Starting a Node

**Single node (mDNS only):**
```bash
npm start -- port=5000
```

**Node with bootstrap peers:**
```bash
npm start -- port=5001 nodes=127.0.0.1:5000,127.0.0.1:5002
```

### Running a Cluster

Terminal 1 (First node):
```bash
npm start -- port=5000
```

Terminal 2 (Second node, bootstrapping to first):
```bash
npm start -- port=5001 nodes=127.0.0.1:5000
```

Terminal 3 (Third node, bootstrapping to both):
```bash
npm start -- port=5002 nodes=127.0.0.1:5000,127.0.0.1:5001
```

## API Changes

### cluster.js

**New Methods:**

```javascript
// Get list of active peer hosts
cluster.getMembers()  // Returns: ['127.0.0.1:5001', '127.0.0.1:5002']

// Get libp2p node instance
cluster.getProtocol()  // Returns: libp2p node object

// Stop the cluster
await cluster.stop()  // Async method for graceful shutdown
```

**Events:**

```javascript
// Listen for new peers joining
cluster.on('memberJoin', (peerId) => {
  console.log(`New member: ${peerId}`)
})

// Listen for peers leaving
cluster.on('memberLeave', (peerId) => {
  console.log(`Member left: ${peerId}`)
})
```

### web-server.js

The `/cluster` endpoint now returns enhanced information:

```json
{
  "host": "127.0.0.1:5000",
  "peerId": "12D3KooWA7...",
  "members": ["127.0.0.1:5001", "127.0.0.1:5002"],
  "connections": 2,
  "peers": 2,
  "multiaddrs": ["/ip4/127.0.0.1/tcp/5000", "/ip4/192.168.1.100/tcp/5000"]
}
```

## Key Differences from SWIM

| Feature | SWIM (Old) | libp2p (New) |
|---------|------------|--------------|
| Discovery | Manual bootstrap only | mDNS + Bootstrap |
| Health Check | Probabilistic gossip | Heartbeat + timeout |
| Protocol | UDP-based | TCP-based |
| Encryption | None | Noise protocol |
| Maintenance | Deprecated | Actively maintained |
| Ecosystem | Standalone | Part of IPFS/libp2p |

## Configuration

### Adjusting Timeouts

Edit `cluster.js` constants:

```javascript
const HEARTBEAT_INTERVAL = 5000  // Heartbeat frequency (ms)
const PEER_TIMEOUT = 15000       // Peer timeout threshold (ms)
```

### Custom Transport

To use different transports (WebSockets, WebRTC, etc.), modify the `transports` array in `cluster.js`:

```javascript
import { webSockets } from '@libp2p/websockets'

libp2pConfig.transports.push(webSockets())
```

## Troubleshooting

### Peers Not Discovering Each Other

**Problem**: Nodes on the same network aren't finding each other via mDNS.

**Solutions**:
- Ensure multicast is enabled on your network
- Try using bootstrap peers explicitly
- Check firewall rules allow TCP on the specified ports
- Verify nodes are actually on the same subnet

### Connection Refused

**Problem**: Bootstrap connections fail.

**Solutions**:
- Verify the bootstrap node is running and accessible
- Check port numbers are correct
- Ensure no firewall blocking TCP connections
- Try connecting to localhost first for testing

### Peers Timing Out

**Problem**: Peers being marked offline even though they're running.

**Solutions**:
- Check system time is synchronized across nodes
- Verify heartbeat messages are being published (check logs)
- Increase `PEER_TIMEOUT` if on slow networks
- Check for network issues or packet loss

### High Memory Usage

**Problem**: libp2p consuming significant memory.

**Solutions**:
- This is normal for persistent connections
- Consider connection limits in production
- Monitor and adjust `PEER_TIMEOUT` to prune faster
- Implement connection gating if needed

## Migration Checklist

- [x] Remove old `swim` dependency
- [x] Add libp2p dependencies
- [x] Implement new cluster.js with libp2p
- [x] Add peer discovery (mDNS + bootstrap)
- [x] Implement heartbeat system
- [x] Add peer health tracking and pruning
- [x] Update web-server.js for new API
- [x] Update index.js with async cluster start
- [x] Add event emitters for membership changes
- [x] Implement graceful shutdown

## Testing

### Basic Functionality Test

1. Start node 1: `npm start -- port=5000`
2. Wait 5 seconds, verify web endpoint: `curl http://localhost:3000/cluster`
3. Start node 2: `npm start -- port=5001 nodes=127.0.0.1:5000`
4. Check both nodes see each other
5. Kill node 2, verify node 1 detects it within 15 seconds

### Performance Test

Monitor resource usage:
```bash
# Start node with resource monitoring
npm start -- port=5000 &
PID=$!

# Monitor
while true; do
  ps -p $PID -o %cpu,%mem,cmd
  sleep 5
done
```

## Production Considerations

1. **Bootstrap Nodes**: Always maintain at least 3 bootstrap nodes for redundancy
2. **Port Configuration**: Use non-standard ports in production
3. **Monitoring**: Integrate with your monitoring stack via the web endpoint
4. **Firewall**: Only allow TCP connections from trusted subnets
5. **Resource Limits**: Set connection limits based on cluster size
6. **Logging**: Configure appropriate log levels for production

## Future Enhancements

Potential improvements for the future:

- [ ] Add DHT for better peer discovery at scale
- [ ] Implement connection limits and backpressure
- [ ] Add metrics and Prometheus integration
- [ ] Support for NAT traversal
- [ ] Encrypted channel for smart contract sync
- [ ] WebRTC transport for browser nodes
- [ ] Connection gating and peer reputation system

## Resources

- [libp2p Documentation](https://docs.libp2p.io/)
- [libp2p Examples](https://github.com/libp2p/js-libp2p-examples)
- [GossipSub Specification](https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/README.md)
- [Noise Protocol](https://noiseprotocol.org/)