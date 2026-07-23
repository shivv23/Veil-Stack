const { expect } = require('chai')
const http = require('http')

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

describe('Canteen End-to-End', function () {
  this.timeout(30000)

  const WEB_PORT = process.env.WEB_PORT || 5001
  const BASE = `http://localhost:${WEB_PORT}`

  describe('Web Server Endpoints', () => {
    it('GET /status returns valid JSON with container info', async () => {
      const data = await fetchJSON(`${BASE}/status`)
      expect(data).to.have.property('host')
      expect(data).to.have.property('container')
      expect(data.container).to.have.property('image')
      expect(data.container).to.have.property('state')
      expect(data.container).to.have.property('lastReported')
      expect(data).to.have.property('docker')
      expect(data).to.have.property('readOnlyMode')
    })

    it('GET /cluster returns peer info', async () => {
      const data = await fetchJSON(`${BASE}/cluster`)
      expect(data).to.have.property('host')
      expect(data).to.have.property('peerId')
      expect(data).to.have.property('members')
      expect(data).to.have.property('connections')
      expect(data).to.have.property('peers')
      expect(data).to.have.property('multiaddrs')
      expect(data.members).to.be.an('array')
      expect(data.multiaddrs).to.be.an('array')
    })

    it('GET /containers returns container list', async () => {
      const data = await fetchJSON(`${BASE}/containers`)
      expect(data).to.have.property('containers')
      expect(data).to.have.property('dockerAvailable')
      expect(data.containers).to.be.an('array')

      if (data.dockerAvailable && data.containers.length > 0) {
        const c = data.containers[0]
        expect(c).to.have.property('id')
        expect(c).to.have.property('image')
        expect(c).to.have.property('name')
        expect(c).to.have.property('state')
        expect(c).to.have.property('status')
        expect(c).to.have.property('ports')
      }
    })
  })

  describe('Container Lifecycle', () => {
    it('scheduler reports running state when container is up', async () => {
      const data = await fetchJSON(`${BASE}/status`)
      if (data.container.image && data.container.image.length > 0) {
        expect(data.container.state).to.equal('running')
      }
    })

    it('backend detects Docker availability', async () => {
      const data = await fetchJSON(`${BASE}/status`)
      expect(data.docker).to.be.a('boolean')
    })
  })
})
