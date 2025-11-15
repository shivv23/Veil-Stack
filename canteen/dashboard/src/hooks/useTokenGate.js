/**
 * useTokenGate Hook
 * Manages token-gated access control
 */

import { useState, useEffect, useCallback } from 'react'

// Minimal ERC20 ABI
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
]

export default function useTokenGate(web3, account) {
  const [hasAccess, setHasAccess] = useState(false)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [tokenInfo, setTokenInfo] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState(null)

  const tokenAddress = process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS
  const requiredBalance = process.env.REACT_APP_REQUIRED_TOKEN_BALANCE || '1'
  const tokenType = process.env.REACT_APP_TOKEN_TYPE || 'ERC20'

  // Check if token gating is enabled
  const isTokenGatingEnabled = !!tokenAddress

  // Check token balance
  const checkAccess = useCallback(async () => {
    if (!isTokenGatingEnabled) {
      // No token gating configured, grant access
      setHasAccess(true)
      return true
    }

    if (!web3 || !account) {
      setHasAccess(false)
      return false
    }

    setIsChecking(true)
    setError(null)

    try {
      const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress)

      // Get token balance
      const balance = await tokenContract.methods.balanceOf(account).call()
      setTokenBalance(balance.toString())

      // Check access
      const hasTokens = BigInt(balance) >= BigInt(requiredBalance)
      setHasAccess(hasTokens)

      // Get token info
      try {
        const [name, symbol, decimals] = await Promise.all([
          tokenContract.methods.name().call().catch(() => 'Unknown Token'),
          tokenContract.methods.symbol().call().catch(() => 'TOKEN'),
          tokenContract.methods.decimals().call().catch(() => '18')
        ])

        setTokenInfo({ name, symbol, decimals })
      } catch (infoError) {
        console.warn('Could not fetch token info:', infoError)
      }

      setIsChecking(false)
      return hasTokens
    } catch (err) {
      console.error('Token check error:', err)
      setError(err.message)
      setHasAccess(false)
      setIsChecking(false)
      return false
    }
  }, [web3, account, tokenAddress, requiredBalance, isTokenGatingEnabled])

  // Auto-check on account/web3 change
  useEffect(() => {
    if (web3 && account) {
      checkAccess()
    }
  }, [web3, account, checkAccess])

  // Format balance for display
  const formatBalance = useCallback((balance, decimals = 18) => {
    if (!balance || balance === '0') return '0'

    try {
      const divisor = BigInt(10) ** BigInt(decimals)
      const wholePart = BigInt(balance) / divisor
      const fractionalPart = BigInt(balance) % divisor

      if (fractionalPart === 0n) {
        return wholePart.toString()
      }

      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      return `${wholePart}.${fractionalStr.slice(0, 4)}` // Show 4 decimal places
    } catch (err) {
      return balance.toString()
    }
  }, [])

  return {
    // State
    hasAccess,
    tokenBalance,
    tokenInfo,
    isChecking,
    error,
    isTokenGatingEnabled,
    requiredBalance,
    tokenType,
    tokenAddress,

    // Actions
    checkAccess,
    formatBalance,

    // Display helpers
    formattedBalance: tokenInfo ? formatBalance(tokenBalance, tokenInfo.decimals) : '0',
    displayBalance: tokenInfo ? 
      `${formatBalance(tokenBalance, tokenInfo.decimals)} ${tokenInfo.symbol}` : 
      '0'
  }
}
