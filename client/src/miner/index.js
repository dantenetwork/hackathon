const blockchain = new (require('../blockchain.js'))();
const config = require('config');

module.exports = {
  /**
   * get storage provider info by enclavePublicKey
   */
  async getMiner(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client getMiner} expect [enclavePublicKey]');
      return;
    }
    console.log(enclavePublicKey);
    const minerInfo = await blockchain.contractCall(
        'verifyContract', 'get_miner', [enclavePublicKey]);

    const table = [
      'enclave_public_key', 'enclave_lat_address', 'reward_address', 'sender',
      'miner_pledged_token', 'miner_pledged_storage_size', 'miner_staked_token',
      'miner_staked_storage_size', 'staker_reward_ratio'
    ];
    const emptyAddress = 'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a';

    if (minerInfo[1] == emptyAddress && minerInfo[2] == emptyAddress) {
      console.log('miner ' + enclavePublicKey + ' is not exists');
      return;
    }

    console.log('-------------------------------');
    console.log('Miner Info:');
    for (let i = 0; i < minerInfo.length; i++) {
      console.log(table[i] + ': ' + minerInfo[i]);
    }
    return minerInfo;
  },
  /**
   * pledge DAT to miner
   */
  async pledgeMiner(enclavePublicKey, amount) {
    if (!enclavePublicKey || !amount) {
      console.log(
          '{dante-client pledgeMiner} expect [enclavePublicKey] [amount]');
      return;
    }

    // approve token
    await blockchain.sendTransaction(
        'tokenContract', 'approve', config.get('Blockchain.privateKey'),
        [config.get('Blockchain.verifyContractAddress'), amount]);

    // pledge miner
    const ret = await blockchain.sendTransaction(
        'verifyContract', 'pledge_miner', config.get('Blockchain.privateKey'),
        [enclavePublicKey, amount]);

    if (ret) {
      this.getMiner(enclavePublicKey);
    }
  }
}