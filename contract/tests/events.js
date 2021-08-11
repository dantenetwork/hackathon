const chai = require('chai');
const fs = require('fs');
const Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || 'ws://localhost:6790');


console.log(web3.utils.leftPad(web3.utils.toHex("MarketContract"), 64));
console.log(web3.utils.leftPad(web3.utils.toHex("update_storage_proof"), 64));

web3.platon.abi.setVmType(1);

const eventObj = web3.platon.abi.decodeLog([{
  type: 'string',
  name: 'enclave_public_key'
}], '0xebaa6c6174313230737766616e326635306d79783267356b75783474386c61397970737a3934646868356578');
console.log(eventObj);

web3.platon.subscribe(
  'logs',
  {
    address: 'lat1tref69mlt7kk8gejz37lj2fk502v0574thy7je',
    topics: []
  },
  function (error, result) {
    if (error) {
      console.log(error);
    } else {
      console.log(result);

    }
  }
);