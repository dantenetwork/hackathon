const { IpfsClient } = require('mini-ipfs');
const fetch = require('node-fetch');
const config = require('config');
var client = new IpfsClient(config.get('IPFS.clientAddress'), { fetch });

let blockchain = require('./blockchain.js');
blockchain = new blockchain();

// upload data to IPFS network
(async function () {
  const cid = await client.add('Hello world');
  console.log('cid: ', cid);

  const ret = await client.cat(cid);
  console.log('content: ' + ret.toString());

  addDeal(cid);
})();

// add deal to PlatON network
async function addDeal(cid) {
  let onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);
  if (onchainDealByCid[0]) {
    console.log('cid is already exists on DANTE network');
    return;
  }

  const size = 100;
  const price = '1000000000000000000';
  const duration = 10000;
  const provider_required = 3;

  dealInfo = [cid, size, price, duration, provider_required];

  // send transaction
  const ret = await blockchain.sendTransaction("add_deal", config.get('Blockchain.privateKey'), dealInfo);
  console.log(ret);

  // quer deal info by cid
  onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);
  console.log(onchainDealByCid);
}

