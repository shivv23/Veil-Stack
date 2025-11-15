require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const { Web3 } = require('web3');

async function checkBalance() {
  const provider = new HDWalletProvider(
    process.env.MNEMONIC,
    process.env.ETH_RPC_URL
  );

  const web3 = new Web3(provider);

  try {
    console.log('\nChecking Sepolia Wallet...\n');
    
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    
    console.log('Address:', address);
    
    const balance = await web3.eth.getBalance(address);
    const ethBalance = web3.utils.fromWei(balance, 'ether');
    
    console.log('Balance:', ethBalance, 'ETH');
    
    const blockNumber = await web3.eth.getBlockNumber();
    console.log('Block:', blockNumber.toString());
    console.log('Network: Sepolia Testnet\n');
    
    if (parseFloat(ethBalance) < 0.01) {
      console.log('WARNING: Insufficient funds!');
      console.log('Get Sepolia ETH from:');
      console.log('- https://www.infura.io/faucet/sepolia');
      console.log('- https://sepoliafaucet.com/');
      console.log('- https://faucet.quicknode.com/ethereum/sepolia\n');
      console.log(`   Use this address: ${address}\n`);
    } else {
      console.log('✅ Balance is sufficient for deployment!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    provider.engine.stop();
  }
}

checkBalance();
