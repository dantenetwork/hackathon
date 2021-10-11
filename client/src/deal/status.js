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
  },
  /**
   * get storage provider info by enclavePublicKey
   */
  async getProof(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client getProof} expected [enclavePublicKey]');
      return;
    }

    const verify_storage_proof_formate = [
      'enclave_timestamp', 'enclave_idle_size', 'enclave_task_size',
      'enclave_signature'
    ];
    const market_storage_proof_formate =
        ['last_proof_block_num', 'last_claimed_block_num', 'filled_deals'];

    // storage proof on verify contract
    ret = await blockchain.contractCall(
        'verifyContract', 'get_storage_proof', [enclavePublicKey]);
    console.log('verify contract proof info:');
    let output = [];
    ret.forEach(function(value, item) {
      output.push({[verify_storage_proof_formate[item]]: value});
    });
    console.log(output);

    // storage proof on market contract
    output = [];
    ret = await blockchain.contractCall(
        'marketContract', 'get_storage_proof', [enclavePublicKey]);
    console.log('market contract proof info:');

    ret.forEach(function(value, item) {
      output.push({[market_storage_proof_formate[item]]: value});
    });
    console.log(output);
  }
}