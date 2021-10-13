const blockchain = new (require('../blockchain.js'))();

module.exports = {
  /**
   * Query deal status by cid
   * @param cid - IPFS cid
   */
  async status(cid) {
    if (!cid) {
      console.log('{dante-client status} expect [cid]');
      return;
    }
    let dealStatus = await blockchain.contractCall(
        'marketContract', 'get_deal_by_cid', [cid]);

    const table = [
      'cid', 'state', 'slashed', 'size', 'price', 'duration', 'end_block_num',
      'sender', 'miner_required', 'total_reward', 'reward_balance', 'miner_list'
    ];

    if (dealStatus[0] == '') {
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