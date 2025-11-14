import Web3 from 'web3'
import fs from 'fs'
import path from 'path'
const Canteen = JSON.parse(fs.readFileSync(path.resolve('./build/contracts/Canteen.json'), 'utf-8'))
import Docker from 'dockerode'
import _ from 'lodash'
import Cluster from './cluster.js'

class CanteenScheduler {
  async start(provider, contractAddress, privateKey, dockerPath) {
    const web3 = new Web3(provider)
    // Derive an account from the provided private key and add it to the wallet
    const acct = privateKey ? web3.eth.accounts.privateKeyToAccount(privateKey) : web3.eth.accounts.create()
    // Add to wallet to enable signing transactions with web3 v4
    web3.eth.accounts.wallet.add(acct)
    // Keep a plain address string handy
    const fromAddress = acct.address

    // Instantiate contract with a default from address
    const contract = new web3.eth.Contract(Canteen.abi, contractAddress, { from: fromAddress })

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
      await this.registerNode()
      setInterval(async () => await this.loop(), 1000)
    } catch (error) {
      console.error(error)
    }

    // await this.updateScheduler('rethinkdb:latest')
    // await this.updateScheduler('crccheck/hello-world')
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
            // Create a new container if not exist.

            const port = scheduledImage.includes("hello-world") ? 8000 : 8080;

            container = await this.docker.createContainer({
              Image: scheduledImage,
              ExposedPorts: {
                [`${port}/tcp`]: {},

              },
              HostConfig: {
                // ExposeAllPorts: true,
                PortBindings: {
                  [`${port}/tcp`]: [{HostPort: `${port}`}],
                }
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