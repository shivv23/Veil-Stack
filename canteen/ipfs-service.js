// SPDX-License-Identifier: MIT
import pinataSDK from '@pinata/sdk'
import fs from 'fs'
import createLogger from './logger.js'

const log = createLogger('ipfs')

class IPFSService {
  constructor() {
    this.pinata = null
    this.enabled = false
  }

  init() {
    const apiKey = process.env.PINATA_API_KEY
    const secretKey = process.env.PINATA_SECRET_KEY

    if (!apiKey || !secretKey) {
      log.info('IPFS pinning disabled (set PINATA_API_KEY and PINATA_SECRET_KEY)')
      return
    }

    this.pinata = new pinataSDK({ apiKey, secretKey })
    this.enabled = true
    log.info('IPFS pinning enabled via Pinata')
  }

  async pinJSON(name, data) {
    if (!this.enabled) return null

    try {
      const result = await this.pinata.pinJSONToIPFS(data, {
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 }
      })
      log.info('JSON pinned to IPFS', { cid: result.IpfsHash, name })
      return result.IpfsHash
    } catch (error) {
      log.error('IPFS pin failed', { name, error: error.message })
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
      log.info('file pinned to IPFS', { cid: result.IpfsHash, name })
      return result.IpfsHash
    } catch (error) {
      log.error('IPFS pin failed', { name, error: error.message })
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
      log.error('failed to list IPFS pins', { error: error.message })
      return []
    }
  }

  async unpin(cid) {
    if (!this.enabled) return false

    try {
      await this.pinata.unpin(cid)
      log.info('unpinned from IPFS', { cid })
      return true
    } catch (error) {
      log.error('IPFS unpin failed', { cid, error: error.message })
      return false
    }
  }
}

export default new IPFSService()
