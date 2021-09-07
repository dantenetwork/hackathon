const chai = require('chai');
const { on } = require('cluster');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');
const config = require('config');

// test account address, lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex
const testAccountPrivateKey = '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341';// private key, Testnet only
const testAccount = web3.platon.accounts.privateKeyToAccount(testAccountPrivateKey).address; // 私钥导出公钥

// market contract
let marketContract;
let marketContractAddress = config.get("marketContractAddress");

// verify contract
let verifyContract;
let verifyContractAddress = config.get("verifyContractAddress");

// token contract
const tokenABI = [{ "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Burn", "topic": 1, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Transfer", "topic": 2, "type": "Event" }, { "anonymous": false, "input": [{ "name": "topic1", "type": "FixedHash<20>" }, { "name": "topic2", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Approval", "topic": 2, "type": "Event" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }], "name": "balanceOf", "output": "uint128", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "anonymous": false, "input": [{ "name": "topic", "type": "FixedHash<20>" }, { "name": "arg1", "type": "uint128" }], "name": "Mint", "topic": 1, "type": "Event" }, { "constant": false, "input": [{ "name": "_name", "type": "string" }, { "name": "_symbol", "type": "string" }, { "name": "_decimals", "type": "uint8" }], "name": "init", "output": "void", "type": "Action" }, { "constant": false, "input": [{ "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transfer", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_from", "type": "FixedHash<20>" }, { "name": "_to", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "transferFrom", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_spender", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "approve", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "mint", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }, { "name": "_value", "type": "uint128" }], "name": "burn", "output": "bool", "type": "Action" }, { "constant": false, "input": [{ "name": "_account", "type": "FixedHash<20>" }], "name": "setOwner", "output": "bool", "type": "Action" }, { "constant": true, "input": [{ "name": "_owner", "type": "FixedHash<20>" }, { "name": "_spender", "type": "FixedHash<20>" }], "name": "allowance", "output": "uint128", "type": "Action" }, { "constant": true, "input": [], "name": "getOwner", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getName", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getDecimals", "output": "uint8", "type": "Action" }, { "constant": true, "input": [], "name": "getSymbol", "output": "string", "type": "Action" }, { "constant": true, "input": [], "name": "getTotalSupply", "output": "uint128", "type": "Action" }];

const tempTokenContractAddress = 'lat1kutjyplvt8dccag9jvy92q7cupg9mkzg3v3wsx';
const tokenContractAddress = 'lat1zf9vh3s63ux2nraaqyl0zmp52kdt5e2j6ylwe4';
const ONE_TOKEN = '1000000000000000000';
const tokenContract = new web3.platon.Contract(tokenABI, tokenContractAddress, { vmType: 1 });


