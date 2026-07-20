import pinataSDK from '@pinata/sdk'
import fs from 'fs'
import path from 'path'

class IPFSService {
  constructor() {
    this.pinata = null
    this.enabled = false
  }

  init() {
    const apiKey = process.env.PINATA_API_KEY
    const secretKey = process.env.PINATA_SECRET_KEY

    if (!apiKey || !secretKey) {
      console.log('⚠️  IPFS pinning disabled (set PINATA_API_KEY and PINATA_SECRET_KEY)')
      return
    }

    this.pinata = new pinataSDK({ apiKey, secretKey })
    this.enabled = true
    console.log('✅ IPFS pinning enabled via Pinata')
  }

  async pinJSON(name, data) {
    if (!this.enabled) return null

    try {
      const result = await this.pinata.pinJSONToIPFS(data, {
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 }
      })
      console.log(`📌 Pinned JSON to IPFS: ${result.IpfsHash}`)
      return result.IpfsHash
    } catch (error) {
      console.error(`❌ IPFS pin failed for ${name}:`, error.message)
      return null
    }
  }

  async pinFile(name, filePath) {
    if (!this.enabled) return null

    try {
      const stream = fs.createReadStream(filePath)
      const result = await this.pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 }
      })
      console.log(`📌 Pinned file to IPFS: ${result.IpfsHash}`)
      return result.IpfsHash
    } catch (error) {
      console.error(`❌ IPFS pin failed for ${name}:`, error.message)
      return null
    }
  }

  async pinContainerMetadata(containerInfo) {
    const name = `canteen-container-${containerInfo.id?.substring(0, 12)}-${Date.now()}`
    const metadata = {
      type: 'container-metadata',
      timestamp: new Date().toISOString(),
      container: {
        id: containerInfo.id,
        image: containerInfo.image,
        name: containerInfo.name,
        state: containerInfo.state,
        ports: containerInfo.ports,
        created: containerInfo.created
      },
      cluster: {
        host: containerInfo.host,
        peerId: containerInfo.peerId
      }
    }
    return this.pinJSON(name, metadata)
  }

  async pinImageManifest(imageName, imageInfo) {
    const name = `canteen-image-${imageName.replace(/[:/]/g, '-')}-${Date.now()}`
    const manifest = {
      type: 'image-manifest',
      timestamp: new Date().toISOString(),
      image: {
        name: imageName,
        id: imageInfo.Id,
        size: imageInfo.Size,
        created: imageInfo.Created,
        architecture: imageInfo.Architecture,
        os: imageInfo.Os,
        config: {
          env: imageInfo.Config?.Env,
          exposedPorts: imageInfo.Config?.ExposedPorts,
          cmd: imageInfo.Config?.Cmd,
          entrypoint: imageInfo.Config?.Entrypoint
        }
      }
    }
    return this.pinJSON(name, manifest)
  }

  async listPins(filter = {}) {
    if (!this.enabled) return []

    try {
      const result = await this.pinata.pinList({
        pageLimit: filter.limit || 10,
        pageOffset: filter.offset || 0,
        hashContains: filter.query || undefined
      })
      return result.rows.map(pin => ({
        cid: pin.ipfs_pin_hash,
        name: pin.metadata?.name,
        size: pin.pin_size,
        timestamp: pin.date_pinned
      }))
    } catch (error) {
      console.error('❌ Failed to list IPFS pins:', error.message)
      return []
    }
  }

  async unpin(cid) {
    if (!this.enabled) return false

    try {
      await this.pinata.unpin(cid)
      console.log(`📌 Unpinned from IPFS: ${cid}`)
      return true
    } catch (error) {
      console.error(`❌ IPFS unpin failed for ${cid}:`, error.message)
      return false
    }
  }
}

export default new IPFSService()
