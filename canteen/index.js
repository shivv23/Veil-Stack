import _ from 'lodash'
import cluster from './cluster.js'
import scheduler from './scheduler.js'
import Web3 from 'web3'
import web from './web-server.js'
import { getActiveChain, validateConfig, SERVER_CONFIG } from './config.js'

const args = _.reduce(process.argv.slice(2), (args, arg) => {
  const [k, v = true] = arg.split('=')
  args[k] = v
  return args
}, {})

const port = args.port || SERVER_CONFIG.port
const webPort = args.webPort || SERVER_CONFIG.webPort
const nodes = args.nodes && args.nodes.split(',') || []

// Validate configuration
const { warnings } = validateConfig()
warnings.forEach(warning => console.log(warning))

// Get active chain configuration
const activeChain = getActiveChain()

console.log('\n🚀 Starting Canteen Node')
console.log('========================')
console.log(`⛓️  Chain: ${activeChain.name}`)
console.log(`📡 RPC: ${activeChain.rpcUrl}`)
console.log(`📄 Contract: ${activeChain.contractAddress}`)
console.log(`🔌 Port: ${port}`)
console.log(`🌐 Web Port: ${webPort}`)
console.log('========================\n')

// Start cluster with libp2p
cluster.start(port, nodes).then(() => {
  console.log('✅ Cluster started successfully')

  // Start scheduler in READ-ONLY mode (no private key)
  // Transactions will be signed via MetaMask frontend
  scheduler.start(
    new Web3.providers.HttpProvider(activeChain.rpcUrl),
    activeChain.contractAddress,
    null, // No private key - MetaMask will handle signing
    undefined, // Docker path (auto-detect)
    true // Read-only mode
  )

  // Start web server (configurable port)
  web.start(Number(webPort))

  // Listen for cluster membership changes
  cluster.on('memberJoin', (peerId) => {
    console.log(`New member joined: ${peerId}`)
  })

  cluster.on('memberLeave', (peerId) => {
    console.log(`Member left: ${peerId}`)
  })
}).catch(error => {
  console.error('Failed to start cluster:', error)
  process.exit(1)
})

process.stdin.resume()

// Graceful shutdown
const cleanup = async () => {
  console.log('\nShutting down gracefully...')
  
  try {
    await scheduler.cleanup()
    await cluster.stop()
    console.log('Cleanup completed')
    process.exit(0)
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

process.on('exit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)