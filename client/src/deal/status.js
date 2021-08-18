const blockchain = new (require('./dealContract.js'))();

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

    let onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);

    const emptyAddress = 'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a';
    if (onchainDealByCid[6] == emptyAddress) {
      console.log('cid ' + cliParams[1] + ' is not exists');
      return;
    }
    console.log(onchainDealByCid);
  }
}