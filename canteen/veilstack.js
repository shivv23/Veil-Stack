#!/usr/bin/env node

import { Web3 } from 'web3'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const Canteen = JSON.parse(fs.readFileSync(path.resolve('./dashboard/src/Canteen.json'), 'utf-8'))

const CHAIN_RPC = process.env.FIL_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
const CONTRACT_ADDRESS = process.env.FIL_CONTRACT_ADDRESS
const WEB_PORT = process.env.WEB_PORT || 5001

const web3 = new Web3(new Web3.providers.HttpProvider(CHAIN_RPC))
const contract = new web3.eth.Contract(Canteen.abi, CONTRACT_ADDRESS)

const args = process.argv.slice(2)
const command = args[0]

const commands = {
  async status() {
    console.log('\n  VeilStack Status')
    console.log('  ' + '='.repeat(50))

    try {
      const blockNumber = await web3.eth.getBlockNumber()
      console.log(`  Chain:      Filecoin Calibration (block ${blockNumber})`)
    } catch (e) {
      console.log('  Chain:      unreachable')
      return
    }

    console.log(`  Contract:   ${CONTRACT_ADDRESS}`)

    try {
      const members = await contract.methods.getMembersCount().call()
      const images = await contract.methods.getImagesCount().call()
      console.log(`  Members:    ${members}`)
      console.log(`  Images:     ${images}`)

      const imageList = await contract.methods.getImages().call()
      for (const img of imageList) {
        const details = await contract.methods.getImageDetails(img).call()
        const active = details['2'] ? 'active' : 'inactive'
        console.log(`    - ${img}  replicas=${details['0']}  deployed=${details['1']}  (${active})`)
      }

      const memberList = await contract.methods.members(0).call().catch(() => null)
      if (memberList) {
        for (let i = 0; i < members; i++) {
          const host = await contract.methods.members(i).call()
          const details = await contract.methods.getMemberDetails(host).call()
          const status = await contract.methods.getMemberStatus(host).call()
          const active = details['1'] ? 'active' : 'inactive'
          const image = details['0'] || '(none)'
          const state = status['1'] || 'unreported'
          console.log(`    - ${host}  image=${image}  state=${state}  (${active})`)
        }
      }
    } catch (e) {
      console.log(`  Error reading contract: ${e.message}`)
    }

    try {
      const res = await fetch(`http://localhost:${WEB_PORT}/status`)
      const data = await res.json()
      console.log('\n  Backend')
      console.log('  ' + '-'.repeat(50))
      console.log(`  Host:       ${data.host}`)
      console.log(`  Docker:     ${data.docker ? 'connected' : 'not connected'}`)
      console.log(`  Container:  ${data.container.image || 'none'} (${data.container.state})`)
      console.log(`  Mode:       ${data.readOnlyMode ? 'read-only' : 'legacy (private key)'}`)
    } catch (e) {
      console.log('\n  Backend:    not reachable')
    }
    console.log('')
  },

  async containers() {
    console.log('\n  Docker Containers')
    console.log('  ' + '='.repeat(50))

    try {
      const res = await fetch(`http://localhost:${WEB_PORT}/containers`)
      const data = await res.json()

      if (!data.dockerAvailable) {
        console.log('  Docker not available on backend')
        return
      }

      if (data.containers.length === 0) {
        console.log('  No containers running')
        return
      }

      for (const c of data.containers) {
        const ports = c.ports.filter(p => p.public).map(p => `${p.public}->${p.private}`).join(', ')
        console.log(`  ${c.id}  ${c.image.padEnd(20)}  ${c.state.padEnd(10)}  ${ports}`)
      }
    } catch (e) {
      console.log(`  Backend not reachable: ${e.message}`)
    }
    console.log('')
  },

  async nodes() {
    console.log('\n  Cluster Nodes')
    console.log('  ' + '='.repeat(50))

    try {
      const res = await fetch(`http://localhost:${WEB_PORT}/cluster`)
      const data = await res.json()
      console.log(`  Host:      ${data.host}`)
      console.log(`  PeerId:    ${data.peerId}`)
      console.log(`  Peers:     ${data.peers}`)
      console.log(`  Members:   ${data.members.join(', ')}`)
      console.log(`  Addresses:`)
      for (const addr of data.multiaddrs) {
        console.log(`    ${addr}`)
      }
    } catch (e) {
      console.log(`  Backend not reachable: ${e.message}`)
    }
    console.log('')
  },

  async 'add-image'() {
    const imageName = args[1]
    const replicas = parseInt(args[2]) || 1

    if (!imageName) {
      console.log('\n  Usage: veilstack add-image <name> [replicas]')
      console.log('  Example: veilstack add-image nginx:latest 2\n')
      return
    }

    if (!CONTRACT_ADDRESS) {
      console.log('  Error: FIL_CONTRACT_ADDRESS not set in .env')
      return
    }

    console.log(`\n  Adding image: ${imageName} (replicas: ${replicas})`)
    console.log(`  Contract: ${CONTRACT_ADDRESS}`)
    console.log('  Note: This requires MetaMask to sign the transaction.')
    console.log('  Use the dashboard at http://localhost:3000 to add images via MetaMask.\n')

    try {
      const imageDetails = await contract.methods.getImageDetails(imageName).call()
      if (imageDetails['2']) {
        console.log(`  Image "${imageName}" already exists (replicas=${imageDetails['0']}, deployed=${imageDetails['1']})`)
      } else {
        console.log(`  Image "${imageName}" not found on contract — needs to be added via MetaMask`)
      }
    } catch (e) {
      console.log(`  Image "${imageName}" not found on contract — needs to be added via MetaMask`)
    }
  },

  async 'remove-image'() {
    const imageName = args[1]

    if (!imageName) {
      console.log('\n  Usage: veilstack remove-image <name>')
      console.log('  Example: veilstack remove-image nginx:latest\n')
      return
    }

    console.log(`\n  Removing image: ${imageName}`)
    console.log('  Note: This requires MetaMask to sign the transaction.')
    console.log('  Use the dashboard at http://localhost:3000 to remove images via MetaMask.\n')
  },

  async help() {
    console.log(`
  VeilStack CLI - Decentralized Container Orchestrator

  Usage: veilstack <command> [options]

  Commands:
    status              Show chain, contract, members, images, and backend status
    containers          List running Docker containers managed by the scheduler
    nodes               Show cluster topology and libp2p peer info
    add-image <n> [r]   Show info about adding an image (use dashboard for tx)
    remove-image <n>    Show info about removing an image (use dashboard for tx)
    help                Show this help message

  Examples:
    veilstack status
    veilstack containers
    veilstack nodes
    veilstack add-image nginx:latest 2

  Configuration:
    Set FIL_CONTRACT_ADDRESS and FIL_RPC_URL in .env
    Backend must be running on http://localhost:${WEB_PORT}
  `)
  }
}

if (!command || !commands[command]) {
  commands.help()
} else {
  commands[command]().catch(e => {
    console.error(`Error: ${e.message}`)
    process.exit(1)
  })
}
