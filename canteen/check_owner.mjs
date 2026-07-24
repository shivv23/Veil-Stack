// SPDX-License-Identifier: MIT
import { Web3 } from 'web3'
import fs from 'fs'
const artifact = JSON.parse(fs.readFileSync('./build/contracts/Canteen.json'))
const web3 = new Web3('https://api.calibration.node.glif.io/rpc/v1')
const contract = new web3.eth.Contract(artifact.abi, '0x686d5d622298cfca880168Badf83ac3F71C4a33A')
const owner = await contract.methods.owner().call()
console.log('Owner:', owner)
const nodeCount = await contract.methods.getNodeCount().call()
console.log('Node count:', nodeCount.toString())
const memberCount = await contract.methods.getMembersCount().call()
console.log('Member count:', memberCount.toString())
