// SPDX-License-Identifier: MIT
import { Web3 } from 'web3'
import fs from 'fs'
import path from 'path'
const Canteen = JSON.parse(fs.readFileSync(path.resolve('./dashboard/src/Canteen.json'), 'utf-8'))
import Docker from 'dockerode'
import _ from 'lodash'
import Cluster from './cluster.js'
import ipfs from './ipfs-service.js'
import createLogger from './logger.js'

const log = createLogger('scheduler')

class CanteenScheduler {
  async start(provider, contractAddress, privateKey, dockerPath, readOnlyMode = false) {
    const web3 = new Web3(provider)

    this.readOnlyMode = readOnlyMode || !privateKey
    this.containerStatus = { image: '', state: 'idle', lastReported: 0 }
    this.containerHealthCheck = null
    this.startTime = Date.now()

    let acct, fromAddress

    if (!this.readOnlyMode) {
      acct = web3.eth.accounts.privateKeyToAccount(privateKey)
      web3.eth.accounts.wallet.add(acct)
      fromAddress = acct.address
      log.info('scheduler started', { mode: 'legacy', address: fromAddress })
    } else {
      log.info('scheduler started', { mode: 'read-only' })
    }

    const contract = new web3.eth.Contract(Canteen.abi, contractAddress, fromAddress ? { from: fromAddress } : {})

    if (!dockerPath) {
      const isWin = process.platform === 'win32'

      if (isWin) {
        const winPipe = '//./pipe/docker_engine'
        dockerPath = winPipe
        log.info('docker socket', { path: winPipe, platform: 'win32' })
      } else {
        const desktopSocket = `${process.env.HOME}/.docker/desktop/docker.sock`
        const defaultSocket = '/var/run/docker.sock'

        if (fs.existsSync(desktopSocket)) {
          dockerPath = desktopSocket
          log.info('docker socket', { path: desktopSocket })
        } else if (fs.existsSync(defaultSocket)) {
          dockerPath = defaultSocket
          log.info('docker socket', { path: defaultSocket })
        } else {
          if (!readOnlyMode) {
            throw new Error('Could not find Docker socket. Is Docker running?')
          }
          log.warn('docker socket not found, running without Docker')
        }
      }
    }

    let dockerOpts
    if (process.env.DOCKER_HOST) {
      dockerOpts = { host: process.env.DOCKER_HOST }
    } else if (process.platform === 'win32') {
      dockerOpts = { socketPath: '//./pipe/docker_engine' }
    } else {
      dockerOpts = { socketPath: dockerPath }
    }
    const docker = dockerPath ? new Docker(dockerOpts) : null

    this.docker = docker
    this.contract = contract
    this.account = acct
    this.accountAddress = fromAddress
    this.web3 = web3

    try {
      if (!this.readOnlyMode) {
        await this.registerNode()
        this._startLoop()
        this.listenToEvents()
      } else {
        this.listenToEvents()
        await this._bootstrapOnRestart()
      }
    } catch (error) {
      log.error('startup failed', { error: error.message })
    }
  }

  _startLoop() {
    if (!this.loopInterval) {
      log.info('scheduling loop started', { interval: '1s' })
      this.loopInterval = setInterval(async () => {
        try {
          await this.loop()
        } catch (error) {
          log.error('loop iteration failed', { error: error.message })
        }
      }, 1000)
    }
  }

