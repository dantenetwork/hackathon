const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');

// test account address, lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex
const testAccountPrivateKey = '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341';// private key, Testnet only
const testAccount = web3.platon.accounts.privateKeyToAccount(testAccountPrivateKey).address; // 私钥导出公钥

// market contract
let marketContract;
let marketContractAddress = 'lat1w6lc0fls2zsvnwgn3gwx4ey352mhzu5hytd838';

// verify contract
let verifyContract;
let verifyContractAddress = 'lat1fcd62zsm6f4e7nk8fuvd7g7hf8a090n0kj9keh';

// token contract
const tokenABI = [{ "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Burn", "topic": 1, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Transfer", "topic": 2, "type": "Event" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Approval", "topic": 2, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }], "name": "balanceOf", "output": "uint128", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Mint", "topic": 1, "type": "Event" }, { "constant": false, "input": [{ "name": "_name", "type": "string" }, { "name": "_symbol", "type": "string" }, { "name": "_decimals", "type": "uint8" }], "name": "init", "output": "void", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "mint", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "burn", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }], "name": "setOwner", "output": "bool", "type": "Action" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "constant": true, "input": [], "name": "getOwner", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getName", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getDecimals", "output": "uint8", "type": "Action" }, { "constant": true, "input": [], "name": "getSymbol", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getTotalSupply", "output": "uint128", "type": "Action" }];

const tempTokenContractAddress = 'lat1kutjyplvt8dccag9jvy92q7cupg9mkzg3v3wsx';
const tokenContractAddress = 'lat1zf9vh3s63ux2nraaqyl0zmp52kdt5e2j6ylwe4';
const ONE_TOKEN = '1000000000000000000';
const tokenContract = new web3.platon.Contract(tokenABI, tokenContractAddress, { vmType: 1 });


(async function () {
  // market contract abi
  let marketRawData = fs.readFileSync('../build/contracts/market.abi.json');
  let marketAbi = JSON.parse(marketRawData);

  marketContract = new web3.platon.Contract(marketAbi, marketContractAddress, { vmType: 1 });

  // verify contract abi
  let verifyRawData = fs.readFileSync('../build/contracts/verify.abi.json');
  let verifyAbi = JSON.parse(verifyRawData);
  verifyContract = new web3.platon.Contract(verifyAbi, verifyContractAddress, { vmType: 1 });

  try {

    const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
    const enclave_timestamp = "1626421278671";
    const enclave_plot_size = "1073741824";
    const enclave_stored_files = [["bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 100]];
    const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

    const proof = [enclave_public_key, enclave_timestamp, enclave_plot_size, enclave_stored_files, enclave_signature];

    const ret = await blockchain.sendTransaction(verifyContract, "submit_storage_proof", testAccountPrivateKey, proof);
    // console.log(ret);
    // assert.isObject(ret);

    let onchainProof = await blockchain.contractCall(marketContract, "get_storage_provider_proof", [enclave_public_key]);
    console.log(onchainProof);
    // expect onchain info = test data
    // // console.log(onchainProof);
    // assert.isArray(onchainProof);
    // expect(onchainProof[0]).to.equal(enclave_timestamp);// enclave_timestamp
    // expect(onchainProof[1]).to.equal(enclave_plot_size);// enclave_plot_size
    // expect(onchainProof[2]).to.equal(enclave_signature);// enclave_signature
    return;

    // const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
    // const reward_address = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
    // const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

    // miner = [enclave_public_key, reward_address, enclave_signature];

    // // let minerBalance = await tokenContract.methods.balanceOf(testAccount).call();
    // // let contractBalance = await tokenContract.methods.balanceOf(verifyContractAddress).call();
    // // minerBalance = minerBalance / ONE_TOKEN;
    // // contractBalance = contractBalance / ONE_TOKEN;
    // // console.log(minerBalance);
    // // console.log(contractBalance);

    // // send transaction
    // // let ret = await blockchain.sendTransaction(verifyContract, "register_miner", testAccountPrivateKey, miner);
    // // console.log(ret);

    // onchainMiner = await blockchain.contractCall(verifyContract, "get_miner", [enclave_public_key]);
    // console.log(onchainMiner);

    // onchainMiner = await blockchain.contractCall(verifyContract, "is_registered", [enclave_public_key]);
    // console.log(onchainMiner);

    // const proof = [enclave_public_key];

    // ret = await blockchain.sendTransaction(marketContract, "claim_deal_reward", testAccountPrivateKey, proof);

    // return;



  } catch (e) {
    console.log(e);
  }
}());