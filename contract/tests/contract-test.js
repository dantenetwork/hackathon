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


  it('approve token', async function() {
    // 发送交易
    try {
      this.timeout(0);
      // Query allowance of testAccount address
      let balance = await blockchain.contractCall(
          tokenContract, 'balanceOf', [testAccount]);
      console.log('test account ' + testAccount + ' balance: ' + balance);

      // approve verify contract
      await blockchain.sendTransaction(
          tokenContract, 'approve', testAccountPrivateKey,
          [verifyContractAddress, THOUSAND_TOKENS]);

      // expect allowance of testAccount address = THOUSAND_TOKENS
      let allowance = await blockchain.contractCall(
          tokenContract, 'allowance', [testAccount, verifyContractAddress]);
      console.log(
          testAccount + ' approved ' + verifyContractAddress +
          ', allowance: ' + allowance);

      // approve market contract
      await blockchain.sendTransaction(
          tokenContract, 'approve', testAccountPrivateKey,
          [marketContractAddress, THOUSAND_TOKENS]);

      // expect allowance of testAccount address = THOUSAND_TOKENS
      allowance = await blockchain.contractCall(
          tokenContract, 'allowance', [testAccount, marketContractAddress]);
      console.log(
          testAccount + ' approved ' + marketContractAddress +
          ', allowance: ' + allowance);

    } catch (error) {
      console.log(error);
    }
  });


  it('verify register_miner', async function() {
    try {
      this.timeout(0);

      miner = [enclave_public_key, reward_address, 50];

      // detect miner exists or not
      let ret = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);

      if (ret[0] == enclave_public_key) {
        console.log('the miner ' + enclave_public_key + ' is already exists');
      } else {
        await blockchain.sendTransaction(
            verifyContract, 'register_miner', testAccountPrivateKey, miner);
      }

      // expect miner count = 1
      const minerCount =
          await blockchain.contractCall(verifyContract, 'get_miner_count');
      expect(parseInt(minerCount)).to.equal(1);

      // query miner info
      let minerInfo = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);

      expect(minerInfo[0]).to.equal(enclave_public_key);  // enclave_public_key
      expect(minerInfo[2]).to.equal(reward_address);      // reward_address
      expect(minerInfo[3]).to.equal(testAccount);         // testAccount
      const miner_pledged_token = parseInt(minerInfo[4]);
      const miner_pledged_storage_size = parseInt(minerInfo[5]);

      await blockchain.sendTransaction(
          verifyContract, 'pledge_miner', testAccountPrivateKey,
          [enclave_public_key, FIVE_HUNDRED_TOKENS]);

      // query miner info
      let newMinerInfo = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);

      expect(parseInt(newMinerInfo[4]))
          .to.equal(miner_pledged_token + parseInt(FIVE_HUNDRED_TOKENS));
      expect(parseInt(newMinerInfo[5]))
          .to.equal(miner_pledged_storage_size + 1024 * 1024 * 1024 * 500);

      await blockchain.sendTransaction(
          verifyContract, 'stake_token', testAccountPrivateKey,
          [enclave_public_key, FIVE_HUNDRED_TOKENS]);

      // expect stake amount = staked amount
      const stakeResult = await blockchain.contractCall(
          verifyContract, 'get_stake_by_from', [testAccount, 0]);

      expect(stakeResult[stakeResult.length - 1][0]).to.equal(testAccount);
      expect(stakeResult[stakeResult.length - 1][1])
          .to.equal(enclave_public_key);
      expect(stakeResult[stakeResult.length - 1][2])
          .to.equal(FIVE_HUNDRED_TOKENS);

    } catch (e) {
      console.error(e);
    }
  });


  it('verify verify_signature', async function() {
    try {
      this.timeout(0);

      const enclave_public_key =
          '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
      const enclave_timestamp = '1632303751';
      const enclave_idle_size = 109951162777600;
      const added_files =
          [['QmdHUb7ttiCvFGqf8D3L5PH7iomPx86ZAarH8xKrjwgqZT', 123456]];
      const deleted_files =
          [['QmRDgkoY5w9ot2qpe2NN1KCqJNwGJihZpb95hhXNNgKRAv', 654321]];
      const enclave_signature =
          '9011e60df9828abbc22a5d179889693d1f1af3651087ef16f837d233a68b271839f2feb57844359f7ccefce234f6b1098e29fbd4e651e3031afc46706deb866101';

      await blockchain.sendTransaction(
          verifyContract, 'verify_signature', testAccountPrivateKey, [
            enclave_public_key, enclave_timestamp, enclave_idle_size,
            added_files, deleted_files, enclave_signature, enclave_lat_address
          ]);
    } catch (e) {
      console.log(e);
    }
  });


  it('market add_deal', async function() {
    try {
      this.timeout(0);

      const totalReward = price * duration * provider_required;
      dealInfo = [cid, size, price, duration, provider_required];

      let onchainDealByCid = await blockchain.contractCall(
          marketContract, 'get_deal_by_cid', [cid]);
      if (onchainDealByCid[0] == cid) {
        console.log('the deal ' + cid + ' is already exists');
        added_files = [];
        return;
      }

      // send transaction
      const ret = await blockchain.sendTransaction(
          marketContract, 'add_deal', testAccountPrivateKey, dealInfo);

      // query deal info by cid
      onchainDealByCid = await blockchain.contractCall(
          marketContract, 'get_deal_by_cid', [cid]);
      // console.log(onchainDealByCid);

      // expect onchain info = test data
      assert.isArray(onchainDealByCid);
      expect(onchainDealByCid[0]).to.equal(cid);
      expect(onchainDealByCid[1]).to.equal(0);
      expect(onchainDealByCid[2]).to.equal(false);
      expect(onchainDealByCid[3]).to.equal(size + '');
      expect(onchainDealByCid[4]).to.equal(price + '');
      expect(onchainDealByCid[5]).to.equal(duration + '');
      expect(onchainDealByCid[7]).to.equal(testAccount);
      expect(onchainDealByCid[8]).to.equal(provider_required);
      expect(parseInt(onchainDealByCid[9])).to.equal(totalReward);
      expect(parseInt(onchainDealByCid[10])).to.equal(totalReward);

      // ensure deal count = 1
      const minerCount =
          await blockchain.contractCall(marketContract, 'get_deal_count');
      expect(parseInt(minerCount)).to.equal(1);

    } catch (e) {
      console.error(e);
    }
  });

  // renewal deal
  it('verify renewal_deal', async function() {
    try {
      this.timeout(0);
      // test data
      dealInfo = [cid, duration];

      const totalReward = price * duration * provider_required;

      let onchainDealByCid = await blockchain.contractCall(
          marketContract, 'get_deal_by_cid', [cid]);
      const previousDuration = parseInt(onchainDealByCid[5]);
      const previousTotalReward = parseInt(onchainDealByCid[9]);
      const previousRewardBalance = parseInt(onchainDealByCid[10]);

      // send transaction
      const ret = await blockchain.sendTransaction(
          marketContract, 'renewal_deal', testAccountPrivateKey, dealInfo);

      // query deal info by cid
      onchainDealByCid = await blockchain.contractCall(
          marketContract, 'get_deal_by_cid', [cid]);
      // console.log('deal info:');
      // console.log(onchainDealByCid);

      // expect onchain info = test data
      assert.isArray(onchainDealByCid);
      expect(onchainDealByCid[0]).to.equal(cid);
      expect(onchainDealByCid[1]).to.equal(0);
      expect(onchainDealByCid[5]).to.equal(previousDuration + duration + '');
      expect(onchainDealByCid[7]).to.equal(testAccount);
      expect(onchainDealByCid[9])
          .to.equal(previousTotalReward + totalReward + '');
      expect(onchainDealByCid[10])
          .to.equal(previousRewardBalance + totalReward + '');
    } catch (e) {
      console.log(e);
    }
  });


  // update storage proof
  it('verify update_storage_proof', async function() {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_timestamp = new Date().getTime();
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

      await showStorageProof(enclave_public_key);

    } catch (e) {
      console.log(e);
    }
  });

  // update storage proof
  it('market claim_deal_reward', async function() {
    // 发送交易
    try {
      this.timeout(0);
      await blockchain.sendTransaction(
          marketContract, 'claim_deal_reward', testAccountPrivateKey,
          [enclave_public_key]);

      await showDealInfo(cid);

    } catch (e) {
      console.log(e);
    }
  });
  return;

  // withdraw deal
  it('verify withdraw_deal & unpledge_miner', async function() {
    // 发送交易
    try {
      this.timeout(0);
      const param = [enclave_public_key, cid];

      await blockchain.sendTransaction(
          verifyContract, 'withdraw_deal', testAccountPrivateKey, param);

      await blockchain.sendTransaction(
          verifyContract, 'unpledge_miner', testAccountPrivateKey,
          [enclave_public_key]);

      // query miner info
      let ret = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);

      expect(ret[0]).to.equal(enclave_public_key);  // enclave_public_key
      expect(ret[2]).to.equal(reward_address);      // reward_address
      expect(ret[3]).to.equal(testAccount);         // testAccount
      expect(ret[4]).to.equal('0');
      expect(ret[5]).to.equal('0');

    } catch (e) {
      console.log(e);
    }
  });


  // update miner
  it('verify update_miner', async function() {
    try {
      this.timeout(0);
      // test data
      const reward_address = 'lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex';
      miner = [enclave_public_key, reward_address, 50];

      // send transaction
      const ret = await blockchain.sendTransaction(
          verifyContract, 'update_miner', testAccountPrivateKey, miner);

      // query miner info
      let onchainMiner = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);
      // console.log(onchainMiner);

      expect(onchainMiner[0])
          .to.equal(enclave_public_key);                 // enclave_public_key
      expect(onchainMiner[2]).to.equal(reward_address);  // reward_address
      expect(onchainMiner[3]).to.equal(testAccount);     // testAccount
    } catch (e) {
      console.error(e);
    }
  });

  it('verify submit_miner_info', async function() {
    try {
      this.timeout(0);
      // test data
      const name = 'Hello World';
      const peer_id = '10737418241111111111073741824111111111';
      const country_code = '72';
      const url = 'https://google.com';

      miner = [name, peer_id, country_code, url];

      // send transaction
      const ret = await blockchain.sendTransaction(
          verifyContract, 'submit_miner_info', testAccountPrivateKey, miner);

      // query miner info
      let onchainMinerInfo = await blockchain.contractCall(
          verifyContract, 'get_miner_info', [testAccount]);
      // console.log(onchainMinerInfo);

      // expect onchain info = test data
      assert.isArray(onchainMinerInfo);
      expect(onchainMinerInfo[0]).to.equal(testAccount);   // testAccount
      expect(onchainMinerInfo[1]).to.equal(name);          // name
      expect(onchainMinerInfo[2]).to.equal(peer_id);       // peer_id
      expect(onchainMinerInfo[3]).to.equal(country_code);  // country_code
      expect(onchainMinerInfo[4]).to.equal(url);           // url
    } catch (e) {
      console.error(e);
    }
  });


  // erase miner
  it('verify unregister_miner', async function() {
    try {
      this.timeout(0);

      // send transaction
      const ret = await blockchain.sendTransaction(
          verifyContract, 'unregister_miner', testAccountPrivateKey,
          [enclave_public_key]);
      // expect ret is object

      // query miner info
      let onchainMiner = await blockchain.contractCall(
          verifyContract, 'get_miner', [enclave_public_key]);
      // console.log(onchainMiner);

      // expect onchainMinerInfo is empty
      assert.isArray(onchainMiner);
      expect(onchainMiner[0]).to.equal('');  // enclave_public_key
      expect(onchainMiner[1])
          .to.equal(
              'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a');  // enclave_lat_address
      expect(onchainMiner[2])
          .to.equal(
              'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a');  // reward_address
      expect(onchainMiner[2])
          .to.equal(
              'lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a');  // testAccount

    } catch (e) {
      console.error(e);
    }
  });


  it('market contract set owner & token contract', async function() {
    try {
      this.timeout(0);
      // deploy market contract account address,
      // lat1qavfd7zwaknrxyx0drcmv0vr5zehgthhaqq6ul
      const marketPrivateKey =
          '0x4940cf212544505a0fad3e3932734220af101da915321489708f69bc908fda65';  // private key, Testnet only

      // expect token contract address = tokenContractAddress
      let tokenAddress = await blockchain.contractCall(
          marketContract, 'get_token_contract', []);
      expect(tokenAddress).to.equal(tokenContractAddress);

      ////////////////////////////////////////////////////////////
      // change owner to testAccount
      await blockchain.sendTransaction(
          marketContract, 'set_owner', marketPrivateKey, [testAccount]);
      // expect contract owner = testAccount
      let currentContractOwner =
          await blockchain.contractCall(marketContract, 'get_owner', []);
      expect(currentContractOwner).to.equal(testAccount);

      // change token contract to {{contractAccount}}
      await blockchain.sendTransaction(
          marketContract, 'set_token_contract', testAccountPrivateKey,
          [tempTokenContractAddress]);

      // expect token contract address = {{contractAccount}}
      let currentTokenAddress = await blockchain.contractCall(
          marketContract, 'get_token_contract', []);
      expect(currentTokenAddress).to.equal(tempTokenContractAddress);

    } catch (e) {
      console.error(e);
    }
  });

  it('verify contract set_owner & set_token_contract', async function() {
    try {
      this.timeout(0);

      // deploy verify contract account address,
      // lat1nhm9fq0vhrfw48e4cevds95xtxxg0f0jc48aq3
      const verifyPrivateKey =
          '0x43a5ab4b584ff12d2e81296d399636c0dca10480ca2087cadbc8ad246d0d32a6';  // private key, Testnet only

      // expect token contract address = tokenContractAddress
      let tokenAddress = await blockchain.contractCall(
          verifyContract, 'get_token_contract', []);
      expect(tokenAddress).to.equal(tokenContractAddress);

      ////////////////////////////////////////////////////////////
      // change owner to testAccount
      await blockchain.sendTransaction(
          verifyContract, 'set_owner', verifyPrivateKey, [testAccount]);
      // expect contract owner = testAccount
      let currentContractOwner =
          await blockchain.contractCall(verifyContract, 'get_owner', []);
      expect(currentContractOwner).to.equal(testAccount);

      // change token contract to {{contractAccount}}
      await blockchain.sendTransaction(
          verifyContract, 'set_token_contract', testAccountPrivateKey,
          [tempTokenContractAddress]);

      // expect token contract address = {{contractAccount}}
      let currentTokenAddress = await blockchain.contractCall(
          verifyContract, 'get_token_contract', []);
      expect(currentTokenAddress).to.equal(tempTokenContractAddress);

    } catch (e) {
      console.error(e);
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