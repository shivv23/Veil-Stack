import cluster from './cluster.js'
import express from 'express'
import http from 'http'

class WebServer {
  start(port = 3000) {
    const app = express()

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