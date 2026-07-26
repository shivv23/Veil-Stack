jest.mock('web3', () => {
  const mockContract = {
    methods: {
      getImagesCount: () => ({ call: () => Promise.resolve('0') }),
      getMemberDetails: () => ({ call: () => Promise.resolve(['', false]) }),
      images: (i) => ({ call: () => Promise.resolve('') }),
      getImageDetails: () => ({ call: () => Promise.resolve(['0', '0', false]) }),
      getPortsForImage: () => ({ call: () => Promise.resolve([]) }),
      owner: () => ({ call: () => Promise.resolve('0x0000000000000000000000000000000000000000') }),
      addMember: () => ({ estimateGas: () => Promise.resolve(15000000), send: () => Promise.resolve({}) }),
      reportStatus: () => ({ estimateGas: () => Promise.resolve(15000000), send: () => Promise.resolve({}) }),
      removeImage: () => ({ estimateGas: () => Promise.resolve(15000000), send: () => Promise.resolve({}) }),
      addImage: () => ({ estimateGas: () => Promise.resolve(15000000), send: () => Promise.resolve({}) }),
    },
    getPastEvents: () => Promise.resolve([])
  }

  function MockWeb3() {
    return {
      eth: {
        net: { isListening: () => Promise.resolve(false) },
        Contract: jest.fn().mockReturnValue(mockContract),
        accounts: {
          privateKeyToAccount: jest.fn().mockReturnValue({ address: '0x0000' }),
          wallet: { add: jest.fn() }
        },
        getBlockNumber: () => Promise.resolve(0),
        getGasPrice: () => Promise.resolve('0')
      },
      providers: {
        HttpProvider: jest.fn()
      }
    }
  }

  MockWeb3.providers = { HttpProvider: jest.fn() }
  return { __esModule: true, default: MockWeb3 }
})

jest.mock('./Canteen.json', () => ({ abi: [] }))

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

describe('App', () => {
  let container, root

  beforeEach(() => {
    container = document.createElement('div')
    jest.spyOn(console, 'error').mockImplementation(() => {})
    root = createRoot(container)
  })

  afterEach(() => {
    root.unmount()
    console.error.mockRestore()
  })

  it('renders without throwing', () => {
    expect(() => root.render(<App />)).not.toThrow()
  })

  it('class component has expected methods', () => {
    expect(typeof App.prototype.connectMetaMask).toBe('function')
    expect(typeof App.prototype.disconnectMetaMask).toBe('function')
    expect(typeof App.prototype.registerNode).toBe('function')
    expect(typeof App.prototype.addImage).toBe('function')
    expect(typeof App.prototype.removeImage).toBe('function')
    expect(typeof App.prototype.componentDidMount).toBe('function')
    expect(typeof App.prototype.updateGraph).toBe('function')
  })

  it('has render method that returns JSX', () => {
    const instance = new App({})
    const result = instance.render()
    expect(result).toBeDefined()
    expect(result.props).toBeDefined()
  })

  it('initializes with expected state shape', () => {
    const instance = new App({})
    expect(instance.state.status).toBe('connecting...')
    expect(instance.state.contract).toBeDefined()
    expect(instance.state.images).toEqual([])
    expect(instance.state.nodes).toEqual([])
    expect(instance.state.metaMaskConnected).toBe(false)
    expect(instance.state.metaMaskAccount).toBeNull()
    expect(instance.state.containerStatus).toEqual({ image: '', state: 'unknown', lastReported: 0 })
  })

  it('initializes image state with add and remove', () => {
    const instance = new App({})
    expect(instance.state.image.add).toHaveProperty('imageName')
    expect(instance.state.image.add).toHaveProperty('num')
    expect(instance.state.image.remove).toHaveProperty('imageName')
  })

  it('has D3 force simulation initialized', () => {
    const instance = new App({})
    expect(instance.force).toBeDefined()
    expect(instance.width).toBe(960)
    expect(instance.height).toBe(420)
  })

  it('has graph ref setup', () => {
    const instance = new App({})
    expect(instance.graphRef).toBeDefined()
  })
})
