const blockchain = new (require('../blockchain.js'))();
const config = require('config');
const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));

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

    // query miner info
    const minerInfo = await blockchain.contractCall(
        'verifyContract', 'get_miner', [enclavePublicKey]);

    let table = [
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
    console.log('Miner:');
    for (let i = 0; i < minerInfo.length; i++) {
      console.log(table[i] + ': ' + minerInfo[i]);
    }

    // query miner storage proof in verify contract

    const verifyStorageProof = await blockchain.contractCall(
        'verifyContract', 'get_storage_proof', [enclavePublicKey]);

    table = [
      'enclave_timestamp', 'enclave_task_size', 'enclave_idle_size',
      'last_proof_block_num', 'enclave_signature'
    ];

    console.log('-------------------------------');
    console.log('Verify Storage Proof:');
    for (let i = 0; i < verifyStorageProof.length; i++) {
      console.log(table[i] + ': ' + verifyStorageProof[i]);
    }

    // query miner storage proof in market contract

    const marketStorageProof = await blockchain.contractCall(
        'marketContract', 'get_storage_proof', [enclavePublicKey]);

    table = ['last_proof_block_num', 'last_claimed_block_num', 'filled_deals'];

    console.log('-------------------------------');
    console.log('Market Storage Proof:');
    for (let i = 0; i < marketStorageProof.length; i++) {
      console.log(table[i] + ': ' + marketStorageProof[i]);
    }

    this.getMinerInfo(minerInfo[3]);
  },
  /**
   * miner pledge DAT
   */
  async pledge(enclavePublicKey, amount) {
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
  },
  /**
   * miner unpledge DAT
   */
  async unpledge(enclavePublicKey) {
    if (!enclavePublicKey) {
      console.log('{dante-client pledgeMiner} expect [enclavePublicKey]');
      return;
    }

    // pledge miner
    const ret = await blockchain.sendTransaction(
        'verifyContract', 'unpledge_miner', config.get('Blockchain.privateKey'),
        [enclavePublicKey]);

    if (ret) {
      this.getMiner(enclavePublicKey);
    }
  },
  /**
   * claim deal reward & stake reward & miner reward
   */
  async claimReward(enclavePublicKey) {
    await blockchain.sendTransaction(
        'verifyContract', 'claim_stake_reward',
        config.get('Blockchain.privateKey'));

    await blockchain.sendTransaction(
        'verifyContract', 'claim_miner_reward',
        config.get('Blockchain.privateKey'));

    if (enclavePublicKey) {
      await blockchain.sendTransaction(
          'marketContract', 'claim_deal_reward',
          config.get('Blockchain.privateKey'), [enclavePublicKey]);
    }
  },
  /**
   * set miner info
   */
  async setMinerInfo(name, peerId, countryCode, url) {
    if (!name || !peerId || !countryCode || !url) {
      console.log(
          '{dante-client setMinerInfo} expect [name] [peerId] [countryCode] [url]');
      return;
    }

    const privateKey = config.get('Blockchain.privateKey');
    // send transaction
    await blockchain.sendTransaction(
        'verifyContract', 'submit_miner_info', privateKey,
        [name, peerId, countryCode, url]);

    const account = web3.platon.accounts.privateKeyToAccount(privateKey)
                        .address;  // 私钥导出公钥

    this.getMinerInfo(account);
  },
  /**
   * query miner info
   */
  async getMinerInfo(address) {
    if (!address) {
      return;
    }

    // query miner info
    const minerInfo = await blockchain.contractCall(
        'verifyContract', 'get_miner_info', [address]);

    let table = ['sender', 'name', 'peer_id', 'sender', 'country_code', 'url'];

    console.log('-------------------------------');
    console.log('Miner Info:');
    for (let i = 0; i < minerInfo.length; i++) {
      console.log(table[i] + ': ' + minerInfo[i]);
    }
  }
}