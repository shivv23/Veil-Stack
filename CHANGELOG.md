# Changelog

All notable changes to Veil Stack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2025-07-22

### Added

- **On-chain feedback loop**: Scheduler reports container state (running/stopped/crashed) to Canteen.sol via `reportStatus()`
- **Status reporting contract functions**: `reportStatus()`, `getMemberStatus()`, `getNodeCount()`, `StatusReport` event
- **REST API endpoints**: `/status`, `/containers`, `/cluster`, `/ipfs` for backend introspection
- **CLI tool**: `veilstack` — status, containers, nodes, add-image, remove-image commands
- **Container resource limits**: 512MB memory, 50% CPU, on-failure restart policy (max 3 retries)
- **Health checks**: Container status monitored every 10 seconds; auto-restart on crash
- **Docker Compose**: One-command local deployment with socket proxy
- **Integration tests**: 5 end-to-end tests against live backend
- **Windows compatibility**: Docker named pipe support (`//./pipe/docker_engine`)
- **Structured logging**: JSON-formatted log output with timestamps and component tags
- **Graceful shutdown**: SIGTERM/SIGINT handlers clean up containers and libp2p connections
- **CONTRIBUTING.md**: Development setup, code style, and PR guidelines
- **SECURITY.md**: Vulnerability reporting, security considerations, known limitations
- **CHANGELOG.md**: This file

### Fixed

- `_bootstrapOnRestart()` checks `getMemberDetails()` on restart instead of blindly starting loop
- `getPortsForImage()` no longer requires `restricted` modifier for read-only access
- `removeMember()` guards against empty image name before decrementing deployed count
- Docker socket detection: Windows named pipe support added
- CI workflow: specify test file explicitly to avoid running integration tests without backend

### Changed

- Event polling interval reduced to 15 seconds for faster response
- Contract ABI synced to `dashboard/src/Canteen.json`

## [0.1.0] - 2025-07-01

### Added

- Initial release
- Canteen.sol smart contract on FEVM Calibration
- libp2p cluster networking (TCP, Noise, mplex, mDNS, GossipSub)
- Docker container runtime (pull, create, start, stop)
- Event-driven scheduler (MemberJoin, MemberLeave, MemberImageUpdate)
- React + D3 dashboard with MetaMask integration
- IPFS pinning via Pinata
- Truffle test suite (contract tests)
- GitHub Actions CI (contract tests + Docker build)
