const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');
const config = require('config');

// token contract
const marketContractAddress = config.get('marketContractAddress');
const verifyContractAddress = config.get('verifyContractAddress');
const tokenContractAddress = config.get('tokenContractAddress');

const UNIT = 1000000000000000000;

(async function() {
  // token contract abi
  let tokenRawData = fs.readFileSync('./token.abi.json');
  let tokenAbi = JSON.parse(tokenRawData);

  const tokenContract =
      new web3.platon.Contract(tokenAbi, tokenContractAddress, {vmType: 1});

  try {
    // const latBalance = await web3.platon.getBalance(
    //     'lat1nhm9fq0vhrfw48e4cevds95xtxxg0f0jc48aq3');
    // console.log(latBalance);

    let balance = await blockchain.contractCall(
        tokenContract, 'balanceOf', [marketContractAddress]);
    console.log('marketContractAddress balance: ' + balance + ' DAT');

    balance = await blockchain.contractCall(
        tokenContract, 'balanceOf', [verifyContractAddress]);
    console.log('verifyContractAddress balance : ' + balance + ' DAT');

    balance = await blockchain.contractCall(
        tokenContract, 'balanceOf',
        ['lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex']);
    console.log(
        'lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex balance: ' + balance +
        ' DAT');

  } catch (e) {
    console.log(e);
  }
}());