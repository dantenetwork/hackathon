const verifyContract = new (require('./verifyContract.js'))();
const table = ['enclave_public_key', 'reward_address', 'sender'];
const emptyAddress = 'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a';

module.exports = {
  /**
  * get storage provider info by enclavePublicKey
  */
  async getMiner(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client getMiner} expected 1 params,but only got 0');
      return;
    }
    const minerInfo = await verifyContract.contractCall("get_miner", [enclavePublicKey]);

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