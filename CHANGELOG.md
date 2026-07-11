# Changelog

## [0.1.0] - 2026-07-11

### Added
- Canteen.sol V1 smart contract deployed on Filecoin Calibration
- libp2p-based peer-to-peer node mesh for cluster coordination
- Scheduler with Docker integration for container lifecycle management
- Dashboard with D3 force-directed graph for cluster visualisation
- MetaMask integration for FEVM interaction
- Token-gating support (ERC20/ERC721) for cluster access control
- CI pipeline with Truffle contract tests on push/PR
- Dashboard Dockerfile for production deployment

### Changed
- Default network changed from Ethereum Sepolia to Filecoin Calibration
- Ganache moved to optional `--profile dev` flag in docker-compose
- Landing page content updated for project-focused narrative
- Expanded contract test coverage to 7+ test cases

### Security
- `.env` files removed from git tracking
- Granular `.gitignore` patterns for internal drafts and build artifacts
