const chai = require('chai');
const exp = require('constants');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');

// deploy account address, lat1qavfd7zwaknrxyx0drcmv0vr5zehgthhaqq6ul
const privateKey = "0x4940cf212544505a0fad3e3932734220af101da915321489708f69bc908fda65"; // private key, Testnet only
const contractAccount = web3.platon.accounts.privateKeyToAccount(privateKey).address; // 私钥导出公钥

// test account address, lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex
const testAccountPrivateKey = '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341';// private key, Testnet only
const testAccount = web3.platon.accounts.privateKeyToAccount(testAccountPrivateKey).address; // 私钥导出公钥

// market contract abi and wasm
const binFilePath = '../build/contracts/market.wasm';
const abiFilePath = '../build/contracts/market.abi.json';

// PlatON test net init data
const chainId = 210309;
let gas;
let gasPrice;
let marketContract;
let marketContractAddress;

// token contract
const tokenABI = [{ "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Burn", "topic": 1, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Transfer", "topic": 2, "type": "Event" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Approval", "topic": 2, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }], "name": "balanceOf", "output": "uint128", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Mint", "topic": 1, "type": "Event" }, { "constant": false, "input": [{ "name": "_name", "type": "string" }, { "name": "_symbol", "type": "string" }, { "name": "_decimals", "type": "uint8" }], "name": "init", "output": "void", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "mint", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "burn", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }], "name": "setOwner", "output": "bool", "type": "Action" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "constant": true, "input": [], "name": "getOwner", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getName", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getDecimals", "output": "uint8", "type": "Action" }, { "constant": true, "input": [], "name": "getSymbol", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getTotalSupply", "output": "uint128", "type": "Action" }];

const tempTokenContractAddress = 'lat1kutjyplvt8dccag9jvy92q7cupg9mkzg3v3wsx';
const tokenContractAddress = 'lat1hzan4ed929nh9mnua7zht0erzrcxuj5q24a0gt';
const ONE_TOKEN = '1000000000000000000';
const tokenContract = new web3.platon.Contract(tokenABI, tokenContractAddress, { vmType: 1 });

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
  let methodObj = marketContract.methods[method].apply(marketContract.methods, arguments);
  let ret = await methodObj.call({});
  // console.log(ret);
  return ret;
}

(async function () {
  gasPrice = web3.utils.numberToHex(await web3.platon.getGasPrice());
  gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
  let rawdata = fs.readFileSync(abiFilePath);
  let abi = JSON.parse(rawdata);
  marketContract = new web3.platon.Contract(abi, "", { vmType: 1 });

  const marketContractAddress = "lat1tref69mlt7kk8gejz37lj2fk502v0574thy7je";
  marketContract.options.address = marketContractAddress;

  try {
    // test data
    const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
    const enclave_stored_files = [["bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 100]];

    const proof = [enclave_public_key, enclave_stored_files];

    let ret = await sendTransaction(marketContract, "update_storage_proof", testAccountPrivateKey, proof);
    assert.isObject(ret);

    // update proof again
    ret = await sendTransaction(marketContract, "update_storage_proof", testAccountPrivateKey, proof);
    assert.isObject(ret);
    console.log(ret);
  } catch (e) {
    console.error(e);
  }


})();