const util = require('../util.js');
const fs = require('fs');
const {IpfsClient} = require('mini-ipfs');
const fetch = require('node-fetch');
const config = require('config');

const client = new IpfsClient(config.get('IPFS.clientAddress'), {fetch});
const blockchain = new (require('../blockchain.js'))();

const dealStatus = require('./status.js').status;
const token = require('../token/index.js');

module.exports = {
  /**
   * Add file to IPFS network and send to DANTE network
   * @param file_name - file path and name
   * @param price - deal price per block
   * @param duration - deal duration (blocks)
   * @param miner_required - amount of storage providers required
   */
  async add(cliParams) {
    if (cliParams.length < 5) {
      console.log(
          '{dante-client add} expect [file_name] [price] [duration] [miner_required], but only got ' +
          (cliParams.length - 1));
      return;
    }

    // price/duration/provider_required only support integer
    if (!util.isInteger(cliParams[2]) || !util.isInteger(cliParams[3]) ||
        !util.isInteger(cliParams[4])) {
      console.log(
          'Please make sure the entered price/duration/provider_required are integers');
      return;
    }

    try {
      fs.stat(cliParams[1], async function(err, stats) {
        if (err || !stats.isFile()) {
          console.log(cliParams[1] + ' is not exist.');
          return;
        }

        // upload data to IPFS network
        const result = await client.add(fs.createReadStream(cliParams[1]));
        const cid = result.name;
        console.log('cid: ', cid);


        // add deal to PlatON network
        let onchainDealByCid = await blockchain.contractCall(
            'marketContract', 'get_deal_by_cid', [cid]);
        if (onchainDealByCid[0]) {
          console.log('cid is already exists on DANTE network');
          dealStatus(cid);
          return;
        }

        const size = result.size;
        const price = cliParams[2];
        const duration = cliParams[3];
        const provider_required = cliParams[4];

        // console.log(dealInfo);

        // approve token
        await blockchain.sendTransaction(
            'tokenContract', 'approve', config.get('Blockchain.privateKey'), [
              config.get('Blockchain.marketContractAddress'),
              price * duration * provider_required
            ]);

        // check account balance and allowance
        console.log('-------------------------------');
        console.log('Token Info:');
        await token.getBalance();
        await token.getAllowance();

        const dealInfo = [cid, size, price, duration, provider_required];
        // send transaction
        const ret = await blockchain.sendTransaction(
            'marketContract', 'add_deal', config.get('Blockchain.privateKey'),
            dealInfo);
        // console.log(ret);

        // query deal info by cid
        if (ret) {
          dealStatus(cid);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
}