const config = require('config');

const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
const blockchain = new (require('../blockchain.js'))();

module.exports = {
  /**
   * stake token to miner
   */
  async stakeToken(enclavePublicKey, amount) {
    if (!enclavePublicKey || !amount) {
      console.log(
          '{dante-client stakeToken} expect [enclavePublicKey] [amount]');
      return;
    }

    // approve token
    await blockchain.sendTransaction(
        'tokenContract', 'approve', config.get('Blockchain.privateKey'),
        [config.get('Blockchain.verifyContractAddress'), amount]);

    await blockchain.sendTransaction(
        'verifyContract', 'stake_token', config.get('Blockchain.privateKey'),
        [enclavePublicKey, amount]);
  },
  /**
   * unstake token from miner
   */
  async unStakeToken(enclavePublicKey, amount) {
    if (!enclavePublicKey || !amount) {
      console.log(
          '{dante-client unStakeToken} expect [enclavePublicKey] [amount]');
      return;
    }
    await blockchain.sendTransaction(
        'verifyContract', 'unstake_token', config.get('Blockchain.privateKey'),
        [enclavePublicKey, amount]);
  }
}