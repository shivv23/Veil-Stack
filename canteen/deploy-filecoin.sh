#!/bin/bash

echo "🚀 Canteen Filecoin Calibration Deployment Script"
echo "=================================================="
echo ""

# Check if MNEMONIC is set
if grep -q "MNEMONIC=$" .env || ! grep -q "MNEMONIC=" .env; then
    echo "❌ ERROR: MNEMONIC not set in .env file"
    echo ""
    echo "1. Install MetaMask browser extension"
    echo "2. Add Filecoin Calibration network:"
    echo "   Network Name: Filecoin Calibration"
    echo "   RPC URL: https://api.calibration.node.glif.io/rpc/v1"
    echo "   Chain ID: 314159"
    echo "   Currency Symbol: tFIL"
    echo "3. Get free tFIL: https://faucet.calibration.fildev.network"
    echo "4. Get your seed phrase: MetaMask > Settings > Security & Privacy > Reveal"
    echo "5. Add to .env: MNEMONIC=\"word1 word2 ... word12\""
    exit 1
fi

echo "✅ Configuration found"
echo ""

# Compile contracts
echo "📦 Compiling contracts..."
npx truffle compile --config truffle-config.cjs

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Compilation successful"
echo ""

# Deploy to Filecoin Calibration
echo "🚀 Deploying to Filecoin Calibration testnet..."
echo "⏳ This may take 2-5 minutes..."
echo ""

npx truffle migrate --config truffle-config.cjs --network filecoin

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Copy the contract address from above"
    echo "2. Update .env: FIL_CONTRACT_ADDRESS=0x..."
    echo "3. Verify on Filfox: https://calibration.filfox.info"
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Common issues:"
    echo "- Insufficient tFIL (get from https://faucet.calibration.fildev.network)"
    echo "- Invalid MNEMONIC in .env"
    echo "- Network connection issues"
fi
