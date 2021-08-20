const config = require('config');

const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
const marketContract = new (require('../blockchain.js'))();

module.exports = {
  /**
    * List deals sent by private key of config file
    */
  async list() {
    const account = web3.platon.accounts.privateKeyToAccount(config.get('Blockchain.privateKey')).address;
    let dealList = await marketContract.contractCall('marketContract', 'get_deal_by_sender', [account, 0]);
    for (let item of dealList) {
      console.log(item);
    }
  }
}