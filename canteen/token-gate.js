/**
 * Token Gating Service
 * Handles access control based on token ownership
 * 
 * Note: This is a placeholder. Update with your specific token contract ABI
 * after sharing the token code.
 */

import Web3 from 'web3'

class TokenGateService {
  constructor() {
    this.tokenAddress = null
    this.requiredBalance = '1'
    this.tokenContract = null
    this.web3 = null
  }

  /**
   * Initialize token gating service
   * @param {Web3} web3Instance - Web3 instance from frontend
   * @param {string} tokenAddress - ERC20/ERC721 token contract address
   * @param {string} tokenAbi - Token contract ABI
   * @param {string} requiredBalance - Minimum token balance required
   */
  initialize(web3Instance, tokenAddress, tokenAbi, requiredBalance = '1') {
    if (!tokenAddress) {
      console.warn('⚠️  Token address not provided. Token gating disabled.')
      return false
    }

    this.web3 = web3Instance
    this.tokenAddress = tokenAddress
    this.requiredBalance = requiredBalance

    try {
      this.tokenContract = new this.web3.eth.Contract(tokenAbi, tokenAddress)
      console.log('✅ Token Gate Service initialized')
      console.log(`🎫 Token: ${tokenAddress}`)
      console.log(`🔢 Required balance: ${requiredBalance}`)
      return true
    } catch (error) {
      console.error('❌ Token Gate Service initialization failed:', error.message)
      return false
    }
  }

  /**
   * Check if user has required token balance (ERC20)
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<boolean>}
   */
  async checkERC20Access(userAddress) {
    if (!this.tokenContract) {
      console.warn('Token gating not configured, granting access')
      return true
    }

    try {
      const balance = await this.tokenContract.methods.balanceOf(userAddress).call()
      const hasAccess = BigInt(balance) >= BigInt(this.requiredBalance)
      
      console.log(`🔐 Access check for ${userAddress}:`, hasAccess ? '✅ GRANTED' : '❌ DENIED')
      console.log(`   Balance: ${balance}, Required: ${this.requiredBalance}`)
      
      return hasAccess
    } catch (error) {
      console.error('Error checking token balance:', error.message)
      return false
    }
  }

  /**
   * Check if user owns at least one NFT (ERC721)
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<boolean>}
   */
  async checkERC721Access(userAddress) {
    if (!this.tokenContract) {
      console.warn('Token gating not configured, granting access')
      return true
    }

    try {
      const balance = await this.tokenContract.methods.balanceOf(userAddress).call()
      const hasAccess = BigInt(balance) > 0n
      
      console.log(`🔐 NFT Access check for ${userAddress}:`, hasAccess ? '✅ GRANTED' : '❌ DENIED')
      console.log(`   NFTs owned: ${balance}`)
      
      return hasAccess
    } catch (error) {
      console.error('Error checking NFT balance:', error.message)
      return false
    }
  }

  /**
   * Get token information
   * @returns {Promise<Object>}
   */
  async getTokenInfo() {
    if (!this.tokenContract) {
      return null
    }

    try {
      const [name, symbol, decimals] = await Promise.all([
        this.tokenContract.methods.name().call().catch(() => 'Unknown'),
        this.tokenContract.methods.symbol().call().catch(() => 'UNKNOWN'),
        this.tokenContract.methods.decimals().call().catch(() => '18')
      ])

      return { name, symbol, decimals }
    } catch (error) {
      console.error('Error fetching token info:', error.message)
      return null
    }
  }

  /**
   * Get user's token balance
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<string>}
   */
  async getUserBalance(userAddress) {
    if (!this.tokenContract) {
      return '0'
    }

    try {
      const balance = await this.tokenContract.methods.balanceOf(userAddress).call()
      return balance.toString()
    } catch (error) {
      console.error('Error fetching user balance:', error.message)
      return '0'
    }
  }

  /**
   * Format token balance with decimals
   * @param {string} balance - Raw balance
   * @param {number} decimals - Token decimals
   * @returns {string}
   */
  formatBalance(balance, decimals = 18) {
    const divisor = BigInt(10) ** BigInt(decimals)
    const wholePart = BigInt(balance) / divisor
    const fractionalPart = BigInt(balance) % divisor
    
    if (fractionalPart === 0n) {
      return wholePart.toString()
    }
    
    return `${wholePart}.${fractionalPart.toString().padStart(decimals, '0')}`
  }

  /**
   * Check access with detailed response
   * @param {string} userAddress - User's wallet address
   * @param {string} tokenType - 'ERC20' or 'ERC721'
   * @returns {Promise<Object>}
   */
  async checkAccessDetailed(userAddress, tokenType = 'ERC20') {
    const checkFn = tokenType === 'ERC721' ? 
      this.checkERC721Access.bind(this) : 
      this.checkERC20Access.bind(this)

    try {
      const hasAccess = await checkFn(userAddress)
      const balance = await this.getUserBalance(userAddress)
      const tokenInfo = await this.getTokenInfo()

      return {
        hasAccess,
        balance,
        requiredBalance: this.requiredBalance,
        tokenInfo,
        userAddress
      }
    } catch (error) {
      return {
        hasAccess: false,
        error: error.message,
        userAddress
      }
    }
  }
}

// Placeholder ERC20 ABI (minimal interface)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
]

export default new TokenGateService()
