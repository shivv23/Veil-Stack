# 🚀 Sepolia Testnet Setup Guide

Your configuration is ready! Follow these steps to deploy on Sepolia testnet.

## What's Needs to be Configured

- **Infura API Key**
- **Network**: Ethereum Sepolia Testnet
- **Backend .env**
- **Dashboard .env**

## 📋 Step-by-Step Deployment

### Step 1: Get Your MetaMask Recovery Phrase

1. Open MetaMask extension
2. Click the account icon (top right)
3. Go to **Settings** → **Security & Privacy**
4. Click **Reveal Secret Recovery Phrase**
5. Enter your password
6. **Copy the 12-word phrase**

### Step 2: Add Recovery Phrase to .env

Edit `/home/harshit/coding/pldg/canteen/Veil-Stack/canteen/.env`:

Find the line:
```env
MNEMONIC=
```

Change it to (use your actual 12 words):
```env
MNEMONIC="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
```

### Step 3: Get Sepolia Test ETH

You need test ETH to deploy the contract (around 0.1 ETH should be enough):

**Option 1: Infura Faucet** (Recommended)
- Visit: https://www.infura.io/faucet/sepolia
- Sign in with your Infura account
- Enter your MetaMask address
- Request 0.5 ETH

**Option 2: QuickNode Faucet**
- Visit: https://faucet.quicknode.com/ethereum/sepolia
- Enter your MetaMask address
- Request ETH

### Step 4: Verify Your Balance

In MetaMask:
1. Switch to **Sepolia Test Network**
   - Click network dropdown at top
   - Select "Sepolia test network"
   - (If not visible, enable "Show test networks" in Settings)

2. Check your balance
   - Should show at least 0.1 ETH

### Step 5: Compile Smart Contracts

```bash
cd /home/harshit/coding/pldg/canteen/Veil-Stack/canteen
npx truffle compile
```

Expected output:
```
✔ Compiling your contracts...
  > Compiled successfully using:
     - solc: 0.8.20
```

### Step 6: Deploy to Sepolia

```bash
npx truffle migrate --network sepolia
```

This will take 2-5 minutes. Expected output:
```
Deploying 'Canteen'
-------------------
> transaction hash:    0x...
> Blocks: 2            Seconds: 30
> contract address:    0xABC123...
> block number:        12345
> block timestamp:     1699999999
> account:             0xYourAddress...
> balance:             0.0985 ETH
> gas used:            1234567
> gas price:           20 gwei
> value sent:          0 ETH
> total cost:          0.0246914 ETH

✅ Saving artifacts
-----------------------------------
> Total deployments:   2
> Final cost:          0.0246914 ETH
```

**IMPORTANT**: Copy the **contract address** (0xABC123...)!

### Step 7: Update .env Files with Contract Address

Update **backend** `.env`:
```bash
nano .env
```

Find:
```env
ETH_CONTRACT_ADDRESS=
```

Change to:
```env
ETH_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

Update **dashboard** `.env`:
```bash
nano dashboard/.env
```

Find:
```env
REACT_APP_ETH_CONTRACT_ADDRESS=
```

Change to:
```env
REACT_APP_ETH_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### Step 8: Copy Contract ABI to Dashboard

```bash
cp build/contracts/Canteen.json dashboard/src/Canteen.json
```

### Step 9: Verify Deployment on Etherscan

Visit: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`

You should see:
- Contract creation transaction
- Contract code (after a few minutes)
- Your deployer address as creator

### Step 10: Start Backend

Open Terminal 1:
```bash
cd /home/harshit/coding/pldg/canteen/Veil-Stack/canteen
npm start
```

Expected output:
```
🚀 Starting Canteen Node
========================
⛓️  Chain: Ethereum Sepolia
📡 RPC: https://sepolia.infura.io/v3/...
📄 Contract: 0xYOUR_CONTRACT_ADDRESS
🔌 Port: 5000
🌐 Web Port: 5001
========================

✅ Cluster started successfully
👁️  Scheduler running in READ-ONLY mode
📱 Node registration must be done via MetaMask frontend
👂 Listening to contract events...
✅ Connected to events: 0x...
```

### Step 11: Start Dashboard

Open Terminal 2:
```bash
cd /home/harshit/coding/pldg/canteen/Veil-Stack/canteen/dashboard
npm start
```

Dashboard will open at: http://localhost:3001

### Step 12: Connect MetaMask

1. Dashboard opens in browser
2. Click **"Connect MetaMask"**
3. Approve the connection
4. If prompted, switch to Sepolia network
5. You should see:
   - Your account address
   - "Sepolia Test Network"
   - Access status

### Step 13: Register Node

1. Click **"Register Node"** button
2. MetaMask popup appears
3. Review transaction:
   - Gas fee: ~0.001-0.002 ETH
   - Network: Sepolia
4. Click **"Confirm"**
5. Wait for confirmation (30-60 seconds)
6. Success message appears!

Check Terminal 1 (backend):
```
📡 Event: MemberAdded
➕ MemberAdded: 127.0.0.1:5000
✅ This node has been registered!
```

### Step 14: Test Container Scheduling

1. In dashboard, scroll to **"Add Container Image"**
2. Enter image name: `crccheck/hello-world`
3. Enter replicas: `1`
4. Click **"Add Image"**
5. Confirm in MetaMask
6. Wait for confirmation

Check Terminal 1 (backend):
```
📡 Event: ImageAdded
🐳 ImageAdded: crccheck/hello-world (1 replicas)
Pulling image...
Starting up a container with the image 'crccheck/hello-world'...
```

Verify container is running:
```bash
docker ps
```

You should see the container!

## 🎉 Success!

You've successfully deployed Canteen on Sepolia testnet!

## 📊 What You Can Do Now

1. **Add more containers**: Try nginx, postgres, redis, etc.
2. **Scale replicas**: Add same image with different replica counts
3. **View on blockchain**: Check transactions on Sepolia Etherscan
4. **Monitor cluster**: `curl http://localhost:5001/cluster`

## 📚 Next Steps

- **Add Token Gating**
- **Deploy Multiple Nodes**
- **Monitor Gas Usage**
- **Test Failure Scenarios**

**Your Configuration Summary:**

```
Network: Ethereum Sepolia Testnet
RPC: https://sepolia.infura.io/v3/INFURA_API_KEY
Chain ID: 11155111
Contract: (deployed address)
Backend: http://localhost:5001
Dashboard: http://localhost:3001
```
