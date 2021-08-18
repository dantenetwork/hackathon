const config = require('config');

const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
const tokenContract = new (require('./tokenContract.js'))();
const UNIT = 1000000000000000000;

module.exports = {
  /**
  * get current account DAT balance
  */
  async getBalance() {
    const account = web3.platon.accounts.privateKeyToAccount(config.get('Blockchain.privateKey')).address;
    const balance = await tokenContract.contractCall("balanceOf", [account]);
    console.log('balance of ' + account + ': ' + balance / UNIT + ' DAT');
    return balance;
  },

  /**
  * get current account DAT allowance
  */
  async getAllowance() {
    const account = web3.platon.accounts.privateKeyToAccount(config.get('Blockchain.privateKey')).address;
    const marketContract = config.get('Blockchain.marketContractAddress');

    const allowance = await tokenContract.contractCall("allowance", [account, marketContract]);
    console.log('allowance from ' + account + ' to ' + marketContract + ' is ' + allowance / UNIT + ' DAT');
    return allowance;
  }
}