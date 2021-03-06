const fs = require('fs');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:6789');
const blockchain = require('./blockchain.js');
const config = require('config');

// token contract
const marketContractAddress = config.get('marketContractAddress');
const verifyContractAddress = config.get('verifyContractAddress');
const tokenContractAddress = config.get('tokenContractAddress');
const forfeitureContractAddress = config.get('forfeitureContractAddress');

const UNIT = 1000000000000000000;

(async function() {
  try {
    let balance = await balanceOf(marketContractAddress);
    console.log('marketContractAddress balance: ' + balance + ' DAT');

    balance = await balanceOf(verifyContractAddress);
    console.log('verifyContractAddress balance : ' + balance + ' DAT');

    balance = await balanceOf(forfeitureContractAddress);
    console.log('forfeitureContractAddress balance : ' + balance + ' DAT');

    balance = await balanceOf('lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex');
    console.log(
        'lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex balance: ' + balance +
        ' DAT');

    balance = await balanceOf('lat15nqll7dfn4km00lz6nd4ahxya5gals9d2f7sn8');
    console.log(
        'lat15nqll7dfn4km00lz6nd4ahxya5gals9d2f7sn8 balance: ' + balance +
        ' DAT');
  } catch (e) {
    console.log(e);
  }
}());


async function balanceOf(address) {
  // token contract abi
  let tokenRawData = fs.readFileSync('./token.abi.json');
  let tokenAbi = JSON.parse(tokenRawData);

  const tokenContract =
      new web3.platon.Contract(tokenAbi, tokenContractAddress, {vmType: 1});

  return await blockchain.contractCall(tokenContract, 'balanceOf', [address]);
}