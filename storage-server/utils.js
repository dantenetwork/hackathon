// var config = require('./config/dev.env.json')
// if (process.env.NODE_ENV === 'production') {
//   // 生产环境
//   config = require('./config/prod.env.js');
// }
var config = require('config');
// config.get('')
const Web3 = require('web3');
// const Web3 = require('web3');
const { IpfsClient } = require('mini-ipfs')
const fetch = require('node-fetch');
const web3 = new Web3(config.get('BlockChain.chainRpc'));
// const marketAbi = require('./abi/market.abi.json');
const verifyAbi = require('./abi/verify.abi.json');
const marketAbi = require('./abi/market.abi.json');
// const marketContract = new web3.platon.Contract(marketAbi, config.MarketContractAddress, { vmType: 1 });
const verifiContract = new web3.platon.Contract(verifyAbi, config.get('BlockChain.verifyContractAddress'), { vmType: 1 });
const marketContract = new web3.platon.Contract(marketAbi, config.get('BlockChain.marketContractAddress'), { vmType: 1 });

// const CustomFetch = ( url, options, timeout = 500) => {
//   options.timeout = timeout
//   return fetch(url ,options)
// }
const ipfsClient = new IpfsClient(config.get('IPFS.clientRpc'), { fetch })
// const ipfsClient = new IpfsClient(config.IpfsNodeRpc, { fetch })
// 通过私钥签名交易
async function pushTransaction(contract, contractAddress, actionName, paramsArray) {
  let from = web3.platon.accounts.privateKeyToAccount(config.get('BlockChain.privateKey')).address; // 私钥导出公钥
  let nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(from)); // 获取 生成 nonce
  let data = contract.methods[actionName].apply(contract.methods, paramsArray).encodeABI(); // encode ABI
  let gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
  // 准备交易数据
  let tx = {
    from: from,
    to: contractAddress,
    value: 0,
    chainId: config.get('BlockChain.chainId'),
    data: data,
    nonce: nonce,
    gas: gas
  };

  // 签名交易
  let signTx = await web3.platon.accounts.signTransaction(tx, config.get('BlockChain.privateKey'));
  let receipt = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
  return receipt;
};


module.exports = {
  web3,
  ipfsClient,
  verifiContract,
  pushTransaction,
  marketContract,
};