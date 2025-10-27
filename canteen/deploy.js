import Web3 from 'web3'
import Canteen from './build/contracts/Canteen.json'

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
const account = web3.eth.accounts.wallet.add('0xbc778caa6c1a8d8d747deda272670ba8636e0998f79bcdae47fb15568bca3e6a')

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

