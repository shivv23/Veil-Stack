/**
 * useWeb3 Hook
 * Manages MetaMask connection, chain switching, and contract interactions
 */

import { useState, useEffect, useCallback } from 'react'
import Web3 from 'web3'

const CHAINS = {
  ethereum: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Sepolia Testnet',
    rpcUrl: process.env.REACT_APP_ETH_RPC_URL,
    contractAddress: process.env.REACT_APP_ETH_CONTRACT_ADDRESS,
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrl: 'https://sepolia.etherscan.io'
  },
  filecoin: {
    chainId: 314159,
    chainIdHex: '0x4cb2f',
    name: 'Filecoin Calibration',
    rpcUrl: process.env.REACT_APP_FIL_RPC_URL,
    contractAddress: process.env.REACT_APP_FIL_CONTRACT_ADDRESS,
    nativeCurrency: {
      name: 'Test FIL',
      symbol: 'tFIL',
      decimals: 18
    },
    blockExplorerUrl: 'https://calibration.filfox.info'
  }
}

export default function useWeb3(contractAbi) {
  const [web3, setWeb3] = useState(null)
  const [account, setAccount] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [contract, setContract] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [activeChain, setActiveChain] = useState(process.env.REACT_APP_ACTIVE_CHAIN || 'ethereum')

  const chainConfig = CHAINS[activeChain]

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setError('MetaMask not installed. Please install MetaMask extension.')
      return false
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      const web3Instance = new Web3(window.ethereum)
      const currentChainId = await web3Instance.eth.getChainId()

      setWeb3(web3Instance)
      setAccount(accounts[0])
      setChainId(Number(currentChainId))

      // Check if on correct chain
      if (Number(currentChainId) !== chainConfig.chainId) {
        await switchChain(activeChain)
      }

      // Load contract
      if (contractAbi && chainConfig.contractAddress) {
        const contractInstance = new web3Instance.eth.Contract(
          contractAbi,
          chainConfig.contractAddress
        )
        setContract(contractInstance)
      }

      setIsConnecting(false)
      return true
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message)
      setIsConnecting(false)
      return false
    }
  }, [isMetaMaskInstalled, contractAbi, chainConfig, activeChain])

  // Switch chain
  const switchChain = useCallback(async (chainKey) => {
    const targetChain = CHAINS[chainKey]
    
    if (!targetChain) {
      setError(`Invalid chain: ${chainKey}`)
      return false
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChain.chainIdHex }]
      })
      
      setActiveChain(chainKey)
      return true
    } catch (switchError) {
      // Chain not added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetChain.chainIdHex,
              chainName: targetChain.name,
              nativeCurrency: targetChain.nativeCurrency,
              rpcUrls: [targetChain.rpcUrl],
              blockExplorerUrls: [targetChain.blockExplorerUrl]
            }]
          })
          
          setActiveChain(chainKey)
          return true
        } catch (addError) {
          console.error('Error adding chain:', addError)
          setError(addError.message)
          return false
        }
      } else {
        console.error('Error switching chain:', switchError)
        setError(switchError.message)
        return false
      }
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    setWeb3(null)
    setAccount(null)
    setChainId(null)
    setContract(null)
    setError(null)
  }, [])

  // Listen to account changes
  useEffect(() => {
    if (!isMetaMaskInstalled) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAccount(accounts[0])
      }
    }

    const handleChainChanged = (chainIdHex) => {
      window.location.reload() // Recommended by MetaMask
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [isMetaMaskInstalled, disconnect])

  // Contract interaction helpers
  const sendTransaction = useCallback(async (method, ...args) => {
    if (!contract || !account) {
      throw new Error('Contract or account not initialized')
    }

    try {
      const tx = await contract.methods[method](...args).send({ from: account })
      return tx
    } catch (err) {
      console.error('Transaction error:', err)
      throw err
    }
  }, [contract, account])

  const callMethod = useCallback(async (method, ...args) => {
    if (!contract) {
      throw new Error('Contract not initialized')
    }

    try {
      return await contract.methods[method](...args).call()
    } catch (err) {
      console.error('Call error:', err)
      throw err
    }
  }, [contract])

  return {
    // State
    web3,
    account,
    chainId,
    contract,
    isConnecting,
    error,
    isConnected: !!account,
    isMetaMaskInstalled,
    activeChain,
    chainConfig,
    
    // Actions
    connect,
    disconnect,
    switchChain,
    sendTransaction,
    callMethod
  }
}
