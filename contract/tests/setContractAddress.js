const marketContractAddress = 'lat176eqjq6jz5qevtjc7qcpu80xuayassc6h4q2px';
const verifyContractAddress = 'lat105qv7nk23pwnh86703de86jm3y4s5t45wf59c5';

const smartContract = new (require('./blockchain.js'))(marketContractAddress, verifyContractAddress);

console.log('marketContractAddress: ' + marketContractAddress);
console.log('verifyContractAddress: ' + verifyContractAddress);

(async function () {
  let ret = await smartContract.sendTransaction('marketContract', 'set_verify_contract', '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341', [verifyContractAddress]);

  ret = await smartContract.sendTransaction('verifyContract', 'set_market_contract', '0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341', [marketContractAddress]);

  console.log('');
  let address = await smartContract.contractCall('marketContract', 'get_verify_contract', []);
  console.log('verifyContractAddress of market contract: ' + address);

  address = await smartContract.contractCall('verifyContract', 'get_market_contract', []);
  console.log('marketContractAddress of verify contract: ' + address);
})();