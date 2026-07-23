import { Web3 } from 'web3'
import fs from 'fs'
import path from 'path'
const Canteen = JSON.parse(fs.readFileSync(path.resolve('./dashboard/src/Canteen.json'), 'utf-8'))
import Docker from 'dockerode'
import _ from 'lodash'
import Cluster from './cluster.js'
import ipfs from './ipfs-service.js'

class CanteenScheduler {
  async start(provider, contractAddress, privateKey, dockerPath, readOnlyMode = false) {
    const web3 = new Web3(provider)

    this.readOnlyMode = readOnlyMode || !privateKey
    this.containerStatus = { image: '', state: 'idle', lastReported: 0 }
    this.containerHealthCheck = null

    let acct, fromAddress

    if (!this.readOnlyMode) {
      acct = web3.eth.accounts.privateKeyToAccount(privateKey)
      web3.eth.accounts.wallet.add(acct)
      fromAddress = acct.address
      console.log('🔑 Scheduler running in LEGACY mode with private key')
    } else {
      console.log('👁️  Scheduler running in READ-ONLY mode')
      console.log('📱 Node registration must be done via MetaMask frontend')
      fromAddress = null
    }

    const contract = new web3.eth.Contract(Canteen.abi, contractAddress, fromAddress ? { from: fromAddress } : {})

    if (!dockerPath) {
      const isWin = process.platform === 'win32'

      if (isWin) {
        const winPipe = '//./pipe/docker_engine'
        dockerPath = winPipe
        console.log('Using Windows named pipe:', winPipe)
      } else {
        const desktopSocket = `${process.env.HOME}/.docker/desktop/docker.sock`
        const defaultSocket = '/var/run/docker.sock'

        if (fs.existsSync(desktopSocket)) {
          dockerPath = desktopSocket
          console.log('Using Docker Desktop socket:', dockerPath)
        } else if (fs.existsSync(defaultSocket)) {
          dockerPath = defaultSocket
          console.log('Using default Docker socket:', dockerPath)
        } else {
          if (!readOnlyMode) {
            throw new Error('Could not find Docker socket. Is Docker running?')
          }
          console.log('⚠️  Docker socket not found — running in read-only event mode')
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
      console.error(error)
    }
  }

  _startLoop() {
    if (!this.loopInterval) {
      console.log('🔄 Starting scheduling loop (1s interval)')
      this.loopInterval = setInterval(async () => {
        try {
          await this.loop()
        } catch (error) {
          console.error('❌ Loop iteration error:', error.message)
        }
      }, 1000)
    }
  }

  _stopLoop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
      console.log('⏹️  Scheduling loop stopped')
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
        console.log(`✅ Node already registered on-chain as ${host}`)
        if (assignedImage.length > 0) {
          console.log(`📦 Assigned image: ${assignedImage} — starting scheduling loop`)
        } else {
          console.log('📭 No image assigned yet — starting loop to watch for assignments')
        }
        this._startLoop()
      } else {
        console.log('⏳ Node not registered on-chain — waiting for MetaMask registration')
      }
    } catch (error) {
      console.log('⚠️  Could not check on-chain registration:', error.message)
      console.log('⏳ Will start loop on first MemberJoin event')
    }
  }

  listenToEvents() {
    if (!this.contract) {
      console.error('❌ Contract not initialized')
      return
    }

    console.log('👂 Polling for contract events (HTTP provider)...')
    console.log('ℹ️  Checking for new events every 15 seconds')

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
        console.log(`✅ Started monitoring from block ${this.lastProcessedBlock}`)
        return
      }

      if (currentBlock <= this.lastProcessedBlock) return

      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: this.lastProcessedBlock + 1,
        toBlock: currentBlock
      })

      for (const event of events) {
        console.log(`📡 Event detected: ${event.event} (Block ${event.blockNumber})`)

        if (event.event === 'MemberJoin') {
          const { host } = event.returnValues
          console.log(`➕ MemberJoin: ${host}`)
          if (host === Cluster.getHost()) {
            console.log('✅ This node has been registered!')
            this._startLoop()
          }
        } else if (event.event === 'MemberLeave') {
          const { host } = event.returnValues
          console.log(`➖ MemberLeave: ${host}`)
          if (host === Cluster.getHost()) {
            console.log('This node has been removed')
            this._stopLoop()
            await this.cleanup()
          }
        } else if (event.event === 'MemberImageUpdate') {
          const { host, image } = event.returnValues
          console.log(`🔄 MemberImageUpdate: ${host} -> ${image}`)
          if (host === Cluster.getHost()) {
            console.log(`📦 New image assigned to this node: ${image}`)
          }
        } else if (event.event === 'StatusReport') {
          const { host, image, state } = event.returnValues
          if (host !== Cluster.getHost()) {
            console.log(`📋 StatusReport from ${host}: ${image} (${state})`)
          }
        }
      }

      this.lastProcessedBlock = currentBlock

    } catch (error) {
      console.error('❌ Error polling events:', error.message)
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
        console.log('Node already active on Canteen. Skipping registration.')
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

      console.log('Node has been registered on Canteen.')
    } catch (error) {
      const msg = (error && error.message || '').toLowerCase()
      if (error?.code === -32000 || msg.includes('revert')) {
        console.log('Registration reverted (likely already a member). Continuing...')
      } else {
        console.error(error)
        throw error
      }
    }
  }

  _setContainerStatus(image, state) {
    this.containerStatus = { image, state, lastReported: Date.now() }
    console.log(`📊 Container status: ${image || 'none'} (${state})`)
  }

  getContainerStatus() {
    return this.containerStatus
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
        console.log(`📤 On-chain status reported: ${image} (${state})`)
      } catch (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('is not a function') || msg.includes('method does not exist') || msg.includes('revert')) {
          console.log(`ℹ️  On-chain reportStatus not available on this contract version (off-chain tracking active)`)
        } else {
          console.log(`⚠️  Could not report status on-chain: ${error.message}`)
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
          console.log(`⚠️  Container ${container.id.substring(0, 12)} is not running (state: ${inspect.State.Status})`)
          this._setContainerStatus(scheduledImage, 'crashed')

          if (inspect.State.Restarting) {
            console.log('🔄 Docker restart policy is restarting the container...')
          } else {
            console.log('🔄 Container stopped unexpectedly — restarting...')
            try {
              await container.start()
              console.log('✅ Container restarted successfully')
              this._setContainerStatus(scheduledImage, 'running')
            } catch (restartErr) {
              console.error('❌ Failed to restart container:', restartErr.message)
            }
          }
        }
      } catch (error) {
        console.error('❌ Health check error:', error.message)
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
      console.log(`📦 Would deploy '${scheduledImage}' but Docker is not available`)
      this._setContainerStatus(scheduledImage, 'pending')
      return
    }

    this.docker.pull(scheduledImage, (err, stream) => {
      if (err) {
        console.error(`Error pulling image '${scheduledImage}':`, err.message)
        console.error('Make sure Docker is running and the image name is correct.')
        return
      }

      if (!stream) {
        console.error(`No stream returned when pulling image '${scheduledImage}'`)
        return
      }

      console.log('')

      this.docker.modem.followProgress(stream, finished.bind(this), progress)

      function progress(event) {
        console.log(`${event.status}${event.id && ` ID: ${event.id}` || ''}`)
      }

      async function finished() {
        console.log('')

        try {
          const imageInfo = await this.docker.getImage(scheduledImage).inspect()
          await ipfs.pinImageManifest(scheduledImage, imageInfo)
        } catch (_) {}

        const containers = await this.docker.listContainers()

        console.log(`Starting up a container with the image '${scheduledImage}'.`)

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
                console.log(`📋 Using port mapping from contract: ${JSON.stringify(ports)}`)
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
                  console.log(`📋 Detected ports from image metadata: ${JSON.stringify(ports)}`)
                }
              } catch (_) {}
            }
            if (ports.length === 0) {
              ports = [{ host: 8080, container: 8080 }]
              console.log(`⚠️  No port info found for '${scheduledImage}', defaulting to 8080`)
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

            console.log('Successfully created a new container and binded it to the scheduler.')
          } else {
            container = this.docker.getContainer(containerStatus['Id'])
            console.log('Found a stopped container; started it and binded it to the scheduler.')
          }

          const oldContainer = this.container
          if (oldContainer) {
            console.log('Stopping and removing prior image binded to the scheduler.')
            await oldContainer.stop()
            await oldContainer.remove()
          }

          await container.start()

          console.log(`Node and scheduler is ready. Container ID is: ${container.id}`)

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

          console.log(`Found an existing running container; removing it...`)

          setTimeout(async () => await scheduleImage(), 3000)
        } else {
          await scheduleImage()
        }
      }
    })
  }

  async cleanup() {
    console.log('Scheduler stopping; stopping and removing binded container.')

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
