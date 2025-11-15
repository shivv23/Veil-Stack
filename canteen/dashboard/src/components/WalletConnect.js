/**
 * WalletConnect Component
 * Handles MetaMask connection UI
 */

import React from 'react'
import './WalletConnect.css'

export default function WalletConnect({ 
  isConnected, 
  account, 
  chainId, 
  chainConfig,
  hasAccess,
  tokenBalance,
  isConnecting,
  onConnect,
  onDisconnect,
  onSwitchChain,
  availableChains = ['ethereum', 'filecoin']
}) {
  if (!isConnected) {
    return (
      <div className="wallet-connect-container">
        <div className="wallet-connect-card">
          <h2>🦊 Connect Wallet</h2>
          <p>Connect your MetaMask wallet to use Canteen</p>
          
          <button 
            className="connect-button"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </button>

          <div className="wallet-help">
            <p>Don't have MetaMask?</p>
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Download MetaMask
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-status">
      <div className="wallet-info">
        <div className="account-info">
          <span className="status-dot connected"></span>
          <span className="account-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        </div>

        <div className="chain-selector">
          <label>Chain:</label>
          <select 
            value={chainConfig.name} 
            onChange={(e) => {
              const chainKey = availableChains.find(
                key => key === e.target.value.toLowerCase().split(' ')[0]
              )
              if (chainKey) onSwitchChain(chainKey)
            }}
          >
            {availableChains.map(chain => (
              <option key={chain} value={chain}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {tokenBalance && (
          <div className="token-info">
            <span className={`access-badge ${hasAccess ? 'granted' : 'denied'}`}>
              {hasAccess ? '✅ Access Granted' : '❌ Need Tokens'}
            </span>
            <span className="token-balance">{tokenBalance}</span>
          </div>
        )}

        <button className="disconnect-button" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    </div>
  )
}
