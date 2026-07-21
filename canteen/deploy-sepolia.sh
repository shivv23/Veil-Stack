#!/bin/bash

echo "⚠️  NOTE: Sepolia deployment is secondary. Filecoin Calibration is the primary chain."
echo "    See canteen/docs/FEVM_CALIBRATION_SETUP.md for the primary deployment guide."
echo ""
echo "====================================="
echo ""

# Check if MNEMONIC is set
if grep -q "MNEMONIC=$" .env || ! grep -q "MNEMONIC=" .env; then
    echo "❌ ERROR: MNEMONIC not set in .env file"
    echo ""
    echo "Please add your MetaMask recovery phrase to .env:"
    echo '  MNEMONIC="word1 word2 word3 ... word12"'
    echo ""
    echo "Get it from: MetaMask > Settings > Security & Privacy > Reveal Secret Recovery Phrase"
    exit 1
fi

echo "✅ Configuration found"
echo ""

# Compile contracts
echo "📦 Compiling contracts..."
npx truffle compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed"
    exit 1
fi

echo "✅ Compilation successful"
echo ""

# Deploy to Sepolia
echo "🚀 Deploying to Sepolia testnet..."
echo "⏳ This may take 2-5 minutes..."
echo ""

npx truffle migrate --network sepolia

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Copy the contract address from above"
    echo "2. Update .env: ETH_CONTRACT_ADDRESS=0x..."
    echo "3. Update dashboard/.env: REACT_APP_ETH_CONTRACT_ADDRESS=0x..."
    echo "4. Copy ABI: cp build/contracts/Canteen.json dashboard/src/"
    echo "5. Start backend: npm start"
    echo "6. Start dashboard: cd dashboard && npm start"
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Common issues:"
    echo "- Insufficient Sepolia ETH (get from faucet)"
    echo "- Invalid MNEMONIC in .env"
    echo "- Network connection issues"
fi