  _stopLoop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
      log.info('scheduling loop stopped')
    }
  }

  async _bootstrapOnRestart() {
    const host = Cluster.getHost()
    if (!host) return

    try {
      const details = await this.contract.methods.getMemberDetails(host).call()
      const isActive = details && details['1'] === true
      const assignedImage = details ? details['0'] : ''

      if (isActive) {
        log.info('node registered on-chain', { host, image: assignedImage || '(none)' })
        this._startLoop()
      } else {
        log.info('node not registered, waiting for MetaMask registration', { host })
      }
    } catch (error) {
      log.warn('could not check on-chain registration, waiting for MemberJoin', { error: error.message })
    }
  }

  listenToEvents() {
    if (!this.contract) {
      log.error('contract not initialized')
      return
    }

    log.info('event polling started', { interval: '15s' })

    this.lastProcessedBlock = 0

    this.pollForEvents()

    this.eventPollingInterval = setInterval(() => {
      this.pollForEvents()
    }, 15000)
  }

  async pollForEvents() {
    try {
      const currentBlock = Number(await this.web3.eth.getBlockNumber())

      if (this.lastProcessedBlock === 0) {
        this.lastProcessedBlock = currentBlock - 1
        log.info('event monitoring started', { fromBlock: this.lastProcessedBlock })
        return
      }

      if (currentBlock <= this.lastProcessedBlock) return

      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: this.lastProcessedBlock + 1,
        toBlock: currentBlock
      })

      for (const event of events) {
        log.info('event received', { event: event.event, block: event.blockNumber })

        if (event.event === 'MemberJoin') {
          const { host } = event.returnValues
          log.info('member joined', { host })
          if (host === Cluster.getHost()) {
            log.info('this node registered, starting loop')
            this._startLoop()
          }
        } else if (event.event === 'MemberLeave') {
          const { host } = event.returnValues
          log.info('member left', { host })
          if (host === Cluster.getHost()) {
            log.info('this node removed, cleaning up')
            this._stopLoop()
            await this.cleanup()
          }
        } else if (event.event === 'MemberImageUpdate') {
          const { host, image } = event.returnValues
          log.info('image updated', { host, image })
        } else if (event.event === 'StatusReport') {
          const { host, image, state } = event.returnValues
          if (host !== Cluster.getHost()) {
            log.info('peer status report', { host, image, state })
          }
        }
      }

      this.lastProcessedBlock = currentBlock

    } catch (error) {
      log.error('event polling failed', { error: error.message })
    }
  }

  async loop() {
    const { contract } = this

    const details = await contract.methods
      .getMemberDetails(Cluster.getHost())
      .call({ from: this.accountAddress })
    const scheduledImage = details['0']

    if (!details) return
    if (this.scheduledImage === scheduledImage) return

    if (this.scheduledImage && this.scheduledImage.length > 0 && scheduledImage.length === 0) {
      await this.cleanup()
    } else {
      await this.updateScheduler(scheduledImage)
    }
  }

  async registerNode() {
    const { contract, account, web3 } = this

    const host = Cluster.getHost()

    try {
      const details = await contract.methods.getMemberDetails(host).call({ from: account.address })
      const isActive = details && (details['1'] === true)
      if (isActive) {
        log.info('node already active, skipping registration', { host })
        return
      }
    } catch (e) {
      // If call fails, continue to attempt registration
    }

    const registerMember = contract.methods.addMember(host)

    try {
      const gas = await registerMember.estimateGas({ from: account.address })
      await registerMember.send({
        from: account.address,
        gas,
        gasPrice: await web3.eth.getGasPrice()
      })

      log.info('node registered on Canteen', { host })
    } catch (error) {
      const msg = (error && error.message || '').toLowerCase()
      if (error?.code === -32000 || msg.includes('revert')) {
        log.info('registration reverted (likely already a member)', { host })
      } else {
        log.error('registration failed', { error: error.message })
        throw error
      }
    }
  }

  _setContainerStatus(image, state) {
    this.containerStatus = { image, state, lastReported: Date.now() }
    log.info('container status updated', { image: image || 'none', state })
  }

  getContainerStatus() {
    return this.containerStatus
  }

  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000)
  }

  async _reportStatus(image, state) {
    this._setContainerStatus(image, state)

    if (!this.readOnlyMode && this.account) {
      try {
        const contract = new this.web3.eth.Contract(
          Canteen.abi,
          this.contract.options.address,
          { from: this.account.address }
        )
        await contract.methods
          .reportStatus(Cluster.getHost(), image, state)
          .send({
            from: this.account.address,
            gas: 200000,
            gasPrice: await this.web3.eth.getGasPrice()
          })
        log.info('on-chain status reported', { image, state })
      } catch (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('is not a function') || msg.includes('method does not exist') || msg.includes('revert')) {
          log.info('reportStatus not available on this contract version')
        } else {
          log.warn('on-chain reportStatus failed', { error: error.message })
        }
      }
    }
  }

  _startContainerHealthCheck(container, scheduledImage) {
    if (this.containerHealthCheck) {
      clearInterval(this.containerHealthCheck)
    }

    this.containerHealthCheck = setInterval(async () => {
      try {
        if (!container) return
        const inspect = await container.inspect()
        const running = inspect.State.Running

        if (!running && this.scheduledImage === scheduledImage) {
          log.warn('container not running', { containerId: container.id.substring(0, 12), state: inspect.State.Status })
          this._setContainerStatus(scheduledImage, 'crashed')

          if (inspect.State.Restarting) {
            log.info('docker restart policy active, waiting')
          } else {
            log.info('container stopped unexpectedly, restarting')
            try {
              await container.start()
              log.info('container restarted', { containerId: container.id.substring(0, 12) })
              this._setContainerStatus(scheduledImage, 'running')
            } catch (restartErr) {
              log.error('container restart failed', { error: restartErr.message })
            }
          }
        }
      } catch (error) {
        log.error('health check failed', { error: error.message })
      }
    }, 10000)
  }

  _stopContainerHealthCheck() {
    if (this.containerHealthCheck) {
      clearInterval(this.containerHealthCheck)
      this.containerHealthCheck = null
    }
  }

  async updateScheduler(scheduledImage) {
    this.scheduledImage = scheduledImage
    if (this.scheduledImage.length === 0) return

    if (!this.docker) {
      log.info('Docker unavailable, would deploy', { image: scheduledImage })
      this._setContainerStatus(scheduledImage, 'pending')
      return
    }

    this.docker.pull(scheduledImage, (err, stream) => {
      if (err) {
        log.error('image pull failed', { image: scheduledImage, error: err.message })
        return
      }

      if (!stream) {
        log.error('no stream returned from docker pull', { image: scheduledImage })
        return
      }

      this.docker.modem.followProgress(stream, finished.bind(this), progress)

      function progress(event) {
        log.debug('pull progress', { status: event.status, id: event.id || '' })
      }

      async function finished() {
        try {
          const imageInfo = await this.docker.getImage(scheduledImage).inspect()
          await ipfs.pinImageManifest(scheduledImage, imageInfo)
        } catch (_) {}

        const containers = await this.docker.listContainers()

        log.info('deploying container', { image: scheduledImage })

        const containerStatus = _.find(containers, {Image: scheduledImage})

        const scheduleImage = async () => {
          const containers = await this.docker.listContainers()
          const containerStatus = _.find(containers, {Image: scheduledImage})

          let container
          if (!containerStatus) {
            let ports = []
            try {
              const contractPorts = await this.contract.methods.getPortsForImage(scheduledImage).call()
              if (contractPorts && contractPorts.length > 0) {
                ports = contractPorts.map(p => ({ host: p[0], container: p[1] }))
                log.info('using contract port mapping', { ports: JSON.stringify(ports) })
              }
            } catch (_) {}
            if (ports.length === 0) {
              try {
                const imageInfo = await this.docker.getImage(scheduledImage).inspect()
                const exposed = imageInfo.ContainerConfig?.ExposedPorts || imageInfo.Config?.ExposedPorts || {}
                ports = Object.keys(exposed).map(p => {
                  const num = parseInt(p.split('/')[0])
                  return { host: num, container: num }
                })
                if (ports.length > 0) {
                  log.info('detected ports from image metadata', { ports: JSON.stringify(ports) })
                }
              } catch (_) {}
            }
            if (ports.length === 0) {
              ports = [{ host: 8080, container: 8080 }]
              log.warn('no port info found, defaulting to 8080', { image: scheduledImage })
            }

            const exposedPorts = {}
            const portBindings = {}
            for (const p of ports) {
              exposedPorts[`${p.container}/tcp`] = {}
              portBindings[`${p.container}/tcp`] = [{ HostPort: `${p.host}` }]
            }

            container = await this.docker.createContainer({
              Image: scheduledImage,
              ExposedPorts: exposedPorts,
              HostConfig: {
                PortBindings: portBindings,
                RestartPolicy: {
                  Name: 'on-failure',
                  MaximumRetryCount: 3
                },
                Memory: 512 * 1024 * 1024,
                CpuPeriod: 100000,
                CpuQuota: 50000
              }
            })

            log.info('container created', { image: scheduledImage, containerId: container.id.substring(0, 12) })
          } else {
            container = this.docker.getContainer(containerStatus['Id'])
            log.info('reusing stopped container', { containerId: container.id.substring(0, 12) })
          }

          const oldContainer = this.container
          if (oldContainer) {
            log.info('removing old container', { containerId: oldContainer.id.substring(0, 12) })
            await oldContainer.stop()
            await oldContainer.remove()
          }

          await container.start()

          log.info('container started', { image: scheduledImage, containerId: container.id.substring(0, 12) })

          this._startContainerHealthCheck(container, scheduledImage)
          await this._reportStatus(scheduledImage, 'running')

          try {
            const inspect = await container.inspect()
            await ipfs.pinContainerMetadata({
              id: container.id,
              image: scheduledImage,
              name: inspect.Name,
              state: inspect.State?.Status,
              ports: inspect.NetworkSettings?.Ports,
              created: inspect.Created,
              host: Cluster.getHost(),
              peerId: Cluster.getProtocol()?.peerId?.toString()
            })
          } catch (_) {}

          this.container = container
        }

        if (containerStatus && containerStatus.State === 'running') {
          let container = this.docker.getContainer(containerStatus['Id'])
          await container.stop()
          await container.remove()

          log.info('removed existing running container', { image: scheduledImage })

          setTimeout(async () => await scheduleImage(), 3000)
        } else {
          await scheduleImage()
        }
      }
    })
  }

  async cleanup() {
    log.info('scheduler shutting down')

    this._stopContainerHealthCheck()

    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval)
      this.eventPollingInterval = null
    }

    if (this.container) {
      try {
        await this._reportStatus(this.scheduledImage || '', 'stopped')
      } catch (_) {}

      try {
        await this.container.stop()
        await this.container.remove()
      } catch (_) {}

      this.scheduledImage = ''
      this.container = null
    }

    this._stopLoop()
  }
}

export default new CanteenScheduler()
