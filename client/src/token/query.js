const config = require('config');

const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
const blockchain = new (require('../blockchain.js'))();
const UNIT = 1000000000000000000;

module.exports = {
  /**
   * get current account DAT balance
   */
  async getBalance() {
    const account =
        web3.platon.accounts
            .privateKeyToAccount(config.get('Blockchain.privateKey'))
            .address;
    const balance =
        await blockchain.contractCall('tokenContract', 'balanceOf', [account]);
    console.log('balance of ' + account + ': ' + balance / UNIT + ' DAT');
    return balance;
  },

  /**
   * get DAT allowance from current account to market contract
   */
  async getAllowance() {
    const account =
        web3.platon.accounts
            .privateKeyToAccount(config.get('Blockchain.privateKey'))
            .address;

    let allowance = await blockchain.contractCall(
        'tokenContract', 'allowance',
        [account, config.get('Blockchain.marketContractAddress')]);
    console.log(
        'allowance from ' + account + ' to marketContractAddress is ' +
        allowance / UNIT + ' DAT');

    allowance = await blockchain.contractCall(
        'tokenContract', 'allowance',
        [account, config.get('Blockchain.verifyContractAddress')]);
    console.log(
        'allowance from ' + account + ' to verifyContractAddress is ' +
        allowance / UNIT + ' DAT');
    return allowance;
  }
}