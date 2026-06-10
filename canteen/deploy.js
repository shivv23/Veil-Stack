import Web3 from 'web3'
import Canteen from './build/contracts/Canteen.json'

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY
if (!PRIVATE_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY not set in environment')
  console.error('   Add it to your .env file or export it:')
  console.error('   export DEPLOYER_PRIVATE_KEY=0x...')
  process.exit(1)
}

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
const account = web3.eth.accounts.wallet.add(PRIVATE_KEY)

// Set default account
web3.eth.defaultAccount = account.address

const contract = new web3.eth.Contract(Canteen.abi)

const transaction = contract.deploy({data: Canteen.bytecode})

web3.eth.estimateGas({data: Canteen.bytecode, from: account.address})
  .then(estimatedGas => {
      console.log(`Estimated Gas Required: ${estimatedGas}`)

      return transaction.send({
          from: account.address,
          gas: estimatedGas
        })
    })
  .then(receipt => {
      console.log(`Transaction Hash: ${receipt.transactionHash}`)
      console.log(`Contract Address: ${receipt.options.address}`)
    })
  .catch(error => {
      console.error('Deployment failed:', error)
      process.exit(1)
    })

