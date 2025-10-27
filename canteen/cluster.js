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

const HEARTBEAT_INTERVAL = 5000 // 5 seconds
const PEER_TIMEOUT = 15000 // 15 seconds
const HEARTBEAT_TOPIC = '/canteen/heartbeat/1.0.0'

class CanteenCluster extends EventEmitter {
  constructor() {
    super()
    this.host = null
    this.node = null
    this.peers = new Map() // peerId -> { lastSeen, host }
    this.heartbeatInterval = null
  }

  getHost() {
    return this.host
  }

  getProtocol() {
    return this.node
  }

  getMembers() {
    // Return array of active peer hosts
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
      // Configure libp2p
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

      // Add mDNS for local discovery
      libp2pConfig.peerDiscovery.push(mdns({
        interval: 1000
      }))

      // Add bootstrap peers if provided
      if (bootstrapNodes.length > 0) {
        // Convert host:port format to multiaddr format
        const bootstrapAddrs = bootstrapNodes
          .map(node => {
            const [host, port] = node.split(':')
            return `/ip4/${host}/tcp/${port}`
          })
          .filter(addr => addr !== `/ip4/127.0.0.1/tcp/${port}`) // Don't bootstrap to self

        if (bootstrapAddrs.length > 0) {
          libp2pConfig.peerDiscovery.push(bootstrap({
            list: bootstrapAddrs
          }))
        }
      }

      // Create libp2p node
      this.node = await createLibp2p(libp2pConfig)

      // Set up event listeners
      this._setupEventListeners()

      // Start the node
      await this.node.start()
      
      console.log(`Libp2p node started with PeerId: ${this.node.peerId.toString()}`)
      console.log(`Listening on addresses:`)
      this.node.getMultiaddrs().forEach(addr => {
        console.log(`  ${addr.toString()}`)
      })

      // Subscribe to heartbeat topic
  await this.node.services.pubsub.subscribe(HEARTBEAT_TOPIC)

      // Start heartbeat broadcasting
      this._startHeartbeat()

      // Start peer pruning
      this._startPeerPruning()

      console.log(`Cluster initialized. Bootstrap nodes: ${bootstrapNodes.length > 0 ? bootstrapNodes.join(', ') : 'None (mDNS only)'}`)
      
    } catch (error) {
      console.error('Failed to start libp2p node:', error)
      throw error
    }
  }

  _setupEventListeners() {
    // Peer discovery
    this.node.addEventListener('peer:discovery', (evt) => {
      const peerId = evt.detail.id.toString()
      console.log(`Discovered peer: ${peerId}`)
    })

    // Peer connection
    this.node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString()
      console.log(`Connected to peer: ${peerId}`)
      this._updatePeer(peerId, null)
      this._logClusterMembers()
    })

    // Peer disconnection
    this.node.addEventListener('peer:disconnect', (evt) => {
      const peerId = evt.detail.toString()
      console.log(`Disconnected from peer: ${peerId}`)
      this._logClusterMembers()
    })

    // Handle incoming heartbeat messages
    this.node.services.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === HEARTBEAT_TOPIC) {
        try {
          const message = JSON.parse(new TextDecoder().decode(evt.detail.data))
          const peerId = evt.detail.from.toString()
          
          if (message.type === 'heartbeat' && message.host) {
            this._updatePeer(peerId, message.host)
          }
        } catch (error) {
          console.error('Error processing heartbeat message:', error)
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
          console.warn('Pubsub service not ready; skipping heartbeat')
          return
        }
        await pubsub.publish(HEARTBEAT_TOPIC, new TextEncoder().encode(message))
      } catch (error) {
        console.error('Error sending heartbeat:', error)
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
        console.log(`Pruned ${removedPeers.length} inactive peer(s)`)
        this._logClusterMembers()
      }
    }, HEARTBEAT_INTERVAL)
  }

  _logClusterMembers() {
    const members = this.getMembers()
    console.log(`Cluster members: ${members.length > 0 ? '[' + members.join(', ') + ']' : 'None.'}`)
  }

  async stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.node) {
      try { await this.node.services.pubsub.unsubscribe(HEARTBEAT_TOPIC) } catch (e) {}
      await this.node.stop()
      console.log('Libp2p node stopped')
    }

    this.peers.clear()
  }
}

export default new CanteenCluster()