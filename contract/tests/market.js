const chai = require('chai');
const exp = require('constants');
const assert = chai.assert;
const expect = chai.expect;
const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://47.241.98.219:6789');

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
const THOUSAND_TOKEN = '1000000000000000000000';
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

// test case 
describe("dante_market unit test", function () {
  before(async function () {
    gasPrice = web3.utils.numberToHex(await web3.platon.getGasPrice());
    gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));
    let rawdata = fs.readFileSync(abiFilePath);
    let abi = JSON.parse(rawdata);
    marketContract = new web3.platon.Contract(abi, "", { vmType: 1 });
  });

  it("deploy contract", async function () {
    try {
      this.timeout(0);
      // load contract wasm file
      let rawdata = await fs.readFileSync(binFilePath);
      bin = rawdata.toString("hex");
      // get nonce
      let nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(contractAccount));
      // deploy param
      let data = marketContract.deploy({
        data: bin,
        arguments: [tokenContractAddress,tokenContractAddress]
      }).encodeABI();

      // transaction param
      let tx = { gasPrice, gas, nonce, chainId, data };
      // sign transaction by private key
      let signTx = await web3.platon.accounts.signTransaction(tx, privateKey);
      // send transaction 
      const ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);

      assert.isObject(ret);
      assert.isNotNull(ret.contractAddress);

      // 更新合约地址
      marketContract.options.address = ret.contractAddress;
      marketContractAddress = marketContract.options.address;
      console.log("contract address: " + marketContractAddress);
    } catch (e) {
      console.error(e);
    }
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
      const duration = 100;
      const provider_required = 3;

      const totalPrice = price * duration * provider_required;

      dealInfo = [cid, size, price, duration, provider_required];

      let senderBalance = await tokenContract.methods.balanceOf(testAccount).call();
      let contractBalance = await tokenContract.methods.balanceOf(marketContractAddress).call();
      senderBalance = senderBalance;
      contractBalance = contractBalance;
      // console.log(senderBalance);
      // console.log(contractBalance);

      // send transaction
      const ret = await sendTransaction(marketContract, "add_deal", testAccountPrivateKey, dealInfo);
      // expect ret is obeject
      assert.isObject(ret);

      // quer deal info by cid
      let onchainDealByCid = await contractCall("get_deal_by_cid", [cid]);
      console.log(onchainDealByCid);

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


      // quer deal by sender
      let onchainDealBySender = await contractCall("get_deal_by_sender", [testAccount, 0]);
      // console.log(onchainDealBySender);
      assert.isArray(onchainDealBySender);
      expect(cid).to.equal(onchainDealBySender[0]);

      // quer deal by sender
      let openedDeals = await contractCall("get_opened_deal", [0]);
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


  it("set owner & token contract", async function () {
    try {
      this.timeout(0);

      // expect contract owner = {{contractAccount}}
      let contractOwner = await contractCall("get_owner", []);
      expect(contractOwner).to.equal(contractAccount);

      // expect token contract address = tokenContractAddress
      let tokenAddress = await contractCall("get_token_contract", []);
      expect(tokenAddress).to.equal(tokenContractAddress);

      ////////////////////////////////////////////////////////////
      // change owner to testAccount
      await sendTransaction(marketContract, "set_owner", privateKey, [testAccount]);
      // expect contract owner = testAccount
      let currentContractOwner = await contractCall("get_owner", []);
      expect(currentContractOwner).to.equal(testAccount);

      // change token contract to {{contractAccount}}
      await sendTransaction(marketContract, "set_token_contract", testAccountPrivateKey, [tempTokenContractAddress]);

      // expect token contract address = {{contractAccount}}
      let currentTokenAddress = await contractCall("get_token_contract", []);
      expect(currentTokenAddress).to.equal(tempTokenContractAddress);

    } catch (e) {
      console.error(e);
    }
  });
});