import _ from 'lodash'
import cluster from './cluster.js'
import scheduler from './scheduler.js'
import Web3 from 'web3'
import web from './web-server.js'

const args = _.reduce(process.argv.slice(2), (args, arg) => {
  const [k, v = true] = arg.split('=')
  args[k] = v
  return args
}, {})

const port = args.port || 5000
const webPort = args.webPort || 3000
const nodes = args.nodes && args.nodes.split(',') || []

// Start cluster with libp2p
cluster.start(port, nodes).then(() => {
  console.log('Cluster started successfully')

  // Start scheduler
  scheduler.start(
    new Web3.providers.HttpProvider('http://localhost:8545'),
    '0x8CFCC7a1826DA4f4b7ca856A9E8820a3Afefe102', // Deployed Canteen contract address
    '0xd5484d3d5b12d261bb07206e2b8fdccf71f6f5177b7d87c186acf11f717d0e27' // Ganache account (0) private key
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