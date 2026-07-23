import cluster from './cluster.js'
import express from 'express'
import http from 'http'
import ipfs from './ipfs-service.js'

class WebServer {
  start(port = 3000, schedulerRef = null) {
    const app = express()
    this.scheduler = schedulerRef

    const clusterDetails = (req, res) => {
      const node = cluster.getProtocol()
      
      if (!node) {
        return res.status(503).json({ 
          error: 'Cluster not initialized',
          members: [] 
        })
      }

      const members = [cluster.getHost()].concat(cluster.getMembers())
      const peerId = node.peerId.toString()
      const connections = node.getConnections().length
      const peers = node.getPeers().length

      res.status(200).json({
        host: cluster.getHost(),
        peerId,
        members,
        connections,
        peers,
        multiaddrs: node.getMultiaddrs().map(addr => addr.toString())
      })
    }

    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
      next()
    })

    app.get('/', clusterDetails)
    app.get('/cluster', clusterDetails)

    app.get('/status', (req, res) => {
      if (!this.scheduler) {
        return res.status(200).json({
          host: cluster.getHost(),
          container: { image: '', state: 'no-scheduler', lastReported: 0 },
          docker: false
        })
      }

      const containerStatus = this.scheduler.getContainerStatus()
      res.status(200).json({
        host: cluster.getHost(),
        container: containerStatus,
        docker: !!this.scheduler.docker,
        readOnlyMode: this.scheduler.readOnlyMode,
        registered: !!this.scheduler.scheduledImage
      })
    })

    app.get('/containers', async (req, res) => {
      if (!this.scheduler || !this.scheduler.docker) {
        return res.status(200).json({ containers: [], dockerAvailable: false })
      }

      try {
        const containers = await this.scheduler.docker.listContainers({ all: true })
        const formatted = containers.map(c => ({
          id: c.Id.substring(0, 12),
          image: c.Image,
          name: c.Names[0] || '',
          state: c.State,
          status: c.Status,
          ports: c.Ports.map(p => ({
            private: p.PrivatePort,
            public: p.PublicPort || null,
            type: p.Type
          })),
          created: c.Created
        }))
        res.status(200).json({ containers: formatted, dockerAvailable: true })
      } catch (error) {
        res.status(200).json({ containers: [], dockerAvailable: false, error: error.message })
      }
    })

    app.get('/ipfs', async (req, res) => {
      if (!ipfs.enabled) {
        return res.status(503).json({ error: 'IPFS pinning not configured' })
      }
      const pins = await ipfs.listPins({
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0,
        query: req.query.q || undefined
      })
      res.json({ pins, count: pins.length })
    })

    app.post('/ipfs', express.json(), async (req, res) => {
      if (!ipfs.enabled) {
        return res.status(503).json({ error: 'IPFS pinning not configured' })
      }
      const { name, data } = req.body
      if (!name || !data) {
        return res.status(400).json({ error: 'name and data required' })
      }
      const cid = await ipfs.pinJSON(name, data)
      if (cid) {
        res.json({ cid, name })
      } else {
        res.status(500).json({ error: 'Pin failed' })
      }
    })

    app.delete('/ipfs/:cid', async (req, res) => {
      if (!ipfs.enabled) {
        return res.status(503).json({ error: 'IPFS pinning not configured' })
      }
      const ok = await ipfs.unpin(req.params.cid)
      res.json({ success: ok })
    })

    try {
      const server = http.createServer(app)
      server.on('error', err => {
        console.error(err)
      })
      server.listen(port)
      console.log(`Cluster health check web service is listening on port ${port}`)
    } catch (error) {
      console.log(error.message)
    }
  }
}

export default new WebServer()
