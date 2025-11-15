import React, { Component } from 'react'
import './App.css'
import Web3 from 'web3'
import styled from 'styled-components'
import * as d3 from 'd3'
import Canteen from './Canteen.json'
import _ from 'lodash'

const Page = styled.div`
background-color: white;
width: 100%;
height: 100%;
margin: 4em;
line-height: 1.4;
`

const Container = styled.div`
margin: auto;
position: relative;
width: 960px;`

const Title = styled.h1`
font-weight: 700;
font-size: 3em;
`

const StatusContainer = styled.div`
display: flex;
flex-direction: row;
flex-wrap: wrap;
margin-top: 0.5em;
margin-bottom: 0.5em;
padding-top: 1em;
padding-bottom: 1em;
padding-left: 0.5em;
background-color: #e6e6e6;
font-size: 0.8em;
color: black;

& > *:not(:last-child) {
margin-right: 0.5em;
}

& code {
  word-break: break-all;
}
`

const StatusColumn = styled.div`
flex: 1 1 220px;
min-width: 220px;
width: auto;
height: 100%;
display: flex;
align-items: center;
gap: 0.25em;
word-break: break-word;
`

const FormColumn = styled.div`
flex: 2;
width: 100%;
height: 100%;
text-align: right;
& > *{
margin-right: 1em;
}
`

const Subtitle = styled.h3`
font-weight: 300;
`

const Graph = styled.svg`
margin-top: 1em;
border: 1px solid black;
width: 960px;
height: 500px;
`

const Label = styled.b`
font-weight: 600;
`

class App extends Component {
  dragstarted(d) {
    if (!d3.event.active)
      this.force.alphaTarget(0.5).restart()
    d.fx = d.x
    d.fy = d.y
  }

  dragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
  }

  dragended(d) {
    if (!d3.event.active)
      this.force.alphaTarget(0.5)
    d.fx = null
    d.fy = null
  }

  constructor(props) {
    super(props)

  const CONTRACT_ADDRESS = process.env.REACT_APP_ETH_CONTRACT_ADDRESS || '0xCONTRACT_ADDRESS'
    const PROVIDER_URL = process.env.REACT_APP_ETH_RPC_URL || 'http://localhost:8545'
    this.CLUSTER_URL = process.env.REACT_APP_CLUSTER_URL || 'http://localhost:5001/cluster'

    this.state = {
      status: 'connecting...',
      contract: CONTRACT_ADDRESS,
      images: [],
      nodes: [],
      image: {
        add: {
          imageName: '',
          num: ''
        },
        remove: {
          imageName: ''
        }
      },
      // MetaMask state
      metaMaskAccount: null,
      metaMaskConnected: false,
      metaMaskChainId: null
    }

    // Initialize with read-only provider (Infura)
    this.readOnlyWeb3 = new Web3(new Web3.providers.HttpProvider(PROVIDER_URL))
    this.web3 = this.readOnlyWeb3
    this.contract = new this.web3.eth.Contract(Canteen.abi, this.state.contract)
    this.contractAddress = CONTRACT_ADDRESS

    this.width = 960
    this.height = 500
    this.force = d3.forceSimulation()
      .force('charge', d3.forceManyBody().strength(-700).distanceMin(100).distanceMax(1000))
      .force('link', d3.forceLink().id(d => d.index))
      .force('collide', d3.forceCollide(d => d.r + 8).iterations(16))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('y', d3.forceY(0.001))
      .force('x', d3.forceX(0.001))
  }

  async componentDidMount() {
    // Get cluster data and setup visualization.
    // Determine connectivity status first
    const statusParts = []
    try {
      const listening = await this.web3.eth.net.isListening()
      statusParts.push(`web3:${listening ? 'ok' : 'down'}`)
    } catch (e) {
      statusParts.push('web3:down')
    }

    try {
      await this.contract.methods.getImagesCount().call()
      statusParts.push('contract:ok')
    } catch (e) {
      statusParts.push('contract:err')
    }

    let data = { members: [] }
    try {
      data = await (await fetch(this.CLUSTER_URL)).json()
      statusParts.push('cluster:ok')
    } catch (e) {
      statusParts.push('cluster:down')
    }

    this.setState({ status: statusParts.join(' | ') })

    this.graph = d3.select(this.refs.graph)

    const nodes = []

    for (const node of data.members) {
      let data = {image: 'N/A', active: 'Down'}

      try {
        const details = await this.contract.methods.getMemberDetails(node).call()
        if (details) {
          data.image = details['0']
          data.active = details['1'] ? 'Up' : 'Down'
        }
      } catch (err) {
        console.log(err)
      }

      nodes.push({host: node, r: 80, ...data})
    }

    const links = []

    for (let x = 0; x < nodes.length; x++) {
      for (let y = 0; y < nodes.length; y++) {
        if (x === y) continue
        links.push({source: x, target: y})
      }
    }

    this.force.nodes(nodes).force('link').links(links)

    const link = this.graph.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#7d7d7d')

    const node = this.graph.selectAll('.node')
      .data(nodes).enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', this.dragstarted.bind(this))
        .on('drag', this.dragged.bind(this))
        .on('end', this.dragended.bind(this)))

    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', 'black')

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 0)
      .style('font-family', 'ProximaNova')
      .style('font-size', '1.25em')
      .style('font-weight', 600)
      .style('fill', 'white')
      .text(d => d.host)

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 16)
      .style('font-family', 'ProximaNova')
      .style('font-size', '0.8em')
      .style('font-weight', 600)
      .style('fill', '#e1e1e1')
      .text(d => d.image)

    this.force.on('tick', () => this.graph.call(this.updateGraph.bind(this)))

    // Get images.
    const deployedImages = []

    const imageCount = await this.contract.methods.getImagesCount().call()
    for (let i = 0; i < imageCount; i++) {
      const imageName = await this.contract.methods.images(i).call()
      const imageDetails = await this.contract.methods.getImageDetails(imageName).call()

      // Check if image is active.
      if (imageDetails['2'] && !_.find(deployedImages, name => name === imageName)) {
        deployedImages.push(imageName)
      }
    }

    this.setState({images: deployedImages, nodes})
  }

  updateNode(selection) {
    selection.attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')')
  }

  updateLink(selection) {
    selection.attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y)
  }

  updateGraph(selection) {
    selection.selectAll('.node')
      .call(this.updateNode.bind(this))
    selection.selectAll('.link')
      .call(this.updateLink.bind(this))
  }

  async connectMetaMask() {
    if (!window.ethereum) {
      alert('MetaMask is not installed! Please install MetaMask to interact with the blockchain.')
      return
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      
      // Initialize Web3 with MetaMask provider
      this.web3 = new Web3(window.ethereum)
      this.contract = new this.web3.eth.Contract(Canteen.abi, this.contractAddress)
      
      this.setState({
        metaMaskAccount: accounts[0],
        metaMaskConnected: true,
        metaMaskChainId: parseInt(chainId, 16)
      })

      // Check if on correct network (Sepolia = 11155111)
      const expectedChainId = parseInt(process.env.REACT_APP_ETH_CHAIN_ID || '11155111')
      if (parseInt(chainId, 16) !== expectedChainId) {
        alert(`Please switch to Sepolia testnet (Chain ID: ${expectedChainId})`)
      }

      console.log('✅ MetaMask connected:', accounts[0])
    } catch (error) {
      console.error('❌ MetaMask connection failed:', error)
      alert('Failed to connect to MetaMask: ' + error.message)
    }
  }

  async disconnectMetaMask() {
    // Switch back to read-only provider
    this.web3 = this.readOnlyWeb3
    this.contract = new this.web3.eth.Contract(Canteen.abi, this.contractAddress)
    
    this.setState({
      metaMaskAccount: null,
      metaMaskConnected: false,
      metaMaskChainId: null
    })
  }

  async registerNode() {
    if (!this.state.metaMaskConnected) {
      alert('Please connect MetaMask first!')
      return
    }

    try {
      // Get the node address from backend cluster API
      const response = await fetch(this.CLUSTER_URL)
      const clusterData = await response.json()
      const nodeAddress = clusterData.host // Format: "IP:PORT"

      console.log('Registering node:', nodeAddress)

      // Check if user is the contract owner
      const contractOwner = await this.contract.methods.owner().call()
      if (this.state.metaMaskAccount.toLowerCase() !== contractOwner.toLowerCase()) {
        alert('❌ Only the contract owner can register nodes.\n\nOwner: ' + contractOwner + '\nYour account: ' + this.state.metaMaskAccount)
        return
      }

      await this.contract.methods.addMember(nodeAddress).send({
        from: this.state.metaMaskAccount,
        gas: 300000
      })
      
      alert(`✅ Node registered successfully!\n\nNode: ${nodeAddress}\n\nThe backend will detect this in ~15 seconds and start scheduling containers.`)
    } catch (error) {
      console.error('❌ Registration failed:', error)
      
      // Check if already registered
      if (error.message.includes('revert') || error.message.includes('already active')) {
        alert('ℹ️ This node is already registered.\n\nYou can proceed to add/remove images.')
      } else if (error.message.includes('owner')) {
        alert('❌ Only the contract owner can register nodes.')
      } else {
        alert('Registration failed: ' + error.message)
      }
    }
  }

  async addImage() {
    if (!this.state.metaMaskConnected) {
      alert('Please connect MetaMask first!')
      return
    }

    const imageName = this.state.image.add.imageName
    const reps = parseInt(this.state.image.add.num)

    try {
      await this.contract.methods.addImage(imageName, reps).send({
        from: this.state.metaMaskAccount,
        gas: 500000
      })
      alert('✅ Image added successfully!')
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      alert('Transaction failed: ' + error.message)
    }
  }

  async removeImage() {
    if (!this.state.metaMaskConnected) {
      alert('Please connect MetaMask first!')
      return
    }

    const imageName = this.state.image.remove.imageName

    try {
      await this.contract.methods.removeImage(imageName).send({
        from: this.state.metaMaskAccount,
        gas: 500000
      })
      alert('✅ Image removed successfully!')
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      alert('Transaction failed: ' + error.message)
    }
  }

  render() {
    const {status, images, contract, nodes, metaMaskConnected, metaMaskAccount, metaMaskChainId} = this.state

    return (
      <Page>
        <Container>
          <Title>canteen.</Title>
          <Subtitle>A decentralized container orchestrator.</Subtitle>

          {/* MetaMask Connection Section */}
          <StatusContainer style={{backgroundColor: metaMaskConnected ? '#d4edda' : '#fff3cd'}}>
            <StatusColumn style={{flex: 2}}>
              <Label>🦊 MetaMask:</Label>
              {metaMaskConnected ? (
                <span>
                  Connected: <code>{metaMaskAccount && metaMaskAccount.substring(0, 6)}...{metaMaskAccount && metaMaskAccount.substring(38)}</code>
                  {metaMaskChainId && <span> (Chain: {metaMaskChainId})</span>}
                </span>
              ) : (
                <span>Not connected (read-only mode)</span>
              )}
            </StatusColumn>
            <FormColumn>
              {metaMaskConnected ? (
                <div>
                  <button onClick={this.registerNode.bind(this)} style={{backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', marginRight: '1em'}}>
                    📝 Register Node
                  </button>
                  <button onClick={this.disconnectMetaMask.bind(this)}>Disconnect</button>
                </div>
              ) : (
                <button onClick={this.connectMetaMask.bind(this)} style={{backgroundColor: '#f6851b', color: 'white', fontWeight: 'bold'}}>
                  Connect MetaMask
                </button>
              )}
            </FormColumn>
          </StatusContainer>

          <StatusContainer>
            <StatusColumn><Label>status:</Label> {status}</StatusColumn>
            <StatusColumn style={{flex: 2}}><Label>contract:</Label> <code>{contract}</code></StatusColumn>
            <StatusColumn style={{flex: 2}}><Label>deployed:</Label> {images.length == 0 && 'N/A' || images.join(', ')}
            </StatusColumn>
            <StatusColumn><Label>num servers:</Label> {nodes.length}</StatusColumn>
          </StatusContainer>

          <Graph>
            <g ref='graph'></g>
          </Graph>
          <div>
            <StatusContainer>
              <StatusColumn><Label>Add Image</Label></StatusColumn>
              <FormColumn>
                <input type='text' placeholder={'Image name'} onChange={event => {
                  this.setState({image: {add: {...this.state.image.add, imageName: event.target.value}}})
                }}/>
                <input type='text' placeholder={'# of replicas'} onChange={event => {
                  this.setState({image: {add: {...this.state.image.add, num: event.target.value}}})
                }}/>
                <button onClick={this.addImage.bind(this)}> Add image</button>
              </FormColumn>
            </StatusContainer>
            <StatusContainer>
              <StatusColumn><Label>Remove Image</Label></StatusColumn>
              <FormColumn>
                <input type='text' placeholder={'Image name'} onChange={event => {
                  this.setState({image: {remove: {imageName: event.target.value}}})
                }}/>

                <button onClick={this.removeImage.bind(this)}> Remove image</button>
              </FormColumn>
            </StatusContainer>
          </div>
        </Container>
      </Page>
    )
  }
}

export default App
