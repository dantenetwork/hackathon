const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');

const chainId = 210309;

module.exports = {
  // 通过私钥签名交易
  async sendTransaction(targetContract, methodName, accountPrivateKey, arguments) {
    try {
      const gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
      const account = web3.platon.accounts.privateKeyToAccount(accountPrivateKey).address; // 私钥导出公钥
      const to = targetContract.options.address;
      const nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(account)); // 获取生成 nonce
      const data = targetContract.methods[methodName].apply(targetContract.methods, arguments).encodeABI(); // encode ABI

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
  },
  // query info from blockchain node
  async contractCall(targetContract, method, arguments) {
    let methodObj = targetContract.methods[method].apply(targetContract.methods, arguments);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }
}