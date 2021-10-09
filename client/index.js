#!/usr/bin/env node

const fs = require('fs');

const deal = require('./src/deal/index.js');
const miner = require('./src/miner/index.js');
const token = require('./src/token/index.js');
const downloadCid = require('./src/downloadCid.js').download;
const help = require('./src/help.js');

// if sub command is empty, show help info
var cliParams = process.argv.slice(2);
if (cliParams.length == 0) {
  // ouput command line help
  help.show();
  return;
}

// dante-client sub commands
const subCommand = cliParams[0];

switch (subCommand) {
  // dante-client version
  case 'version':
    // Retrieve version information
    const rawData = fs.readFileSync('./package.json');
    console.log(JSON.parse(rawData).version);
    break;
  // dante-client add
  case 'add':
    deal.add(cliParams);
    break;
  // dante-client download
  case 'download':
    downloadCid(cliParams[1]);
    break;
  // dante-client status
  case 'status':
    deal.status(cliParams[1]);
    break;
  // dante-client list
  case 'list':
    deal.list();
    break;
  // dante-client balance
  case 'balance':
    token.getBalance();
    break;
  // dante-client allowance
  case 'allowance':
    token.getAllowance();
    break;
  // dante-client getMiner
  case 'getMiner':
    miner.getMiner(cliParams[1]);
    break;
  case 'pledgeMiner':
    miner.pledgeMiner(cliParams[1], cliParams[2]);
    break;
  // dante-client getProof
  case 'getProof':
    deal.getProof(cliParams[1]);
    break;
  default:
    console.log('dante-client ' + subCommand + ' is not supported');
    help.show();
}