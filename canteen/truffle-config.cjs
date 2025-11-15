require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 6721975,
      network_id: "*" // Match any network id
    },
    
    // Ethereum Sepolia Testnet
    sepolia: {
      provider: () => new HDWalletProvider({
        mnemonic: {
          phrase: process.env.MNEMONIC
        },
        providerOrUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/ecbbdfc3c066498882a52557f149c6a7',
        pollingInterval: 15000, // Increase polling interval
        chainId: 11155111
      }),
      network_id: 11155111,
      gas: 4500000,
      gasPrice: 20000000000, // 20 gwei
      confirmations: 0, // Don't wait for confirmations during deployment
      timeoutBlocks: 50,
      skipDryRun: true
    },
    
    // Filecoin Calibration Testnet
    filecoin: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        process.env.FIL_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
      ),
      network_id: 314159,
      chain_id: 314159,
      gas: 4500000,
      gasPrice: 10000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 1000000
    }
  },
  
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};