const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');
const config = require('config');
const {parse} = require('path');

// test account address, lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex
// private key,Testnet only
const testAccountPrivateKey =
    '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341';
const testAccount =
    web3.platon.accounts.privateKeyToAccount(testAccountPrivateKey)
        .address;  // 私钥导出公钥

// market contract
let marketContract;
let marketContractAddress = config.get('marketContractAddress');

// verify contract
let verifyContract;
let verifyContractAddress = config.get('verifyContractAddress');

// mining contract
let miningContract;
let miningContractAddress = config.get('miningContractAddress');

// token contract
let tokenContractAddress = config.get('tokenContractAddress');
const tempTokenContractAddress = tokenContractAddress;

const ONE_TOKEN = '1000000000000000000';
const THOUSAND_TOKENS = '1000000000000000000000';
const FIVE_HUNDRED_TOKENS = '500000000000000000000';

// test deal info
const enclave_public_key =
    '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
const enclave_lat_address = 'lat10e0525sfrf53yh2aljmm3sn9jq5njk7lrkx9a3';
const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdb';
const size = 1024 * 1024;
const enclave_idle_size = 1024 * 1024 * 1024;
const price = 1000000000000000;
const duration = 500;
const provider_required = 1;
const reward_address = testAccount;
let added_files = [[cid, size]];

// test case
describe('dante market && verify unit test', function() {
  before(async function() {
    // market contract abi
    let marketRawData = fs.readFileSync('../build/contracts/market.abi.json');
    let marketAbi = JSON.parse(marketRawData);

    marketContract =
        new web3.platon.Contract(marketAbi, marketContractAddress, {vmType: 1});

    // verify contract abi
    let verifyRawData = fs.readFileSync('../build/contracts/verify.abi.json');
    let verifyAbi = JSON.parse(verifyRawData);
    verifyContract =
        new web3.platon.Contract(verifyAbi, verifyContractAddress, {vmType: 1});

    // token contract abi
    let tokenRawData = fs.readFileSync('./token.abi.json');
    let tokenAbi = JSON.parse(tokenRawData);
    tokenContract =
        new web3.platon.Contract(tokenAbi, tokenContractAddress, {vmType: 1});
  });


  // update storage proof
  it('verify update_storage_proof', async function() {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_timestamp = new Date().getTime();
      let added_files = [];
      const deleted_files = [];
      const enclave_signature =
          '0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801';

      const param = [
        enclave_public_key, enclave_timestamp, enclave_idle_size, added_files,
        deleted_files, enclave_signature
      ];

      // expect total capacity = previous + added_files' size
      let totalCapacity = parseInt(
          await blockchain.contractCall(verifyContract, 'get_total_capacity'));

      await blockchain.sendTransaction(
          verifyContract, 'update_storage_proof', testAccountPrivateKey, param);

      newTotalCapacity =
          await blockchain.contractCall(verifyContract, 'get_total_capacity');

      if (totalCapacity == 0) {
        expect(newTotalCapacity).to.equal(enclave_idle_size + size + '');
      }

    } catch (e) {
      console.log(e);
    }
  });

  // update storage proof
  it('claim reward', async function() {
    // 发送交易
    try {
      this.timeout(0);
      await showStorageProof(enclave_public_key);
      await showDealInfo(cid);

      await blockchain.sendTransaction(
          marketContract, 'claim_deal_reward', testAccountPrivateKey,
          [enclave_public_key]);

      await showStorageProof(enclave_public_key);
      await showDealInfo(cid);

      await blockchain.sendTransaction(
          verifyContract, 'claim_miner_reward', testAccountPrivateKey);

      await blockchain.sendTransaction(
          verifyContract, 'claim_stake_reward', testAccountPrivateKey);

    } catch (e) {
      console.log(e);
    }
  });
});

// show deal info
async function showDealInfo(cid) {
  const verify_storage_proof_formate = [
    'cid', 'state', 'slashed', 'size', 'price', 'duration', 'closed_block_num',
    'sender', 'miner_required', 'total_reward', 'reward_balance', 'miner_list'
  ];
  let ret =
      await blockchain.contractCall(marketContract, 'get_deal_by_cid', [cid]);
  console.log('deal info:');
  let output = [];
  ret.forEach(function(value, item) {
    output.push({[verify_storage_proof_formate[item]]: value});
  });
  console.log(output);
}

async function showStorageProof(enclave_public_key) {
  const verify_storage_proof_formate = [
    'enclave_timestamp', 'enclave_idle_size', 'enclave_task_size',
    'enclave_signature'
  ];
  const market_storage_proof_formate =
      ['last_proof_block_num', 'last_claimed_block_num', 'filled_deals'];

  // storage proof on verify contract
  ret = await blockchain.contractCall(
      verifyContract, 'get_storage_proof', [enclave_public_key]);
  console.log('verify contract proof info:');
  let output = [];
  ret.forEach(function(value, item) {
    output.push({[verify_storage_proof_formate[item]]: value});
  });
  console.log(output);

  // storage proof on market contract
  output = [];
  ret = await blockchain.contractCall(
      marketContract, 'get_storage_proof', [enclave_public_key]);
  console.log('market contract proof info:');

  ret.forEach(function(value, item) {
    output.push({[market_storage_proof_formate[item]]: value});
  });
  console.log(output);
}