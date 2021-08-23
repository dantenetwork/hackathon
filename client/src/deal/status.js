const marketContract = new (require('../blockchain.js'))();

module.exports = {
  /**
   * Query deal status by cid
   * @param cid - IPFS cid
   */
  async status(cid) {
    if (!cid) {
      console.log('{dante-client status} expected 1 param,but got 0');
      return;
    }
    let dealStatus = await marketContract.contractCall('marketContract', 'get_deal_by_cid', [cid]);

    const table = ['cid', 'state', 'slashed', 'size', 'price', 'duration', 'sender', 'storage_provider_required', 'total_reward', 'reward_balance', 'storage_provider_list'];

    const emptyAddress = 'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a';
    if (dealStatus[6] == emptyAddress) {
      console.log('cid ' + cid + ' is not exists');
      return;
    }
    console.log('-------------------------------');
    console.log('Deal Info:');
    for (let i = 0; i < dealStatus.length; i++) {
      console.log(table[i] + ': ' + dealStatus[i]);
    }
  },
  /**
   * get storage provider info by enclavePublicKey
   */
  async getProof(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client getProof} expected 1 params,but only got 0');
      return;
    }
    console.log(enclavePublicKey);
    const minerInfo = await marketContract.contractCall('marketContract', 'get_storage_provider_proof', [enclavePublicKey]);

    const table = ['last_proof_block_num', 'last_claimed_block_num', 'deals'];

    console.log('-------------------------------');
    console.log('Miner Proof Info:');
    // print proof info
    for (let i = 0; i < minerInfo.length; i++) {
      if (i == 2) {
        console.log(table[i] + ': ');
        console.log('');
        const deals = minerInfo[i];
        // print each deal info
        for (let j = 0; j < deals.length; j++) {
          console.log('cid: ' + deals[j][0]);
          console.log('size: ' + deals[j][1]);
          console.log('');
        }
      } else {
        console.log(table[i] + ': ' + minerInfo[i]);
      }
    }
    return minerInfo;
  }
}