const verifyContract = new (require('../blockchain.js'))();

module.exports = {
  /**
   * get storage provider info by enclavePublicKey
   */
  async getMiner(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client getMiner} expected 1 params,but only got 0');
      return;
    }
    console.log(enclavePublicKey);
    const minerInfo = await verifyContract.contractCall('verifyContract', 'get_miner', [enclavePublicKey]);

    const table = ['enclave_public_key', 'reward_address', 'sender'];
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
  }
}