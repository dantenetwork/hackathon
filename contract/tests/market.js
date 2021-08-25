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

// market contract data
let marketContract;
let marketContractAddress = 'lat12x0vuvsjv5q79tfq6tz6rurtmadnlx2vmj3u3d';

// token contract
const tokenABI = [{ "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Burn", "topic": 1, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Transfer", "topic": 2, "type": "Event" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Approval", "topic": 2, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }], "name": "balanceOf", "output": "uint128", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Mint", "topic": 1, "type": "Event" }, { "constant": false, "input": [{ "name": "_name", "type": "string" }, { "name": "_symbol", "type": "string" }, { "name": "_decimals", "type": "uint8" }], "name": "init", "output": "void", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "mint", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "burn", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }], "name": "setOwner", "output": "bool", "type": "Action" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "constant": true, "input": [], "name": "getOwner", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getName", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getDecimals", "output": "uint8", "type": "Action" }, { "constant": true, "input": [], "name": "getSymbol", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getTotalSupply", "output": "uint128", "type": "Action" }];

const tempTokenContractAddress = 'lat1kutjyplvt8dccag9jvy92q7cupg9mkzg3v3wsx';
const tokenContractAddress = 'lat1zf9vh3s63ux2nraaqyl0zmp52kdt5e2j6ylwe4';
const ONE_TOKEN = '1000000000000000000';
const tokenContract = new web3.platon.Contract(tokenABI, tokenContractAddress, { vmType: 1 });


