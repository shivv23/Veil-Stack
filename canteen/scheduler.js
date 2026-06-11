import { Web3 } from 'web3'
import fs from 'fs'
import path from 'path'
const Canteen = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/Canteen.json'), 'utf-8'))
import Docker from 'dockerode'
import _ from 'lodash'
import Cluster from './cluster.js'

class CanteenScheduler {
  async start(provider, contractAddress, privateKey, dockerPath, readOnlyMode = false) {
    const web3 = new Web3(provider)
    
    this.readOnlyMode = readOnlyMode || !privateKey
    
    let acct, fromAddress
    
    if (!this.readOnlyMode) {
      // Legacy mode: Use private key for auto-registration
      acct = web3.eth.accounts.privateKeyToAccount(privateKey)
      web3.eth.accounts.wallet.add(acct)
      fromAddress = acct.address
      console.log('🔑 Scheduler running in LEGACY mode with private key')
    } else {
      // Read-only mode: No private key, listen to events only
      console.log('👁️  Scheduler running in READ-ONLY mode')
      console.log('📱 Node registration must be done via MetaMask frontend')
      fromAddress = null // No account needed for read-only
    }

    // Instantiate contract
    const contract = new web3.eth.Contract(Canteen.abi, contractAddress, fromAddress ? { from: fromAddress } : {})

    // Auto-detect Docker socket path
    if (!dockerPath) {
      const desktopSocket = `${process.env.HOME}/.docker/desktop/docker.sock`
      const defaultSocket = '/var/run/docker.sock'
      
      if (fs.existsSync(desktopSocket)) {
        dockerPath = desktopSocket
        console.log('Using Docker Desktop socket:', dockerPath)
      } else if (fs.existsSync(defaultSocket)) {
        dockerPath = defaultSocket
        console.log('Using default Docker socket:', dockerPath)
      } else {
        throw new Error('Could not find Docker socket. Is Docker running?')
      }
    }

    const docker = new Docker({socketPath: dockerPath})

    this.docker = docker
    this.contract = contract
    this.account = acct
    this.accountAddress = fromAddress
    this.web3 = web3

    try {
      if (!this.readOnlyMode) {
        // Legacy mode: Auto-register node
        await this.registerNode()
        setInterval(async () => await this.loop(), 1000)
      } else {
        // Read-only mode: Just listen to events
        console.log('⏳ Waiting for node registration via MetaMask...')
        this.listenToEvents()
      }
    } catch (error) {
      console.error(error)
    }

    // await this.updateScheduler('rethinkdb:latest')
    // await this.updateScheduler('crccheck/hello-world')
  }

  /**
   * Listen to contract events (Read-only mode)
   * Uses polling since HTTP provider doesn't support subscriptions
   */
  listenToEvents() {
    if (!this.contract) {
      console.error('❌ Contract not initialized')
      return
    }

    console.log('👂 Polling for contract events (HTTP provider)...')
    console.log('ℹ️  Checking for new events every 15 seconds')
    
    // Track last processed block
    this.lastProcessedBlock = 0
    
    // Initialize and start polling
    this.pollForEvents()
    
    // Poll every 15 seconds
    this.eventPollingInterval = setInterval(() => {
      this.pollForEvents()
    }, 15000)
  }

