const fs = require('fs');
const Web3 = require('web3');
const config = require('config');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));


module.exports = class smartContract {
  constructor() {
    // market contract abi
    let marketRawData = fs.readFileSync('abi/market.abi.json');
    let marketAbi = JSON.parse(marketRawData);
    // Contract.setProvider('ws://localhost:8546');
    this.marketContract = new web3.platon.Contract(
        marketAbi, config.get('Blockchain.marketContractAddress'), {vmType: 1});

    // verify contract abi
    let verifyRawData = fs.readFileSync('abi/verify.abi.json');
    let verifyAbi = JSON.parse(verifyRawData);
    this.verifyContract = new web3.platon.Contract(
        verifyAbi, config.get('Blockchain.verifyContractAddress'), {vmType: 1});

    // token contract abi
    let tokenRawData = fs.readFileSync('abi/token.abi.json');
    let tokenAbi = JSON.parse(tokenRawData);
    this.tokenContract = new web3.platon.Contract(
        tokenAbi, config.get('Blockchain.tokenContractAddress'), {vmType: 1});
  }

  /**
   * push transactions to PlatON node
   * @param contractName - contract name
   * @param method - action name
   * @param accountPrivateKey - account private key
   * @param params - action params
   */
  async sendTransaction(contractName, method, accountPrivateKey, params) {
    const smartContract = this.getContract(contractName);
    if (!smartContract) {
      console.log('smart contract is undefined');
      return;
    }

    try {
      const chainId = config.get('Blockchain.chainId');
      const gas = web3.utils.numberToHex(
          parseInt((await web3.platon.getBlock('latest')).gasLimit - 1));
      const account =
          web3.platon.accounts.privateKeyToAccount(accountPrivateKey)
              .address;  // 私钥导出公钥
      const to = smartContract.options.address;
      const nonce = web3.utils.numberToHex(
          await web3.platon.getTransactionCount(account));  // 获取生成 nonce
      const data = smartContract.methods[method]
                       .apply(smartContract.methods, params)
                       .encodeABI();  // encode ABI

      // const estimateGas =
      //     await web3.platon.estimateGas({from: account, to, data});

      // 准备交易数据
      const tx = {account, to, chainId, data, nonce, gas};
      // console.log(tx);

      // 签名交易
      let signTx =
          await web3.platon.accounts.signTransaction(tx, accountPrivateKey);
      let ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
      console.log('gasUsed: ' + method + ' ' + ret.gasUsed);
      // console.log(ret);
      return ret;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * query info from blockchain node
   * @param contractName - contract name
   * @param method - action name
   * @param params - action params
   */
  async contractCall(contractName, method, params) {
    const smartContract = this.getContract(contractName);
    if (!smartContract) {
      console.log('smart contract is undefined');
      return;
    }

    let methodObj =
        smartContract.methods[method].apply(smartContract.methods, params);
    let ret = await methodObj.call({});
    // console.log(ret);
    return ret;
  }

  /**
   * get target contract
   * @param contractName - contract name
   */
  getContract(contractName) {
    let smartContract = null;
    switch (contractName) {
      case 'tokenContract':
        smartContract = this.tokenContract;
        break;
      case 'marketContract':
        smartContract = this.marketContract;
        break;
      case 'verifyContract':
        smartContract = this.verifyContract;
        break;
    }
    return smartContract;
  }
}