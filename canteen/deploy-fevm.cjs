const HDWalletProvider = require('@truffle/hdwallet-provider')
const { Web3 } = require('web3')
const Canteen = require('./build/contracts/Canteen.json')
require('dotenv').config()

async function main() {
  const MNEMONIC = process.env.MNEMONIC
  const RPC_URL = process.env.FIL_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'

  if (!MNEMONIC) {
    console.error('❌ MNEMONIC not set in .env')
    process.exit(1)
  }

  console.log('🌐 Connecting to Filecoin Calibration...')
  
  const provider = new HDWalletProvider({
    mnemonic: { phrase: MNEMONIC },
    providerOrUrl: RPC_URL,
    chainId: 314159
  })

  const web3 = new Web3(provider)
  const accounts = await web3.eth.getAccounts()
  const deployer = accounts[0]
  console.log(`🔑 Deployer: ${deployer}`)

  const balance = await web3.eth.getBalance(deployer)
  console.log(`💰 Balance: ${web3.utils.fromWei(balance, 'ether')} tFIL`)

  if (balance === '0') {
    console.error('❌ No tFIL balance. Get from faucet.')
    provider.engine.stop()
    process.exit(1)
  }

  console.log('📦 Deploying Canteen.sol...')
  
  const contract = new web3.eth.Contract(Canteen.abi)
  const deployTx = contract.deploy({ data: Canteen.bytecode })

  const gasEstimate = await deployTx.estimateGas({ from: deployer })
  console.log(`⛽ Estimated gas: ${gasEstimate}`)

  console.log(`⛽ Using gas: ${Math.min(Math.floor(Number(gasEstimate) * 1.3), 8000000)}`)
  console.log(`⛽ Gas price: 100000000 (100 gwei)`)
  
  const receipt = await deployTx.send({
    from: deployer,
    gas: Math.floor(Number(gasEstimate) * 1.3),
    gasPrice: '100000000'
  })

  console.log('')
  console.log('✅ DEPLOYMENT SUCCESSFUL!')
  console.log(`📝 Contract: ${receipt.options.address}`)
  console.log(`🔗 Tx: ${receipt.transactionHash}`)
  console.log(`🔍 Verify: https://calibration.filfox.info/en/address/${receipt.options.address}`)

  provider.engine.stop()
}

main().catch(err => {
  console.error('❌ Failed:', err.message || err)
  if (err.receipt) console.error('Receipt:', err.receipt)
  if (err.reason) console.error('Reason:', err.reason)
  process.exit(1)
})
