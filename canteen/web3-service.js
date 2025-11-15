/**
 * Web3 Service for backend (Read-only mode)
 * Handles contract event listening without private key management
 */

import Web3 from 'web3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class Web3Service {
  constructor() {
    this.web3 = null
    this.contract = null
    this.chainId = null
    this.contractAddress = null
    this.isReadOnly = true
  }

  /**
   * Initialize Web3 connection in read-only mode
   * @param {string} rpcUrl - RPC endpoint URL
   * @param {string} contractAddress - Deployed contract address
   * @param {number} chainId - Chain ID
   */
  async initialize(rpcUrl, contractAddress, chainId) {
    console.log('🔧 Initializing Web3 Service (Read-Only Mode)')
    console.log(`📡 RPC: ${rpcUrl}`)
    console.log(`📄 Contract: ${contractAddress}`)
    console.log(`⛓️  Chain ID: ${chainId}`)

    try {
      // Create Web3 instance with HTTP provider
      this.web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl))
      this.chainId = chainId
      this.contractAddress = contractAddress

      // Load contract ABI
      const abiPath = path.join(__dirname, 'build', 'contracts', 'Canteen.json')
      
      if (!fs.existsSync(abiPath)) {
        throw new Error(`Contract ABI not found at ${abiPath}. Run 'npx truffle compile' first.`)
      }

      const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
      this.contract = new this.web3.eth.Contract(contractJson.abi, contractAddress)

      // Verify contract is deployed
      const code = await this.web3.eth.getCode(contractAddress)
      if (code === '0x' || code === '0x0') {
        throw new Error(`No contract found at address ${contractAddress}`)
      }

      console.log('✅ Web3 Service initialized successfully')
      console.log('📱 All transactions must be signed via MetaMask frontend')
      
      return true
    } catch (error) {
      console.error('❌ Web3 Service initialization failed:', error.message)
      throw error
    }
  }

  /**
   * Get current network info
   */
  async getNetworkInfo() {
    if (!this.web3) {
      throw new Error('Web3 not initialized')
    }

    try {
      const blockNumber = await this.web3.eth.getBlockNumber()
      const networkId = await this.web3.eth.net.getId()
      
      return {
        blockNumber: Number(blockNumber),
        networkId: Number(networkId),
        chainId: this.chainId,
        isConnected: true
      }
    } catch (error) {
      return {
        isConnected: false,
        error: error.message
      }
    }
  }

  /**
   * Read contract state (no gas required)
   */
  async getImages() {
    if (!this.contract) {
      throw new Error('Contract not loaded')
    }

    try {
      return await this.contract.methods.getImages().call()
    } catch (error) {
      console.error('Error reading images:', error.message)
      throw error
    }
  }

  /**
   * Get contract owner
   */
  async getOwner() {
    if (!this.contract) {
      throw new Error('Contract not loaded')
    }

    try {
      return await this.contract.methods.owner().call()
    } catch (error) {
      console.error('Error reading owner:', error.message)
      throw error
    }
  }

  /**
   * Listen to all contract events
   * @param {Function} handler - Event handler function
   */
  subscribeToEvents(handler) {
    if (!this.contract) {
      throw new Error('Contract not loaded')
    }

    console.log('👂 Subscribing to contract events...')

    this.contract.events.allEvents()
      .on('data', (event) => {
        console.log(`📡 Event received: ${event.event}`)
        handler(event)
      })
      .on('error', (error) => {
        console.error('❌ Event subscription error:', error.message)
      })
      .on('connected', (subscriptionId) => {
        console.log(`✅ Event subscription active: ${subscriptionId}`)
      })

    return true
  }

  /**
   * Get past events from the blockchain
   * @param {string} eventName - Event name (or 'allEvents')
   * @param {number} fromBlock - Starting block number
   */
  async getPastEvents(eventName = 'allEvents', fromBlock = 0) {
    if (!this.contract) {
      throw new Error('Contract not loaded')
    }

    try {
      return await this.contract.getPastEvents(eventName, {
        fromBlock,
        toBlock: 'latest'
      })
    } catch (error) {
      console.error('Error fetching past events:', error.message)
      throw error
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    console.log('🧹 Cleaning up Web3 Service...')
    
    if (this.contract && this.contract.events) {
      // Remove all event listeners
      this.contract.events.allEvents().removeAllListeners()
    }

    this.web3 = null
    this.contract = null
    
    console.log('✅ Web3 Service cleanup complete')
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const network = await this.getNetworkInfo()
      const owner = await this.getOwner()
      
      return {
        status: 'healthy',
        network,
        contract: {
          address: this.contractAddress,
          owner
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }
}

export default new Web3Service()
