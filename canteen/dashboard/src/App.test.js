import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div')
    ReactDOM.render(<App />, div)
    ReactDOM.unmountComponentAtNode(div)
  })

  it('has initial state with connecting status', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.state.status).toBe('connecting...')
    expect(instance.state.images).toEqual([])
    expect(instance.state.nodes).toEqual([])
    expect(instance.state.metaMaskConnected).toBe(false)
    expect(instance.state.metaMaskAccount).toBeNull()
    ReactDOM.unmountComponentAtNode(div)
  })

  it('sets container status from state', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.state.containerStatus).toEqual({ image: '', state: 'unknown', lastReported: 0 })
    ReactDOM.unmountComponentAtNode(div)
  })

  it('has readOnlyWeb3 initialized', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.readOnlyWeb3).toBeDefined()
    expect(instance.contract).toBeDefined()
    ReactDOM.unmountComponentAtNode(div)
  })

  it('has graph dimensions set', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.width).toBe(960)
    expect(instance.height).toBe(420)
    ReactDOM.unmountComponentAtNode(div)
  })

  it('contract address defaults to placeholder', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.contractAddress).toBeDefined()
    ReactDOM.unmountComponentAtNode(div)
  })

  it('has force simulation initialized', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.force).toBeDefined()
    expect(typeof instance.force.alphaTarget).toBe('function')
    ReactDOM.unmountComponentAtNode(div)
  })

  it('has image state with add and remove', () => {
    const div = document.createElement('div')
    const instance = ReactDOM.render(<App />, div)
    expect(instance.state.image).toHaveProperty('add')
    expect(instance.state.image).toHaveProperty('remove')
    expect(instance.state.image.add).toHaveProperty('imageName')
    expect(instance.state.image.add).toHaveProperty('num')
    expect(instance.state.image.remove).toHaveProperty('imageName')
    ReactDOM.unmountComponentAtNode(div)
  })
})
