# FEVM Calibration Setup Guide

Guide for deploying Canteen.sol on Filecoin Calibration testnet (V1 currently deployed; V2 grant-funded).

## Prerequisites

- Node 18+ installed
- MetaMask with Filecoin Calibration network added:
  - Network Name: Filecoin Calibration
  - RPC URL: https://api.calibration.node.glif.io/rpc/v1
  - Chain ID: 314159
  - Currency Symbol: tFIL
- tFIL from the [Calibration faucet](https://filfox.io/faucet)

## Step 1: Configure environment

```bash
cd canteen
cp .env.example .env
```

Edit `.env` and set your mnemonic:

```env
MNEMONIC="your twelve word seed phrase here"
```

## Step 2: Compile contracts

```bash
npx truffle compile --config truffle-config.cjs
```

Expected output:

```
> Compiled successfully using:
   - solc: 0.8.20
```

## Step 3: Deploy to Calibration

```bash
npx truffle migrate --config truffle-config.cjs --network filecoin
```

This takes 2-5 minutes. Expected output:

```
Deploying 'Canteen'
-------------------
> contract address:    0x...
```

## Step 4: Copy ABI to dashboard

```bash
cp build/contracts/Canteen.json dashboard/src/Canteen.json
```

## Step 5: Verify on Filfox

Visit `https://calibration.filfox.info/en/address/YOUR_CONTRACT_ADDRESS`

Click "Verify & Publish" and enter:
- Compiler: Solidity 0.8.20
- Optimizer: Yes, 200 runs
- License: MIT

## Step 6: Update contract address

Set `FIL_CONTRACT_ADDRESS` in `.env` and `docker-compose.yml` to the new address.

## Step 7: Verify in dashboard

```bash
cd dashboard
npm install
NODE_OPTIONS=--openssl-legacy-provider npm start
```

Open `http://localhost:3001`, connect MetaMask, and confirm the contract address loads.

## Useful commands

```bash
# Check deployer balance
node check-balance.cjs

# Deploy via custom script
node deploy-fevm.cjs
```
