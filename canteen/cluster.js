// SPDX-License-Identifier: MIT
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { mdns } from '@libp2p/mdns'
import { bootstrap } from '@libp2p/bootstrap'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { identify } from '@libp2p/identify'
import { EventEmitter } from 'events'
import _ from 'lodash'
import createLogger from './logger.js'

const log = createLogger('cluster')

const HEARTBEAT_INTERVAL = 5000
const PEER_TIMEOUT = 15000
const HEARTBEAT_TOPIC = '/canteen/heartbeat/1.0.0'

class CanteenCluster extends EventEmitter {
  constructor() {
    super()
    this.host = null
    this.node = null
    this.peers = new Map()
    this.heartbeatInterval = null
  }

  getHost() {
    return this.host
  }

  getProtocol() {
    return this.node
  }

  getMembers() {
    const now = Date.now()
    const activeMembers = []
    
    for (const [peerId, info] of this.peers.entries()) {
      if (now - info.lastSeen < PEER_TIMEOUT) {
        activeMembers.push(info.host)
      }
    }
    
    return activeMembers
  }

  async start(port, bootstrapNodes = []) {
    this.host = `127.0.0.1:${port}`
    
    try {
      const libp2pConfig = {
        addresses: {
          listen: [`/ip4/0.0.0.0/tcp/${port}`]
        },
        transports: [tcp()],
        connectionEncryption: [noise()],
        streamMuxers: [mplex()],
        services: {
          identify: identify(),
          pubsub: gossipsub({
            emitSelf: false,
            allowPublishToZeroTopicPeers: true
          })
        },
        peerDiscovery: []
      }

      libp2pConfig.peerDiscovery.push(mdns({
        interval: 1000
      }))

      if (bootstrapNodes.length > 0) {
        const bootstrapAddrs = bootstrapNodes
          .map(node => {
            const [host, port] = node.split(':')
            return `/ip4/${host}/tcp/${port}`
          })
          .filter(addr => addr !== `/ip4/127.0.0.1/tcp/${port}`)

        if (bootstrapAddrs.length > 0) {
          libp2pConfig.peerDiscovery.push(bootstrap({
            list: bootstrapAddrs
          }))
        }
      }

      this.node = await createLibp2p(libp2pConfig)

      this._setupEventListeners()

      await this.node.start()
      
      log.info('libp2p node started', {
        peerId: this.node.peerId.toString(),
        addresses: this.node.getMultiaddrs().map(a => a.toString())
      })

      await this.node.services.pubsub.subscribe(HEARTBEAT_TOPIC)

      this._startHeartbeat()
      this._startPeerPruning()

      log.info('cluster initialized', { bootstrapNodes: bootstrapNodes.length || 0 })
      
    } catch (error) {
      log.error('libp2p startup failed', { error: error.message })
      throw error
    }
  }

  _setupEventListeners() {
    this.node.addEventListener('peer:discovery', (evt) => {
      const peerId = evt.detail.id.toString()
      log.debug('peer discovered', { peerId })
    })

    this.node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString()
      log.info('peer connected', { peerId })
      this._updatePeer(peerId, null)
      this._logClusterMembers()
    })

    this.node.addEventListener('peer:disconnect', (evt) => {
      const peerId = evt.detail.toString()
      log.info('peer disconnected', { peerId })
      this._logClusterMembers()
    })

    this.node.services.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === HEARTBEAT_TOPIC) {
        try {
          const message = JSON.parse(new TextDecoder().decode(evt.detail.data))
          const peerId = evt.detail.from.toString()
          
          if (message.type === 'heartbeat' && message.host) {
            this._updatePeer(peerId, message.host)
          }
        } catch (error) {
          log.error('heartbeat parse failed', { error: error.message })
        }
      }
    })
  }

  _updatePeer(peerId, host) {
    const now = Date.now()
    const existing = this.peers.get(peerId)
    
    if (existing) {
      existing.lastSeen = now
      if (host) existing.host = host
    } else {
      this.peers.set(peerId, {
        lastSeen: now,
        host: host || peerId
      })
      this.emit('memberJoin', peerId)
    }
  }

  _startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const message = JSON.stringify({
          type: 'heartbeat',
          host: this.host,
          timestamp: Date.now()
        })

        const pubsub = this.node.services?.pubsub
        if (!pubsub) {
          log.warn('pubsub not ready, skipping heartbeat')
          return
        }
        await pubsub.publish(HEARTBEAT_TOPIC, new TextEncoder().encode(message))
      } catch (error) {
        log.error('heartbeat failed', { error: error.message })
      }
    }, HEARTBEAT_INTERVAL)
  }

  _startPeerPruning() {
    setInterval(() => {
      const now = Date.now()
      const removedPeers = []

      for (const [peerId, info] of this.peers.entries()) {
        if (now - info.lastSeen > PEER_TIMEOUT) {
          this.peers.delete(peerId)
          removedPeers.push(peerId)
          this.emit('memberLeave', peerId)
        }
      }

      if (removedPeers.length > 0) {
        log.info('pruned inactive peers', { count: removedPeers.length })
        this._logClusterMembers()
      }
    }, HEARTBEAT_INTERVAL)
  }

  _logClusterMembers() {
    const members = this.getMembers()
    log.debug('cluster members', { count: members.length, members })
  }

  async stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.node) {
      try { await this.node.services.pubsub.unsubscribe(HEARTBEAT_TOPIC) } catch (e) {}
      await this.node.stop()
      log.info('libp2p node stopped')
    }

    this.peers.clear()
  }
}

export default new CanteenCluster()
