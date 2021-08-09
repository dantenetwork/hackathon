const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
// const web3 = new Web3('http://47.241.98.219:6789');
const web3 = new Web3('http://127.0.0.1:6789');

// deploy account address, lat1nhm9fq0vhrfw48e4cevds95xtxxg0f0jc48aq3
const privateKey = "0x43a5ab4b584ff12d2e81296d399636c0dca10480ca2087cadbc8ad246d0d32a6"; // private key, Testnet only
const contractAccount = web3.platon.accounts.privateKeyToAccount(privateKey).address; // 私钥导出公钥

// test account address, lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex
const testAccountPrivateKey = '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341';// private key, Testnet only
const testAccount = web3.platon.accounts.privateKeyToAccount(testAccountPrivateKey).address; // 私钥导出公钥

// market contract abi and wasm
const binFilePath = '../build/contracts/verify.wasm';
const abiFilePath = '../build/contracts/verify.abi.json';

// PlatON test net init data
const chainId = 210309;
let gas;
let gasPrice;
let verifyContract;
let verifyContractAddress;

// 通过私钥签名交易
async function sendTransaction(targetContract, actionName, accountPrivateKey, arguments) {
  try {
    const account = web3.platon.accounts.privateKeyToAccount(accountPrivateKey).address; // 私钥导出公钥
    const to = targetContract.options.address;
    const nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(account)); // 获取生成 nonce
    const data = targetContract.methods[actionName].apply(targetContract.methods, arguments).encodeABI(); // encode ABI

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
const contractCall = async (method, arguments) => {
  let methodObj = verifyContract.methods[method].apply(verifyContract.methods, arguments);
  let ret = await methodObj.call({});
  // console.log(ret);
  return ret;
}

(async function () {
  gasPrice = web3.utils.numberToHex(await web3.platon.getGasPrice());
  gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
  let rawdata = fs.readFileSync(abiFilePath);
  let abi = JSON.parse(rawdata);
  verifyContract = new web3.platon.Contract(abi, "", { vmType: 1 });

  verifyContractAddress = "lat1we6ns4z9ercgzmqnj6xcykx62qt7e90z0s69sn";
  verifyContract.options.address = verifyContractAddress;

  // fill deal
  const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
  const enclave_timestamp = "1626421278671";
  const enclave_stored_files = [["bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 100]];
  const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

  const proof = [enclave_public_key, enclave_timestamp, enclave_stored_files, enclave_signature];

  const ret = await sendTransaction(verifyContract, "fill_deal", testAccountPrivateKey, proof);
  // console.log(ret);
  assert.isObject(ret);

})();