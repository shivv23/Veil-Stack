# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Veil Stack, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@veil-stack.dev** (or open a private GitHub advisory)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix or mitigation**: Within 30 days for critical issues

## Security Considerations

### Smart Contract (Canteen.sol)

- **Access control**: `addMember`, `removeMember`, `addImage`, `removeImage`, `addPortForImage` are restricted to the contract owner
- **Status reporting**: `reportStatus` is callable by any active member — members can only report their own status
- **Reentrancy**: No external calls in state-changing functions except event emission
- **Integer overflow**: Solidity ^0.8.0 has built-in overflow checks

### Node Security

- **Docker socket**: Never expose the Docker socket directly; use the Docker socket proxy (`tecnativa/docker-socket-proxy`)
- **Private keys**: The scheduler runs in read-only mode by default; MetaMask handles transaction signing
- **Network**: libp2p uses Noise encryption for all connections
- **Resource limits**: Containers are capped at 512MB memory and 50% CPU

### Known Limitations

- **No formal audit**: Canteen.sol has not been independently audited. A security audit is planned in Milestone 4.
- **Testnet only**: The contract is deployed on Filecoin Calibration (testnet). Do not use in production without a formal audit.
- **Read-only mode**: The recommended deployment mode uses MetaMask for transaction signing, keeping private keys out of the server process.

## Dependency Security

- Run `npm audit` regularly to check for known vulnerabilities
- Dependabot is enabled for automated dependency updates
- Lockfile (`package-lock.json`) is committed to ensure reproducible builds

## Network Security

- All libp2p connections are encrypted with Noise protocol
- GossipSub messages are signed by the sending peer
- mDNS discovery is limited to local network scope
- Bootstrap peers should be from trusted sources only
