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

    const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdm";
    const enclave_public_key = "lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex";
    const enclave_timestamp = "1626421278671";
    const enclave_plot_size = "1073741824";
    const enclave_stored_files = [[cid, 100]];
    const enclave_signature = "0x6218ff2883e9ee97e29da6a3d6fe0f59081c2de9143b8dee336059c67fc249d965dbc3e5f6d3f0ae598d6be97c39a7a204d0636e50b0d56677eec7d84267c92801";

    const proof = [enclave_public_key, enclave_timestamp, enclave_plot_size, enclave_stored_files, enclave_signature];

    const ret = await blockchain.sendTransaction(verifyContract, "submit_storage_proof", testAccountPrivateKey, proof);
    // console.log(ret);

    let onchainProof = await blockchain.contractCall(marketContract, "get_storage_provider_proof", [enclave_public_key]);
    console.log('proof info:');
    console.log(onchainProof);

    onchainDealByCid = await blockchain.contractCall(marketContract, "get_deal_by_cid", [cid]);
    console.log('deal info:');
    console.log(onchainDealByCid);

  } catch (e) {
    console.log(e);
  }
}());