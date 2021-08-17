const config = require('config');

const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
const blockchain = new (require('../blockchain.js'))();

module.exports = {
  /**
    * List deals sent by private key of config file
    */
  async list() {
    const publicKey = web3.platon.accounts.privateKeyToAccount(config.get('Blockchain.privateKey')).address;
    let onchainDealBySender = await blockchain.contractCall("get_deal_by_sender", [publicKey, 0]);
    console.log(onchainDealBySender);
  }
}