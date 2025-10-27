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
    '0xfF68CbE54a1104B3b52E7400b3Bf5653741a6b8C', // updated deployed contract address
    '0xbc778caa6c1a8d8d747deda272670ba8636e0998f79bcdae47fb15568bca3e6a'
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