#!/usr/bin/env node

const { IpfsClient } = require('mini-ipfs');
const fetch = require('node-fetch');
const path = require('path');
const pipe = require('it-pipe');
const { map } = require('streaming-iterables');
const toIterable = require('stream-to-it');

const config = require('config');
const Web3 = require('web3');
const web3 = new Web3(config.get('Blockchain.nodeAddress'));
var client = new IpfsClient(config.get('IPFS.clientAddress'), { fetch });
const fs = require('fs');

let blockchain = require('./blockchain.js');
blockchain = new blockchain();

// if sub command is empty, show help info
var cliParams = process.argv.slice(2);
if (cliParams.length == 0) {
  // ouput command line help
  help();
  return;
}

// dante-client sub commands
const subCommand = cliParams[0];

switch (subCommand) {
  // dante-client version
  case 'version':
    const rawData = fs.readFileSync('./package.json');
    console.log(JSON.parse(rawData).version);
    break;
  // dante-client add
  case 'add':
    addDeal();
    break;
  // dante-client download
  case 'download':
    download();
    break;
  // dante-client status
  case 'status':
    status();
    break;
  // dante-client list
  case 'list':
    list();
    break;
  default:
    console.log('dante-client ' + subCommand + ' is not supported');
    help();
}

// show sub command help info
function help() {
  let rawData = fs.readFileSync('./help.txt');
  console.log(rawData.toString());
}


async function addDeal() {
  // upload data to IPFS network
  const cid = await client.add('Hello world');
  console.log('cid: ', cid);

  console.log('content: ' + (await client.cat(cid)).toString());

  // add deal to PlatON network
  let onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);
  if (onchainDealByCid[0]) {
    console.log('cid is already exists on DANTE network');
    return;
  }

  const size = 100;
  const price = '1000000000000000000';
  const duration = 10000;
  const provider_required = 3;

  dealInfo = [cid, size, price, duration, provider_required];

  // send transaction
  const ret = await blockchain.sendTransaction("add_deal", config.get('Blockchain.privateKey'), dealInfo);
  console.log(ret);

  // query deal info by cid
  onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);
  console.log(onchainDealByCid);
}

async function download() {
  const cid = cliParams[1] ? cliParams[1] : '';
  if (!cid) {
    console.log('cid is empty');
    return;
  }


  let cwd = process.cwd(); // get current working directory
  console.log(cwd);
  // option default : {save: false}
  for await (const file of await client.get(cid, { save: true })) {
    const fullFilePath = path.join(cwd, file.path)
    if (file.content) {
      await fs.promises.mkdir(path.join(cwd, path.dirname(file.path)), { recursive: true })
      await pipe(
        file.content,
        map((chunk) => chunk.slice()),
        toIterable.sink(fs.createWriteStream(fullFilePath))
      )
    } else (
      await fs.promises.mkdir(fullFilePath, { recursive: true })
    )
  }

}

async function status() {
  const cid = cliParams[1] ? cliParams[1] : '';
  if (!cid) {
    console.log('cid is empty');
    return;
  }

  let onchainDealByCid = await blockchain.contractCall("get_deal_by_cid", [cid]);
  console.log(onchainDealByCid);
}

async function list() {
  let onchainDealBySender = await blockchain.contractCall("get_deal_by_sender", [web3.platon.accounts.privateKeyToAccount(config.get('Blockchain.privateKey')).address, 0]);
  console.log(onchainDealBySender);
}