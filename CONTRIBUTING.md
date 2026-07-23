# Contributing to Veil Stack

Thank you for your interest in contributing to Veil Stack! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/Veil-Stack.git`
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `cd canteen && npm install`
5. Make your changes
6. Run tests: `npx ganache --port 8545 --deterministic &` then `npx truffle test --config truffle-config.cjs`
7. Commit your changes: `git commit -s -m "feat: add my feature"`
8. Push to your fork: `git push origin feature/my-feature`
9. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- Docker Desktop or Docker Engine
- Git

### Local Development

```bash
# Start the node (read-only mode, MetaMask for transactions)
cd canteen
npm install
cp .env.example .env
npm start
```

### Running Tests

```bash
# Contract tests (requires Ganache)
npx ganache --port 8545 --deterministic &
sleep 3
npx truffle test --config truffle-config.cjs
kill %1

# Integration tests (requires running backend on port 5001)
node test/integration_test.js
```

## Code Style

### JavaScript

- ES modules (`import`/`export`) for all new code
- Functional patterns preferred over class-based where possible
- Use `const`/`let`, never `var`
- Async/await over raw promises
- No semicolons (project convention)

### Solidity

- Solidity ^0.8.0
- Use `require()` for input validation
- Events for all state changes
- Comprehensive NatSpec comments for public functions

### Commit Messages

Format: `[component] descriptive message`

Examples:
- `[scheduler] add container health check retry logic`
- `[contract] fix rebalancing ratio calculation`
- `[cli] add nodes command for cluster inspection`
- `[docs] update API reference for /status endpoint`

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include test coverage for new functionality
- Update documentation if adding user-facing features
- Ensure CI passes before requesting review
- Sign all commits (`git commit -s`)

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Include environment details (OS, Node version, Docker version)
- For security issues, see [SECURITY.md](./SECURITY.md)

## Architecture

Before contributing, familiarize yourself with the architecture:

- `contracts/Canteen.sol` — FEVM smart contract (membership, images, status)
- `scheduler.js` — Container lifecycle + on-chain feedback loop
- `cluster.js` — libp2p networking (TCP, Noise, GossipSub)
- `web-server.js` — REST API endpoints
- `veilstack.js` — CLI tool
- `index.js` — Entry point, graceful shutdown

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