// test case 
describe("dante market&verify unit test", function () {
  before(async function () {
    // market contract abi
    let marketRawData = fs.readFileSync('../build/contracts/market.abi.json');
    let marketAbi = JSON.parse(marketRawData);

    marketContract = new web3.platon.Contract(marketAbi, marketContractAddress, { vmType: 1 });

    // verify contract abi
    let verifyRawData = fs.readFileSync('../build/contracts/verify.abi.json');
    let verifyAbi = JSON.parse(verifyRawData);
    verifyContract = new web3.platon.Contract(verifyAbi, verifyContractAddress, { vmType: 1 });
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

  it("verify register_miner", async function () {
    try {
      this.timeout(0);
      // test data
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const reward_address = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

      miner = [enclave_public_key, reward_address, enclave_signature];

      // detect miner exists or not
      let onchainMiner = await blockchain.contractCall(verifyContract, "get_miner", [enclave_public_key]);
      if (onchainMiner[0] == enclave_public_key) {
        console.log('the miner ' + enclave_public_key + ' is already exists');
        return;
      }

      // let minerBalance = await tokenContract.methods.balanceOf(testAccount).call();
      // let contractBalance = await tokenContract.methods.balanceOf(verifyContractAddress).call();
      // minerBalance = minerBalance / ONE_TOKEN;
      // contractBalance = contractBalance / ONE_TOKEN;
      // console.log(minerBalance);
      // console.log(contractBalance);

      // send transaction
      const ret = await blockchain.sendTransaction(verifyContract, "register_miner", testAccountPrivateKey, miner);
      // expect ret is obeject
      assert.isObject(ret);

      // quer miner info
      onchainMiner = await blockchain.contractCall(verifyContract, "get_miner", [enclave_public_key]);
      // console.log(onchainMiner);

      // expect onchain info = test data
      // assert.isArray(onchainMiner);
      expect(onchainMiner[0]).to.equal(enclave_public_key);// enclave_public_key
      expect(onchainMiner[1]).to.equal(reward_address);// reward_address
      expect(onchainMiner[2]).to.equal(testAccount);// testAccount

      return;
      // expect contract DAT token increase 100 DAT
      let currentContractBalance = await tokenContract.methods.balanceOf(verifyContractAddress).call();
      currentContractBalance = currentContractBalance / ONE_TOKEN;
      // console.log(currentContractBalance);
      expect(currentContractBalance).to.equal(contractBalance + 100);


      // expect miner DAT balance decrease 100 DAT (locked 100 DAT to contract address)
      let currentMinerBalance = await tokenContract.methods.balanceOf(testAccount).call();
      currentMinerBalance = currentMinerBalance / ONE_TOKEN;

      // console.log(currentMinerBalance);
      expect(currentMinerBalance).to.equal(minerBalance - 100);

    } catch (e) {
      console.error(e);
    }
  });

  const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdm";
  const size = 100;

  it("market add_deal", async function () {
    try {
      this.timeout(0);
      // test data
      const price = ONE_TOKEN;
      const duration = 50000;
      const provider_required = 2;

      const totalPrice = price * duration * provider_required;

      dealInfo = [cid, size, price, duration, provider_required];

      let onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      if (onchainDealByCid[0] == cid) {
        console.log('the deal ' + cid + ' is already exists');
        return;
      }

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
      onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
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


      onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      console.log('deal info:');
      console.log(onchainDealByCid);

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


  // fill deal
  it("verify fill_deal", async function () {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_timestamp = "1626421278671";
      const enclave_stored_files = [[cid, size]];
      const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

      const proof = [enclave_public_key, enclave_timestamp, enclave_stored_files, enclave_signature];

      const ret = await blockchain.sendTransaction(verifyContract, "fill_deal", testAccountPrivateKey, proof);
      // console.log(ret);
      assert.isObject(ret);

      onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      console.log(onchainDealByCid);

      let onchainProof = await blockchain.contractCall(marketContract, "get_storage_provider_proof", [enclave_public_key]);
      console.log(onchainProof);

    } catch (e) {
      console.log(e);
    }
  });


  // submit storage proof
  it("verify submit_storage_proof", async function () {
    // 发送交易
    try {
      this.timeout(0);
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_timestamp = "1626421278671";
      const enclave_plot_size = "1073741824";
      const enclave_stored_files = [[cid, size]];
      const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

      const proof = [enclave_public_key, enclave_timestamp, enclave_plot_size, enclave_stored_files, enclave_signature];

      const ret = await blockchain.sendTransaction(verifyContract, "submit_storage_proof", testAccountPrivateKey, proof);
      // console.log(ret);
      assert.isObject(ret);

      onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
      console.log('deal info:');
      console.log(onchainDealByCid);

      let onchainProof = await blockchain.contractCall(marketContract, "get_storage_provider_proof", [enclave_public_key]);
      console.log('proof info:');
      console.log(onchainProof);
    } catch (e) {
      console.log(e);
    }
  });


  // update miner
  it("verify update_miner", async function () {
    try {
      this.timeout(0);
      // test data
      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const reward_address = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

      miner = [enclave_public_key, reward_address, enclave_signature];

      // send transaction
      const ret = await blockchain.sendTransaction(verifyContract, "update_miner", testAccountPrivateKey, miner);
      // expect ret is object
      assert.isObject(ret);

      // quer miner info
      let onchainMiner = await blockchain.contractCall(verifyContract, "get_miner", [enclave_public_key]);
      // console.log(onchainMiner);

      // expect onchain info = test data
      assert.isArray(onchainMiner);
      expect(onchainMiner[0]).to.equal(enclave_public_key);// enclave_public_key
      expect(onchainMiner[1]).to.equal(reward_address);// reward_address
      expect(onchainMiner[2]).to.equal(testAccount);// testAccount
    } catch (e) {
      console.error(e);
    }
  });

  it("verify submit_miner_info", async function () {
    try {
      this.timeout(0);
      // test data
      const name = "Hello World";
      const peer_id = "10737418241111111111073741824111111111";
      const country_code = "72";
      const url = "https://google.com";

      miner = [name, peer_id, country_code, url];

      // send transaction
      const ret = await blockchain.sendTransaction(verifyContract, "submit_miner_info", testAccountPrivateKey, miner);
      // expect ret is object
      assert.isObject(ret);

      // quer miner info
      let onchainMinerInfo = await blockchain.contractCall(verifyContract, "get_miner_info", [testAccount]);
      // console.log(onchainMinerInfo);

      // expect onchain info = test data
      assert.isArray(onchainMinerInfo);
      expect(onchainMinerInfo[0]).to.equal(testAccount);// testAccount
      expect(onchainMinerInfo[1]).to.equal(name);// name
      expect(onchainMinerInfo[2]).to.equal(peer_id);// peer_id
      expect(onchainMinerInfo[3]).to.equal(country_code);// country_code
      expect(onchainMinerInfo[4]).to.equal(url);// url
    } catch (e) {
      console.error(e);
    }
  });
  return;

  // erase miner
  it("verify unregister_miner", async function () {
    try {
      this.timeout(0);

      // let minerBalance = await tokenContract.methods.balanceOf(testAccount).call();
      // let contractBalance = await tokenContract.methods.balanceOf(verifyContractAddress).call();
      // minerBalance = minerBalance / ONE_TOKEN;
      // contractBalance = contractBalance / ONE_TOKEN;
      // console.log(minerBalance);
      // console.log(contractBalance);

      const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
      const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

      // send transaction
      const ret = await blockchain.sendTransaction(verifyContract, "unregister_miner", testAccountPrivateKey, [enclave_public_key, enclave_signature]);
      // expect ret is object
      assert.isObject(ret);

      // quer miner info
      let onchainMiner = await blockchain.contractCall(verifyContract, "get_miner", [enclave_public_key]);
      // console.log(onchainMiner);

      // expect onchainMinerInfo is empty
      assert.isArray(onchainMiner);
      expect(onchainMiner[0]).to.equal('');// enclave_public_key
      expect(onchainMiner[1]).to.equal('lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a');// reward_address
      expect(onchainMiner[2]).to.equal('lat1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq542u6a');// testAccount

      return;
      // expect miner DAT balance increase 100 DAT (refund 100 DAT from contract address)
      let currentMinerBalance = await tokenContract.methods.balanceOf(testAccount).call();
      currentMinerBalance = currentMinerBalance / ONE_TOKEN;

      // console.log(currentMinerBalance);
      expect(currentMinerBalance).to.equal(minerBalance + 100);

      // expect contract DAT token decrease 100 DAT
      let currentContractBalance = await tokenContract.methods.balanceOf(verifyContractAddress).call();
      currentContractBalance = currentContractBalance / ONE_TOKEN;
      // console.log(currentContractBalance);
      expect(currentContractBalance).to.equal(contractBalance - 100);

    } catch (e) {
      console.error(e);
    }
  });

  it("market contract set owner & token contract", async function () {
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

  it("verify contract set_owner & set_token_contract", async function () {
    try {
      this.timeout(0);

      // deploy verify contract account address, lat1nhm9fq0vhrfw48e4cevds95xtxxg0f0jc48aq3
      const verifyPrivateKey = "0x43a5ab4b584ff12d2e81296d399636c0dca10480ca2087cadbc8ad246d0d32a6"; // private key, Testnet only

      // expect token contract address = tokenContractAddress
      let tokenAddress = await blockchain.contractCall(verifyContract, "get_token_contract", []);
      expect(tokenAddress).to.equal(tokenContractAddress);

      ////////////////////////////////////////////////////////////
      // change owner to testAccount
      await blockchain.sendTransaction(verifyContract, "set_owner", verifyPrivateKey, [testAccount]);
      // expect contract owner = testAccount
      let currentContractOwner = await blockchain.contractCall(verifyContract, "get_owner", []);
      expect(currentContractOwner).to.equal(testAccount);

      // change token contract to {{contractAccount}}
      await blockchain.sendTransaction(verifyContract, "set_token_contract", testAccountPrivateKey, [tempTokenContractAddress]);

      // expect token contract address = {{contractAccount}}
      let currentTokenAddress = await blockchain.contractCall(verifyContract, "get_token_contract", []);
      expect(currentTokenAddress).to.equal(tempTokenContractAddress);

    } catch (e) {
      console.error(e);
    }
  });

});