// test case 
describe("dante_market unit test", function () {
  before(async function () {
    // market contract abi
    let marketRawData = fs.readFileSync('../build/contracts/market.abi.json');
    let marketAbi = JSON.parse(marketRawData);

    marketContract = new web3.platon.Contract(marketAbi, marketContractAddress, { vmType: 1 });
  });

  // it("approve token", async function () {
  //   // 发送交易
  //   try {
  //     this.timeout(0);

  //     // Query allowance of testAccount address
  //     await tokenContract.methods.balanceOf(testAccount).call(null, (error, result) => {
  //       // console.log('DAT balanceOf ' + testAccount + ': ' + result / ONE_TOKEN);
  //     });

  //     // Query allowance of testAccount address
  //     await tokenContract.methods.allowance(testAccount, marketContractAddress).call(null, (error, result) => {
  //       // console.log('before approve, allowance: ' + result / ONE_TOKEN);
  //     });

  //     await sendTransaction(tokenContract, "approve", testAccountPrivateKey, [marketContractAddress, THOUSAND_TOKEN]);

  //     // expect allowance of testAccount address = THOUSAND_TOKEN
  //     await tokenContract.methods.allowance(testAccount, marketContractAddress).call(null, (error, result) => {
  //       // console.log('after approved, allowance: ' + result / ONE_TOKEN);
  //       expect(result).to.equal(THOUSAND_TOKEN);
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });

  it("add_deal", async function () {
    try {
      this.timeout(0);
      // test data
      const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      const size = 100;
      const price = ONE_TOKEN;
      const duration = 5;
      const provider_required = 1;

      const totalPrice = price * duration * provider_required;

      dealInfo = [cid, size, price, duration, provider_required];

      // let senderBalance = await tokenContract.methods.balanceOf(testAccount).call();
      // let contractBalance = await tokenContract.methods.balanceOf(marketContractAddress).call();
      // senderBalance = senderBalance;
      // contractBalance = contractBalance;
      // console.log(senderBalance);
      // console.log(contractBalance);

      // send transaction
      const ret = await blockchain.sendTransaction(marketContract, "add_deal", testAccountPrivateKey, dealInfo);
      // expect ret is obeject
      assert.isObject(ret);

      // quer deal info by cid
      let onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      // console.log(onchainDealByCid);

      // expect onchain info = test data
      assert.isArray(onchainDealByCid);
      expect(onchainDealByCid[0]).to.equal(cid);
      expect(onchainDealByCid[1]).to.equal(0);
      expect(onchainDealByCid[2]).to.equal(false);
      expect(onchainDealByCid[3]).to.equal(size + '');
      expect(onchainDealByCid[4]).to.equal(price + '');
      expect(onchainDealByCid[5]).to.equal(duration + '');
      expect(onchainDealByCid[6]).to.equal(testAccount);
      expect(onchainDealByCid[7]).to.equal(provider_required);
      expect(parseInt(onchainDealByCid[8])).to.equal(totalPrice);
      expect(parseInt(onchainDealByCid[9])).to.equal(totalPrice);


      // query deal by sender
      let onchainDealBySender = await blockchain.contractCall(marketContract, "get_deal_by_sender", [testAccount, 0]);
      // console.log(onchainDealBySender);
      assert.isArray(onchainDealBySender);
      expect(cid).to.equal(onchainDealBySender[0]);

      // query opened deal
      let openedDeals = await blockchain.contractCall(marketContract, "get_opened_deal", [0]);
      // console.log(openedDeals);
      assert.isArray(openedDeals);
      expect(cid).to.equal(openedDeals[0]);

      return;
      // expect contract DAT token increase totalPrice DAT
      let currentContractBalance = await tokenContract.methods.balanceOf(marketContractAddress).call();
      currentContractBalance = currentContractBalance;
      // console.log(currentContractBalance);
      expect(parseInt(currentContractBalance)).to.equal(parseInt(contractBalance) + parseInt(totalPrice));


      // expect miner DAT balance decrease totalPrice DAT (locked totalPrice DAT to contract address)
      let currentSenderBalance = await tokenContract.methods.balanceOf(testAccount).call();
      currentSenderBalance = currentSenderBalance;

      // console.log(currentSenderBalance);
      expect(parseInt(currentSenderBalance)).to.equal(parseInt(senderBalance) - parseInt(totalPrice));

    } catch (e) {
      console.error(e);
    }
  });

  // fill_deal
  it("fill_deal", async function () {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_stored_files = [["bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 100]];

      const proof = [enclave_public_key, enclave_stored_files];

      let ret = await blockchain.sendTransaction(marketContract, "fill_deal", testAccountPrivateKey, proof);
      // console.log(ret);
      assert.isObject(ret);

      // quer deal info by cid
      const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      let onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      // console.log(onchainDealByCid);

      // expect onchain info = test data
      assert.isArray(onchainDealByCid);
      expect(onchainDealByCid[1]).to.equal(1);
      expect(onchainDealByCid[10][0]).to.equal(enclave_public_key);

    } catch (e) {
      console.log(e);
    }
  });


  // update storage proof
  it("update_storage_proof", async function () {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_stored_files = [["bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 100]];

      const proof = [enclave_public_key, enclave_stored_files];

      let ret = await blockchain.sendTransaction(marketContract, "update_storage_proof", testAccountPrivateKey, proof);
      assert.isObject(ret);

      // update proof again
      ret = await blockchain.sendTransaction(marketContract, "update_storage_proof", testAccountPrivateKey, proof);
      assert.isObject(ret);

      let onchainProof = await blockchain.contractCall(marketContract, "get_storage_provider_proof", [enclave_public_key]);

      // expect onchain info = test data
      // console.log(onchainProof);
      assert.isArray(onchainProof);
      expect(onchainProof[0]).to.not.equal(0);// last_proof_block_num
      expect(onchainProof[1]).to.not.equal(0);// last_claimed_block_num
      expect(onchainProof[2][0][0]).to.equal(enclave_stored_files[0][0]);// deals
      expect(onchainProof[2][0][1]).to.equal(enclave_stored_files[0][1] + '');// deals
    } catch (e) {
      console.log(e);
    }
  });

  // claim_deal_reward
  it("claim_deal_reward", async function () {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";

      const proof = [enclave_public_key];

      const ret = await blockchain.sendTransaction(marketContract, "claim_deal_reward", testAccountPrivateKey, proof);
      // console.log(ret);
      assert.isObject(ret);

    } catch (e) {
      console.log(e);
    }
  });


  it("set owner & token contract", async function () {
    try {
      this.timeout(0);
      // deploy market contract account address, lat1qavfd7zwaknrxyx0drcmv0vr5zehgthhaqq6ul
      const marketPrivateKey = "0x4940cf212544505a0fad3e3932734220af101da915321489708f69bc908fda65"; // private key, Testnet only


      // expect token contract address = tokenContractAddress
      let tokenAddress = await blockchain.contractCall(marketContract, "get_token_contract", []);
      expect(tokenAddress).to.equal(tokenContractAddress);

      ////////////////////////////////////////////////////////////
      // change owner to testAccount
      await blockchain.sendTransaction(marketContract, "set_owner", marketPrivateKey, [testAccount]);
      // expect contract owner = testAccount
      let currentContractOwner = await blockchain.contractCall(marketContract, "get_owner", []);
      expect(currentContractOwner).to.equal(testAccount);

      // change token contract to {{contractAccount}}
      await blockchain.sendTransaction(marketContract, "set_token_contract", testAccountPrivateKey, [tempTokenContractAddress]);

      // expect token contract address = {{contractAccount}}
      let currentTokenAddress = await blockchain.contractCall(marketContract, "get_token_contract", []);
      expect(currentTokenAddress).to.equal(tempTokenContractAddress);

    } catch (e) {
      console.error(e);
    }
  });
});