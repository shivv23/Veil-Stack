// SPDX-License-Identifier: MIT
import React, { Component } from 'react'
import './App.css'
import Web3 from 'web3'
import styled, { keyframes } from 'styled-components'
import * as d3 from 'd3'
import Canteen from './Canteen.json'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%);
  padding: 2rem;
`

const Wrapper = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`

const Logo = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
`

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin: 0;
`

const Subtitle = styled.p`
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
`

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  animation: ${fadeIn} 0.3s ease-out;
`

const CardLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
`

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
`

const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const StatusKey = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const StatusValue = styled.span`
  font-size: 0.82rem;
  color: #e0e4ef;
  font-weight: 500;
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  word-break: break-all;
`

const StatusDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
  background: ${props => {
    if (props.$ok) return '#34d399'
    if (props.$warn) return '#fbbf24'
    if (props.$err) return '#f87171'
    return '#6b7280'
  }};
  box-shadow: 0 0 6px ${props => {
    if (props.$ok) return 'rgba(52,211,153,0.4)'
    if (props.$warn) return 'rgba(251,191,36,0.4)'
    if (props.$err) return 'rgba(248,113,113,0.4)'
    return 'transparent'
  }};
  animation: ${pulse} 2s ease-in-out infinite;
`

const WalletBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`

const WalletInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const WalletAddress = styled.code`
  font-size: 0.78rem;
  color: #818cf8;
  background: rgba(129, 140, 248, 0.08);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
`

const ChainBadge = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${props => props.$connected ? '#34d399' : '#6b7280'};
  background: ${props => props.$connected ? 'rgba(52,211,153,0.1)' : 'rgba(107,114,128,0.1)'};
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Button = styled.button`
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.01em;

  ${props => props.$primary ? `
    background: #818cf8;
    color: #0a0e1a;
    &:hover { background: #a5b4fc; transform: translateY(-1px); }
  ` : props.$danger ? `
    background: rgba(248,113,113,0.12);
    color: #f87171;
    border: 1px solid rgba(248,113,113,0.2);
    &:hover { background: rgba(248,113,113,0.2); }
  ` : props.$green ? `
    background: rgba(52,211,153,0.12);
    color: #34d399;
    border: 1px solid rgba(52,211,153,0.2);
    &:hover { background: rgba(52,211,153,0.2); }
  ` : `
    background: rgba(255,255,255,0.06);
    color: #e0e4ef;
    border: 1px solid rgba(255,255,255,0.08);
    &:hover { background: rgba(255,255,255,0.1); }
  `}
`

const GraphContainer = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  overflow: hidden;
`

const Graph = styled.svg`
  display: block;
  width: 100%;
  height: 420px;
  background: radial-gradient(ellipse at center, rgba(129,140,248,0.03) 0%, transparent 70%);
  border-radius: 8px;
`

const FormRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  min-width: 140px;
`

const FormLabel = styled.label`
  font-size: 0.65rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const Input = styled.input`
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 0.8rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #e0e4ef;
  outline: none;
  transition: border-color 0.15s ease;

  &::placeholder { color: #4b5563; }
  &:focus { border-color: rgba(129,140,248,0.4); }
`

const ContainerStatusDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.5rem;
  flex-shrink: 0;
  background: ${props => {
    if (props.$state === 'running') return '#34d399'
    if (props.$state === 'crashed') return '#f87171'
    return '#fbbf24'
  }};
  box-shadow: 0 0 8px ${props => {
    if (props.$state === 'running') return 'rgba(52,211,153,0.5)'
    if (props.$state === 'crashed') return 'rgba(248,113,113,0.5)'
    return 'rgba(251,191,36,0.4)'
  }};
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
    this.graphRef = React.createRef()

    const CONTRACT_ADDRESS = process.env.REACT_APP_FIL_CONTRACT_ADDRESS || '0xCONTRACT_ADDRESS'
    const PROVIDER_URL = process.env.REACT_APP_FIL_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
    this.CLUSTER_URL = process.env.REACT_APP_CLUSTER_URL || 'http://localhost:5001/cluster'
    this.STATUS_URL = (process.env.REACT_APP_CLUSTER_URL || 'http://localhost:5001').replace('/cluster', '') + '/status'

    this.state = {
      status: 'connecting...',
      contract: CONTRACT_ADDRESS,
      images: [],
      nodes: [],
      containerStatus: { image: '', state: 'unknown', lastReported: 0 },
      image: {
        add: {
          imageName: '',
          num: ''
        },
        remove: {
          imageName: ''
        }
      },
      metaMaskAccount: null,
      metaMaskConnected: false,
      metaMaskChainId: null
    }

    this.readOnlyWeb3 = new Web3(new Web3.providers.HttpProvider(PROVIDER_URL))
    this.web3 = this.readOnlyWeb3
    this.contract = new this.web3.eth.Contract(Canteen.abi, this.state.contract)
    this.contractAddress = CONTRACT_ADDRESS

    this.width = 960
    this.height = 420
    this.force = d3.forceSimulation()
      .force('charge', d3.forceManyBody().strength(-700).distanceMin(100).distanceMax(1000))
      .force('link', d3.forceLink().id(d => d.index))
      .force('collide', d3.forceCollide(d => d.r + 8).iterations(16))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('y', d3.forceY(0.001))
      .force('x', d3.forceX(0.001))
  }

  async componentDidMount() {
    const statusParts = []
    try {
      const listening = await this.web3.eth.net.isListening()
      statusParts.push(listening ? 'connected' : 'down')
    } catch (e) {
      statusParts.push('down')
    }

    let contractOk = false
    try {
      await this.contract.methods.getImagesCount().call()
      contractOk = true
      statusParts.push('contract:ok')
    } catch (e) {
      statusParts.push('contract:err')
    }

    let data = { members: [] }
    let clusterOk = false
    try {
      data = await (await fetch(this.CLUSTER_URL)).json()
      clusterOk = true
      statusParts.push('cluster:ok')
    } catch (e) {
      statusParts.push('cluster:down')
    }

    this.setState({ status: statusParts.join(' · ') })

    this.graph = d3.select(this.graphRef.current)

    const nodes = []

    for (const node of data.members) {
      let data = {image: 'N/A', active: 'Down'}

      try {
        const details = await this.contract.methods.getMemberDetails(node).call()
        if (details) {
          data.image = details['0']
          data.active = details['1'] ? 'Up' : 'Down'
        }
      } catch (err) {}

      nodes.push({host: node, r: 60, ...data})
    }

    const links = []

    for (let x = 0; x < nodes.length; x++) {
      for (let y = 0; y < nodes.length; y++) {
        if (x === y) continue
        links.push({source: x, target: y})
      }
    }

    this.force.nodes(nodes).force('link').links(links)

    const defs = this.graph.append('defs')

    const glowFilter = defs.append('filter').attr('id', 'glow')
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = glowFilter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const gradient = defs.append('linearGradient')
      .attr('id', 'nodeGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%')
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#818cf8')
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1')

    const link = this.graph.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', 'rgba(129,140,248,0.08)')
      .attr('stroke-width', 1)

    const node = this.graph.selectAll('.node')
      .data(nodes).enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', this.dragstarted.bind(this))
        .on('drag', this.dragged.bind(this))
        .on('end', this.dragended.bind(this)))

    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', 'url(#nodeGrad)')
      .attr('filter', 'url(#glow)')
      .attr('opacity', 0.9)

    node.append('circle')
      .attr('r', d => d.r + 2)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(129,140,248,0.15)')
      .attr('stroke-width', 1)

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .style('font-family', "'JetBrains Mono', 'SF Mono', monospace")
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#ffffff')
      .text(d => {
        const parts = d.host.split(':')
        return parts[0]
      })

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 12)
      .style('font-family', "'JetBrains Mono', 'SF Mono', monospace")
      .style('font-size', '9px')
      .style('fill', 'rgba(255,255,255,0.5)')
      .text(d => d.image.length > 16 ? d.image.substring(0, 14) + '..' : d.image)

    this.force.on('tick', () => this.graph.call(this.updateGraph.bind(this)))

    const deployedImages = []

    const imageCount = await this.contract.methods.getImagesCount().call()
    for (let i = 0; i < imageCount; i++) {
      const imageName = await this.contract.methods.images(i).call()
      const imageDetails = await this.contract.methods.getImageDetails(imageName).call()

      if (imageDetails['2'] && !deployedImages.includes(imageName)) {
        deployedImages.push(imageName)
      }
    }

    this.setState({images: deployedImages, nodes})

    try {
      const statusRes = await fetch(this.STATUS_URL)
      const statusData = await statusRes.json()
      this.setState({ containerStatus: statusData.container || { image: '', state: 'unknown', lastReported: 0 } })
    } catch (e) {}

    this.statusInterval = setInterval(async () => {
      try {
        const statusRes = await fetch(this.STATUS_URL)
        const statusData = await statusRes.json()
        this.setState({ containerStatus: statusData.container || { image: '', state: 'unknown', lastReported: 0 } })
      } catch (e) {}
    }, 10000)
  }

  componentWillUnmount() {
    if (this.statusInterval) clearInterval(this.statusInterval)
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
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      
      this.web3 = new Web3(window.ethereum)
      this.contract = new this.web3.eth.Contract(Canteen.abi, this.contractAddress)
      
      this.setState({
        metaMaskAccount: accounts[0],
        metaMaskConnected: true,
        metaMaskChainId: parseInt(chainId, 16)
      })

      const expectedChainId = parseInt(process.env.REACT_APP_FIL_CHAIN_ID || '314159')
      if (parseInt(chainId, 16) !== expectedChainId) {
        alert(`Please switch to Filecoin Calibration (Chain ID: ${expectedChainId})`)
      }
    } catch (error) {
      console.error('MetaMask connection failed:', error)
      alert('Failed to connect to MetaMask: ' + error.message)
    }
  }

  async disconnectMetaMask() {
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
      const response = await fetch(this.CLUSTER_URL)
      const clusterData = await response.json()
      const nodeAddress = clusterData.host

      const contractOwner = await this.contract.methods.owner().call()
      if (this.state.metaMaskAccount.toLowerCase() !== contractOwner.toLowerCase()) {
        alert('Only the contract owner can register nodes.\n\nOwner: ' + contractOwner + '\nYour account: ' + this.state.metaMaskAccount)
        return
      }

      await this.contract.methods.addMember(nodeAddress).send({
        from: this.state.metaMaskAccount,
        gas: 15000000
      })
      
      alert(`Node registered successfully!\n\nNode: ${nodeAddress}\n\nThe backend will detect this in ~15 seconds and start scheduling containers.`)
    } catch (error) {
      console.error('Registration failed:', error)
      
      if (error.message.includes('revert') || error.message.includes('already active')) {
        alert('This node is already registered.\n\nYou can proceed to add/remove images.')
      } else if (error.message.includes('owner')) {
        alert('Only the contract owner can register nodes.')
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
        gas: 15000000
      })
      alert('Image added successfully!')
    } catch (error) {
      console.error('Transaction failed:', error)
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
        gas: 15000000
      })
      alert('Image removed successfully!')
    } catch (error) {
      console.error('Transaction failed:', error)
      alert('Transaction failed: ' + error.message)
    }
  }

  render() {
    const {status, images, contract, nodes, metaMaskConnected, metaMaskAccount, metaMaskChainId, containerStatus} = this.state

    return (
      <Page>
        <Wrapper>
          <Header>
            <div>
              <Logo>
                <Title>Veil Stack</Title>
              </Logo>
              <Subtitle>Decentralized container orchestration on Filecoin</Subtitle>
            </div>
            <Subtitle>
              <a
                href={`https://calibration.filfox.info/en/address/${contract}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{color: '#818cf8', textDecoration: 'none'}}
              >
                View Contract ↗
              </a>
            </Subtitle>
          </Header>

          <Card>
            <CardLabel>Network Status</CardLabel>
            <StatusRow>
              <StatusItem>
                <StatusKey>RPC</StatusKey>
                <StatusValue>
                  <StatusDot $ok={status.includes('connected')} $err={status.includes('down') && !status.includes('cluster:down')} />
                  {status.split(' · ')[0] || 'idle'}
                </StatusValue>
              </StatusItem>
              <StatusItem>
                <StatusKey>Contract</StatusKey>
                <StatusValue>
                  <StatusDot $ok={status.includes('contract:ok')} $err={status.includes('contract:err')} />
                  {status.includes('contract:ok') ? 'responsive' : 'error'}
                </StatusValue>
              </StatusItem>
              <StatusItem>
                <StatusKey>Cluster</StatusKey>
                <StatusValue>
                  <StatusDot $ok={status.includes('cluster:ok')} $err={status.includes('cluster:down')} />
                  {status.includes('cluster:ok') ? `${nodes.length} node${nodes.length !== 1 ? 's' : ''}` : 'offline'}
                </StatusValue>
              </StatusItem>
              <StatusItem>
                <StatusKey>Deployed Images</StatusKey>
                <StatusValue>
                  {images.length > 0 ? images.join(', ') : 'none'}
                </StatusValue>
              </StatusItem>
            </StatusRow>
          </Card>

          <Card>
            <CardLabel>Container</CardLabel>
            <StatusRow>
              <StatusItem>
                <StatusValue style={{display: 'flex', alignItems: 'center'}}>
                  <ContainerStatusDot $state={containerStatus.state} />
                  {containerStatus.image || 'No image scheduled'}
                </StatusValue>
              </StatusItem>
              <StatusItem>
                <StatusKey>State</StatusKey>
                <StatusValue>{containerStatus.state}</StatusValue>
              </StatusItem>
              {containerStatus.lastReported > 0 && (
                <StatusItem>
                  <StatusKey>Last Report</StatusKey>
                  <StatusValue>{new Date(containerStatus.lastReported).toLocaleTimeString()}</StatusValue>
                </StatusItem>
              )}
            </StatusRow>
          </Card>

          <Card>
            <CardLabel>Wallet</CardLabel>
            <WalletBar>
              <WalletInfo>
                {metaMaskConnected ? (
                  <>
                    <StatusDot $ok />
                    <WalletAddress>{metaMaskAccount && metaMaskAccount.substring(0, 6)}...{metaMaskAccount && metaMaskAccount.substring(38)}</WalletAddress>
                    {metaMaskChainId && <ChainBadge $connected>{metaMaskChainId === 314159 ? 'Calibration' : `Chain ${metaMaskChainId}`}</ChainBadge>}
                  </>
                ) : (
                  <>
                    <StatusDot />
                    <span style={{color: '#6b7280', fontSize: '0.82rem'}}>Read-only mode — connect wallet to manage cluster</span>
                  </>
                )}
              </WalletInfo>
              <ButtonGroup>
                {metaMaskConnected ? (
                  <>
                    <Button $green onClick={this.registerNode.bind(this)}>Register Node</Button>
                    <Button onClick={this.disconnectMetaMask.bind(this)}>Disconnect</Button>
                  </>
                ) : (
                  <Button $primary onClick={this.connectMetaMask.bind(this)}>Connect Wallet</Button>
                )}
              </ButtonGroup>
            </WalletBar>
          </Card>

          <GraphContainer>
            <Graph>
              <g ref={this.graphRef}></g>
            </Graph>
          </GraphContainer>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <Card>
              <CardLabel>Add Image</CardLabel>
              <FormRow>
                <FormGroup>
                  <FormLabel>Image Name</FormLabel>
                  <Input
                    type="text"
                    placeholder="e.g. nginx:latest"
                    value={this.state.image.add.imageName}
                    onChange={event => {
                      this.setState({image: {add: {...this.state.image.add, imageName: event.target.value}}})
                    }}
                  />
                </FormGroup>
                <FormGroup style={{flex: '0 0 100px'}}>
                  <FormLabel>Replicas</FormLabel>
                  <Input
                    type="text"
                    placeholder="1"
                    value={this.state.image.add.num}
                    onChange={event => {
                      this.setState({image: {add: {...this.state.image.add, num: event.target.value}}})
                    }}
                  />
                </FormGroup>
                <Button $primary onClick={this.addImage.bind(this)} style={{height: '36px', alignSelf: 'flex-end'}}>Add</Button>
              </FormRow>
            </Card>

            <Card>
              <CardLabel>Remove Image</CardLabel>
              <FormRow>
                <FormGroup>
                  <FormLabel>Image Name</FormLabel>
                  <Input
                    type="text"
                    placeholder="e.g. nginx:latest"
                    value={this.state.image.remove.imageName}
                    onChange={event => {
                      this.setState({image: {remove: {imageName: event.target.value}}})
                    }}
                  />
                </FormGroup>
                <Button $danger onClick={this.removeImage.bind(this)} style={{height: '36px', alignSelf: 'flex-end'}}>Remove</Button>
              </FormRow>
            </Card>
          </div>
        </Wrapper>
      </Page>
    )
  }
}

export default App
