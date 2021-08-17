const fs = require('fs');
const Web3 = require('web3');
const config = require('config');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));

module.exports = class Blockchain {
  constructor() {
    // market contract abi and wasm
    const abiFilePath = config.get('Blockchain.marketContractAbi');

    // PlatON test net init data
    let rawdata = fs.readFileSync(abiFilePath);
    let abi = JSON.parse(rawdata);
    this.marketContract = new web3.platon.Contract(abi, "", { vmType: 1 });

    this.marketContract.options.address = config.get("Blockchain.marketContractAddress");
  }

  // push transactions
  async sendTransaction(actionName, accountPrivateKey, params) {
    try {
      const chainId = config.get('Blockchain.chainId');
      const gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
      const account = web3.platon.accounts.privateKeyToAccount(accountPrivateKey).address; // 私钥导出公钥
      const to = this.marketContract.options.address;
      const nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(account)); // 获取生成 nonce
      const data = this.marketContract.methods[actionName].apply(this.marketContract.methods, params).encodeABI(); // encode ABI

      // 准备交易数据
      const tx = { account, to, chainId, data, nonce, gas };
      // console.log(tx);

      // 签名交易
      let signTx = await web3.platon.accounts.signTransaction(tx, accountPrivateKey);
      let ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
      // console.log(ret);
      return ret;
    } catch (e) {
      console.error(e);
    }
  }

  // query info from blockchain node
  async contractCall(method, params) {
    let methodObj = this.marketContract.methods[method].apply(this.marketContract.methods, params);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }
}