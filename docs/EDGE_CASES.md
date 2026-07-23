# Edge Cases & Failure Modes

This document describes how Veil Stack handles failure scenarios at each layer.

## Smart Contract (Canteen.sol)

### Member Already Active
`addMember()` reverts with `"Member already active"` if the host is already registered. The scheduler handles this by skipping registration.

### Member Not Active
`removeMember()` reverts with `"Member not active"` if the host doesn't exist or is already removed. The frontend checks member status before attempting removal.

### Image Already Active
`addImage()` reverts with `"Image already active"` if the image name is already registered. Duplicate additions are safely rejected.

### Rebalance Overflow
If all members are occupied, `rebalanceWithUnfortunateImage()` silently completes without reassigning. The ratio-based algorithm only assigns to empty or over-provisioned members.

### Report Status from Non-Member
`reportStatus()` reverts with `"Member not active"`. The scheduler checks registration before reporting.

### Empty Image Name on Removal
`removeMember()` guards against empty `imageName` before decrementing `imageDetails.deployed`, preventing underflow.

## Scheduler (scheduler.js)

### Docker Unavailable
If Docker socket is not found:
- **Read-only mode**: Continues without Docker; logs warning, events still processed
- **Legacy mode**: Throws error and exits

### Container Crash
Health check runs every 10 seconds:
1. Inspects container state
2. If not running and Docker restart policy is active → waits for Docker auto-restart
3. If not restarting → manually calls `container.start()`
4. Reports `crashed` status on-chain

### Contract Unreachable
- Event polling retries every 15 seconds; errors are logged but don't crash the process
- `reportStatus()` failures are caught and logged; off-chain tracking continues
- `_bootstrapOnRestart()` catches connection errors and waits for first `MemberJoin` event

### Event Replay on Restart
`lastProcessedBlock` is set to `currentBlock - 1` on restart. This means:
- Events from the restart gap are missed if the node was down for multiple blocks
- **Mitigation**: On restart, `_bootstrapOnRestart()` re-reads on-chain state via `getMemberDetails()`
- **Future improvement**: Store last processed block in persistent storage

### Image Pull Failure
If `docker.pull()` fails:
- Error is logged with image name
- Scheduler continues running; next loop iteration retries
- Container status remains `idle`

### Port Mapping Fallback
1. Check contract for explicit port mapping via `getPortsForImage()`
2. If none, inspect Docker image metadata for `ExposedPorts`
3. If none, default to port 8080:8080

### Double Image Assignment
If `loop()` detects the same image is already scheduled (`this.scheduledImage === scheduledImage`), it skips the update. No duplicate containers are created.

## Cluster (cluster.js)

### Peer Timeout
Peers are pruned after 15 seconds of inactivity (no heartbeat). The pruning runs every 5 seconds.

### Heartbeat Failure
If `pubsub.publish()` fails (e.g., network partition), the error is logged and the next heartbeat retries. The node remains in the cluster.

### Bootstrap Node Unavailable
If bootstrap nodes are unreachable:
- mDNS continues local discovery
- Node operates in isolated mode until peers become available

### Duplicate Peer Discovery
`_updatePeer()` checks if peer already exists in the Map. Existing peers get `lastSeen` updated; new peers trigger `memberJoin` event.

### Network Partition
If a node loses connectivity:
- Heartbeats stop reaching peers → peer timeout → peers prune the partitioned node
- Partitioned node continues processing local events
- On reconnection, peer discovery re-establishes the connection

## Web Server (web-server.js)

### Scheduler Not Initialized
`/status` returns `state: 'no-scheduler'` with `docker: false`. The endpoint always responds, even before the scheduler starts.

### Docker API Failure
`/containers` catches Docker API errors and returns `dockerAvailable: false` with the error message.

### IPFS Not Configured
`/ipfs` endpoints return `503` with `"IPFS pinning not configured"` if Pinata keys are not set.

## Network-Level

### Filecoin RPC Unavailable
- Event polling fails → errors logged → retries every 15 seconds
- Node continues operating with last known state
- `reportStatus()` failures are caught; off-chain tracking continues

### WebSocket vs HTTP Provider
Veil Stack uses HTTP provider (not WebSocket) for reliability. Polling interval is 15 seconds, which is adequate for block times on Filecoin Calibration (~30 seconds).

## Resource Exhaustion

### Memory
Containers are capped at 512MB via Docker `HostConfig.Memory`. The scheduler process itself uses minimal memory (event polling + HTTP server).

### CPU
Containers are capped at 50% CPU via Docker `HostConfig.CpuQuota`. The scheduler loop (1s interval) and event polling (15s interval) are lightweight.

### Disk
IPFS pinning is optional and controlled by environment variables. No local disk accumulation.

## Graceful Shutdown

On `SIGTERM` or `SIGINT`:
1. Stop container health check interval
2. Stop event polling interval
3. Report `stopped` status on-chain
4. Stop and remove managed container
5. Stop scheduling loop
6. Unsubscribe from GossipSub
7. Stop libp2p node
8. Clear peer map
9. Exit process
