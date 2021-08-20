const marketContract = new (require('../blockchain.js'))();
const table = ['cid', 'state', 'slashed', 'size', 'price', 'duration', 'sender', 'storage_provider_required', 'total_reward', 'reward_balance', 'storage_provider_list'];

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
  }
}