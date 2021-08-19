const fs = require('fs');
const Web3 = require('web3');
const config = require('config');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));

module.exports = class Blockchain {
  constructor() {
    // market contract abi and wasm
    let rawdata = fs.readFileSync('abi/verify.abi.json');
    let abi = JSON.parse(rawdata);
    this.verifyContract = new web3.platon.Contract(abi, "", { vmType: 1 });

    this.verifyContract.options.address = config.get("Blockchain.verifyContractAddress");
  }

  // query info from blockchain node
  async contractCall(method, params) {
    let methodObj = this.verifyContract.methods[method].apply(this.verifyContract.methods, params);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }
}