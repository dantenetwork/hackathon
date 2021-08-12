const blockchain = require('./blockchain.js');
console.log(blockchain);

async function addDeal() {
  const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const size = 100;
  const price = ONE_TOKEN;
  const duration = 10000;
  const provider_required = 3;

  dealInfo = [cid, size, price, duration, provider_required];

  // send transaction
  const ret = await blockchain.sendTransaction("add_deal", testAccountPrivateKey, dealInfo);
  console.log(ret);

  // quer deal info by cid
  let onchainDealByCid = await contractCall("get_deal_by_cid", [cid]);
  console.log(onchainDealByCid);
}

addDeal();