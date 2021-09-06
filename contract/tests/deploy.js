const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');

const chainId = 210309;
const tokenContractAddress = 'lat1zf9vh3s63ux2nraaqyl0zmp52kdt5e2j6ylwe4';

// deploy market contract account address, lat1qavfd7zwaknrxyx0drcmv0vr5zehgthhaqq6ul
const marketPrivateKey = "0x4940cf212544505a0fad3e3932734220af101da915321489708f69bc908fda65"; // private key, Testnet only

// deploy verify contract account address, lat1nhm9fq0vhrfw48e4cevds95xtxxg0f0jc48aq3
const verifyPrivateKey = "0x43a5ab4b584ff12d2e81296d399636c0dca10480ca2087cadbc8ad246d0d32a6"; // private key, Testnet only

let gasPrice;
let gas;

// deploy contracts and set related contract address
(async function () {

  gasPrice = web3.utils.numberToHex(await web3.platon.getGasPrice());
  gas = web3.utils.numberToHex(parseInt((await web3.platon.getBlock("latest")).gasLimit - 1));

  // deploy market contract
  const marketContract = await deployMarketContract();
  const marketContractAddress = marketContract.options.address;
  console.log('market contract is deployed, contract address = ' + marketContractAddress);
  console.log('----------------------------------------');

  // deploy verify contract
  const verifyContract = await deployVerifyContract();
  const verifyContractAddress = verifyContract.options.address;
  console.log('verify contract is deployed, contract address = ' + verifyContractAddress);

  console.log('----------------------------------------');

  // set_verify_contract 
  let ret = await blockchain.sendTransaction(marketContract, 'set_verify_contract', marketPrivateKey, [verifyContractAddress]);

  // get_verify_contract
  let address = await blockchain.contractCall(marketContract, 'get_verify_contract', []);
  console.log('verifyContractAddress of market contract: ' + address);

  // set_market_contract
  ret = await blockchain.sendTransaction(verifyContract, 'set_market_contract', verifyPrivateKey, [marketContractAddress]);

  // get_market_contract
  address = await blockchain.contractCall(verifyContract, 'get_market_contract', []);
  console.log('marketContractAddress of verify contract: ' + address);
})();


// deploy market contract
async function deployMarketContract() {
  // market contract abi and wasm
  const binFilePath = '../build/contracts/market.wasm';
  const abiFilePath = '../build/contracts/market.abi.json';

  const contractAccount = web3.platon.accounts.privateKeyToAccount(marketPrivateKey).address; // 私钥导出公钥

  // abi file
  console.log('reading ' + abiFilePath);
  let abi = JSON.parse(fs.readFileSync(abiFilePath));
  marketContract = new web3.platon.Contract(abi, "", { vmType: 1 });
  // wasm file
  console.log('reading ' + binFilePath);
  let bin = (await fs.readFileSync(binFilePath)).toString("hex");

  // get nonce
  let nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(contractAccount));
  // deploy param
  let data = marketContract.deploy({
    data: bin,
    arguments: [tokenContractAddress, tokenContractAddress]
  }).encodeABI();

  // transaction param
  let tx = { gasPrice, gas, nonce, chainId, data };
  // sign transaction by private key
  let signTx = await web3.platon.accounts.signTransaction(tx, marketPrivateKey);
  // send transaction 
  const ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
  // console.log(ret);

  marketContract.options.address = ret.contractAddress;
  return marketContract;
}


// deploy verify contract
async function deployVerifyContract() {

  // market contract abi and wasm
  const binFilePath = '../build/contracts/verify.wasm';
  const abiFilePath = '../build/contracts/verify.abi.json';

  // verify contract
  const contractAccount = web3.platon.accounts.privateKeyToAccount(verifyPrivateKey).address; // 私钥导出公钥

  // abi file
  console.log('reading ' + abiFilePath);
  let abi = JSON.parse(fs.readFileSync(abiFilePath));
  verifyContract = new web3.platon.Contract(abi, "", { vmType: 1 });
  console.log('reading ' + binFilePath);
  // wasm file
  let bin = (await fs.readFileSync(binFilePath)).toString("hex");

  // get nonce
  let nonce = web3.utils.numberToHex(await web3.platon.getTransactionCount(contractAccount));
  // deploy param
  let data = verifyContract.deploy({
    data: bin,
    arguments: [tokenContractAddress, tokenContractAddress]
  }).encodeABI();

  // transaction param
  let tx = { gasPrice, gas, nonce, chainId, data };
  // sign transaction by private key
  let signTx = await web3.platon.accounts.signTransaction(tx, verifyPrivateKey);
  // send transaction 
  const ret = await web3.platon.sendSignedTransaction(signTx.rawTransaction);
  // console.log(ret);

  verifyContract.options.address = ret.contractAddress;
  return verifyContract;
}


