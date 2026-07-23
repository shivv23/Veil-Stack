// SPDX-License-Identifier: MIT
import _ from 'lodash'
import cluster from './cluster.js'
import scheduler from './scheduler.js'
import Web3 from 'web3'
import web from './web-server.js'
import { getActiveChain, validateConfig, SERVER_CONFIG } from './config.js'
import ipfs from './ipfs-service.js'
import createLogger from './logger.js'

const log = createLogger('main')

const args = _.reduce(process.argv.slice(2), (args, arg) => {
  const [k, v = true] = arg.split('=')
  args[k] = v
  return args
}, {})

const port = args.port || SERVER_CONFIG.port
const webPort = args.webPort || SERVER_CONFIG.webPort
const nodes = args.nodes && args.nodes.split(',') || []

const { warnings } = validateConfig()
warnings.forEach(w => log.warn(w))

ipfs.init()

const activeChain = getActiveChain()

log.info('starting canteen node', {
  chain: activeChain.name,
  rpc: activeChain.rpcUrl,
  contract: activeChain.contractAddress,
  port,
  webPort
})

cluster.start(port, nodes).then(() => {
  log.info('cluster started')

  scheduler.start(
    new Web3.providers.HttpProvider(activeChain.rpcUrl),
    activeChain.contractAddress,
    null,
    undefined,
    true
  )

  web.start(Number(webPort), scheduler)

  cluster.on('memberJoin', (peerId) => {
    log.info('member joined', { peerId })
  })

  cluster.on('memberLeave', (peerId) => {
    log.info('member left', { peerId })
  })
}).catch(error => {
  log.error('cluster startup failed', { error: error.message })
  process.exit(1)
})

let shuttingDown = false

const shutdown = async (signal) => {
  if (shuttingDown) return
  shuttingDown = true

  log.info('shutdown initiated', { signal })

  try {
    await scheduler.cleanup()
    await cluster.stop()
    log.info('cleanup completed')
    process.exit(0)
  } catch (error) {
    log.error('cleanup failed', { error: error.message })
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('exit', () => {
  if (!shuttingDown) log.info('process exiting')
})

process.stdin.resume()
