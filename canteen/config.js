/**
 * Multi-chain configuration for Canteen
 * Supports Ethereum and Filecoin networks
 */

import dotenv from 'dotenv'
dotenv.config()

export const CHAINS = {
  ethereum: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    contractAddress: process.env.ETH_CONTRACT_ADDRESS,
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  
  filecoin: {
    name: 'Filecoin Calibration',
    chainId: 314159,
    chainIdHex: '0x4cb2f',
    rpcUrl: process.env.FIL_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
    contractAddress: process.env.FIL_CONTRACT_ADDRESS,
    explorerUrl: 'https://calibration.filfox.info',
    nativeCurrency: {
      name: 'Test FIL',
      symbol: 'tFIL',
      decimals: 18
    }
  }
}

export const TOKEN_CONFIG = {
  address: process.env.TOKEN_CONTRACT_ADDRESS,
  requiredBalance: process.env.REQUIRED_TOKEN_BALANCE || '1',
  symbol: process.env.TOKEN_SYMBOL || 'CANTEEN'
}

export const SERVER_CONFIG = {
  port: process.env.PORT || 5000,
  webPort: process.env.WEB_PORT || 5001,
  activeChain: process.env.ACTIVE_CHAIN || 'ethereum'
}

// Get active chain configuration
export function getActiveChain() {
  const chainKey = SERVER_CONFIG.activeChain.toLowerCase()
  const chain = CHAINS[chainKey]
  
  if (!chain) {
    throw new Error(`Invalid ACTIVE_CHAIN: ${SERVER_CONFIG.activeChain}. Must be 'ethereum' or 'filecoin'`)
  }
  
  if (!chain.contractAddress) {
    throw new Error(`Contract address not configured for ${chain.name}. Set ${chainKey.toUpperCase()}_CONTRACT_ADDRESS in .env`)
  }
  
  return {
    ...chain,
    key: chainKey
  }
}

// Validate required environment variables
export function validateConfig() {
  const chain = getActiveChain()
  
  const warnings = []
  const errors = []
  
  // Check RPC URL
  if (chain.rpcUrl.includes('YOUR_INFURA_KEY')) {
    warnings.push(`⚠️  Using placeholder RPC URL for ${chain.name}. Set ${chain.key.toUpperCase()}_RPC_URL in .env`)
  }
  
  // Check token config for production
  if (process.env.NODE_ENV === 'production' && !TOKEN_CONFIG.address) {
    warnings.push('⚠️  TOKEN_CONTRACT_ADDRESS not set. Token gating will be disabled.')
  }
  
  return { errors, warnings }
}
