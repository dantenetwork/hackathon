const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://192.168.1.64:6789');

module.exports = class Blockchain {
  constructor() {
    // market contract abi and wasm
    const abiFilePath = 'abi/market.abi.json';

    // PlatON test net init data
    let rawdata = fs.readFileSync(abiFilePath);
    let abi = JSON.parse(rawdata);
    const marketContract = new web3.platon.Contract(abi, "", { vmType: 1 });

    marketContract.options.address = "lat13vzcph47kceqvxcu8urq22c7usuncaskymg4d0";
  }

  // push transactions
  async sendTransaction(actionName, accountPrivateKey, params) {
    try {
      const chainId = 210309;
      const gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
      const account = web3.platon.accounts.privateKeyToAccount(accountPrivateKey).address; // 私钥导出公钥
      const to = marketContract.options.address;
      const nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(account)); // 获取生成 nonce
      const data = marketContract.methods[actionName].apply(marketContract.methods, params).encodeABI(); // encode ABI

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
    let methodObj = marketContract.methods[method].apply(marketContract.methods, params);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }
}