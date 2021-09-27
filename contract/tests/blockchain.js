const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');

const chainId = 210309;

module.exports = {
  // 通过私钥签名交易
  async sendTransaction(
      targetContract, methodName, accountPrivateKey, arguments) {
    try {
      const account =
          web3.platon.accounts.privateKeyToAccount(accountPrivateKey)
              .address;  // 私钥导出公钥
      const to = targetContract.options.address;
      const nonce = web3.utils.numberToHex(
          await web3.platon.getTransactionCount(account));  // 获取生成 nonce
      const data = targetContract.methods[methodName]
                       .apply(targetContract.methods, arguments)
                       .encodeABI();  // encode ABI
      // const estimateGas =
      //     await web3.platon.estimateGas({from: account, to, data});
      const gas = web3.utils.numberToHex(
          parseInt((await web3.platon.getBlock('latest')).gasLimit - 1));
      const gasPrice = await web3.platon.getGasPrice();
      // console.log('gas: '+gas);
      // console.log('gasPrice: '+gasPrice);
      // console.log('estimateGas: ' + estimateGas);

      // 准备交易数据
      const tx = {account, to, chainId, data, nonce, gas, gasPrice};
      // console.log(tx);

      // 签名交易
      let signTx =
          await web3.platon.accounts.signTransaction(tx, accountPrivateKey);
      let ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
      console.log('gasUsed: ' + methodName + ' ' + ret.gasUsed);
      return ret;
    } catch (e) {
      console.error(e);
    }
  },
  // query info from blockchain node
  async contractCall(targetContract, method, arguments) {
    let methodObj =
        targetContract.methods[method].apply(targetContract.methods, arguments);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }
}