  async pollForEvents() {
    try {
      // Get current block number
      const currentBlock = await this.web3.eth.getBlockNumber()
      
      // First time, just set the starting block
      if (this.lastProcessedBlock === 0) {
        this.lastProcessedBlock = Number(currentBlock) - 1
        console.log(`✅ Started monitoring from block ${this.lastProcessedBlock}`)
        return
      }

      // Get events from last processed block to current
      const events = await this.contract.getPastEvents('allEvents', {
        fromBlock: this.lastProcessedBlock + 1,
        toBlock: currentBlock
      })

      // Process each event
      for (const event of events) {
        console.log(`📡 Event detected: ${event.event} (Block ${event.blockNumber})`)
        
        if (event.event === 'MemberJoin') {
          const { host } = event.returnValues
          console.log(`➕ MemberJoin: ${host}`)
          if (host === Cluster.getHost()) {
            console.log('✅ This node has been registered!')
            // Start the scheduling loop
            if (!this.loopInterval) {
              this.loopInterval = setInterval(async () => await this.loop(), 1000)
            }
          }
        } else if (event.event === 'MemberLeave') {
          const { host } = event.returnValues
          console.log(`➖ MemberLeave: ${host}`)
          if (host === Cluster.getHost()) {
            console.log('This node has been removed')
            // Stop the scheduling loop
            if (this.loopInterval) {
              clearInterval(this.loopInterval)
              this.loopInterval = null
            }
            await this.cleanup()
          }
        } else if (event.event === 'MemberImageUpdate') {
          const { host, image } = event.returnValues
          console.log(`🔄 MemberImageUpdate: ${host} -> ${image}`)
          if (host === Cluster.getHost()) {
            console.log(`📦 New image assigned to this node: ${image}`)
            // The loop will pick this up automatically
          }
        }
      }

      // Update last processed block
      this.lastProcessedBlock = Number(currentBlock)
      
    } catch (error) {
      console.error('❌ Error polling events:', error.message)
    }
  }

  async loop() {
    // Loops to check if scheduled image for this given node changed.

  const {contract, web3} = this

    // In web3 v4, when a Solidity function isn't explicitly marked view/constant,
    // .call() may require a from address. Provide it to avoid "Contract \"from\" address not specified".
    const details = await contract.methods
      .getMemberDetails(Cluster.getHost())
      .call({ from: this.accountAddress })
    const scheduledImage = details['0']

    // Check if scheduled image is available.
    if (!details) return
    // Check if scheduled image is unique.
    if (this.scheduledImage === scheduledImage) return

    if (this.scheduledImage && this.scheduledImage.length > 0 && scheduledImage.length === 0) {
      // Node no longer has to schedule. Clean up.

      await this.cleanup()
    } else {
      // Update image.
      await this.updateScheduler(scheduledImage)
    }
  }

  async registerNode() {
    const {contract, account, web3} = this

    const host = Cluster.getHost()

    // Pre-check membership to avoid revert on re-register
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
        // Ganache CLI v6 is legacy (no EIP-1559). Provide a legacy gasPrice.
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

  async updateScheduler(scheduledImage) {
    this.scheduledImage = scheduledImage
    if (this.scheduledImage.length === 0) return

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

        const containers = await this.docker.listContainers()

        console.log(`Starting up a container with the image '${scheduledImage}'.`)

        const containerStatus = _.find(containers, {Image: scheduledImage})

        const scheduleImage = async () => {
          const containers = await this.docker.listContainers()
          const containerStatus = _.find(containers, {Image: scheduledImage})

          let container
          if (!containerStatus) {
            // Detect ports from contract mappings or Docker image metadata
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
              }
            })

            console.log('Successfully created a new container and binded it to the scheduler.')
          } else {
            // Get reference to the container.

            container = this.docker.getContainer(containerStatus['Id'])
            console.log('Found a stopped container; started it and binded it to the scheduler.')
          }

          // Wipe out the old container.
          const oldContainer = this.container
          if (oldContainer) {
            console.log('Stopping and removing prior image binded to the scheduler.')
            await oldContainer.stop()
            await oldContainer.remove()
          }

          // Run the new (or paused) container.
          await container.start()

          console.log(`Node and scheduler is ready. Container ID is: ${container.id}`)

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

    // Stop event polling
    if (this.eventPollingInterval) {
      clearInterval(this.eventPollingInterval)
      this.eventPollingInterval = null
    }

    if (this.container) {
      await this.container.stop()
      await this.container.remove()

      this.scheduledImage = ''
      this.container = null
    }
  }
}

export default new

CanteenScheduler()