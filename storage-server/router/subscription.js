/*
 * @Description: 
 * @Author: kay
 * @Date: 2021-08-17 15:07:38
 * @LastEditTime: 2022-02-14 17:44:02
 * @LastEditors: kay
 */

// import { web3, ipfsClient, contractAddress, topic, sgxServiceUrl } from './utils.js';
const Utils = require('../utils');
const LRUCache = require('lru-cache');
const reportedTxs = new LRUCache(5000);
const RLP = require('rlp');
const config = require('config');
const request = require('request');
const enclavePublicKey = require('../config/enclavePublicKey.json');

setInterval(() => {
  // 每 5 秒运行一次
  // 处理链上未被处理的旧订单
  Utils.web3.platon.getPastLogs({
    fromBlock: 0,
    address: config.get('BlockChain.marketContractAddress'),
    topics: config.get('BlockChain.addDealTopics')
  }).then(async (result) => {
    if (result) {
      for (let i in result) {
        var storageInfo = decodeEventData(result[i].data);
        var deal = await Utils.marketContract.methods.get_deal_by_cid(storageInfo.cid).call();
        if (deal[1] == 0 && !has(deal[deal.length-1], enclavePublicKey)) {
          // 存储订单 cid 文件到本地 IPFS
          try {
            if (storageInfo.cid == 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdb') {
              continue;
            }
            console.log(deal);
            await Utils.ipfsClient.pinAdd(storageInfo.cid)
            console.log("pin add " + storageInfo.cid + " successfully.");
          } catch (error) {
            console.log("pin add " + storageInfo.cid + " failed. Error message: \n" + error);
            return;
          }
          // 通知 Sgx 处理新的订单
          callSgxService("add", storageInfo);
        }
      }
    }
  });
}, 5000);

// 监听链上最新发布的订单
Utils.web3.platon.subscribe('logs', {
  fromBlock: "latest",
  address: config.get('BlockChain.marketContractAddress'),
  topics: config.get('BlockChain.addDealTopics')
}).on('data', async (result, error) => {
  // 注：subscription 同一笔交易会收到两次，据观察（还未研究源码），上链是在第 2 次接收到的通知
  // 因此多次接收到的交易只处理第二次收到的结果
  var timesReported = reportedTxs.peek(result.transactionHash);
  if (!timesReported) {
    reportedTxs.set(result.transactionHash, 1);
    timesReported = 1;
  }
  if (timesReported != 2) return reportedTxs.set(result.transactionHash, timesReported + 1);
  var storageInfo = decodeEventData(result.data);
  console.log(storageInfo);
  try {
    // await pinAdd(storageInfo.cid);
    await Utils.ipfsClient.pinAdd(storageInfo.cid)
    console.log("pin add " + storageInfo.cid + " successfully.");
  } catch (error) {
    console.log("pin add " + storageInfo.cid + " failed. Error message: \n" + error);
    return;
  }
  // 通知 Sgx 处理新的订单
  callSgxService("add", storageInfo);
});

function callSgxService(method, body) {
  let options = {
    url: config.get('SGX.sgxServiceRpc') + "/v0/filestore/" + method,
    method: "POST",
    json: true,
    body: body
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log(body);
    } else {
      console.log(error);
    }
  });
}

function decodeEventData(eventData) {
  eventData = eventData.replace('0x', '');
  let buf = RLP.decode(Buffer.from(eventData, "hex"));
  var data = [];
  var types = ['string', 'uint128'];
  for (let i in buf) {
    data[i] = Utils.web3.platon.abi.decodeParameters([{ type: types[i] }], buf[i]);
  }
  return { cid: data[0], size: data[1] };
}

function has(arr, value) {
  for (var i in arr) {
    if (arr[i] == value) {
      return true;
    }
  }
  return false;
}

// async function sleep(time) {
//   await new Promise(resolve => {
//     setTimeout(() => {
//       resolve();
//     }, time * 1000);
//   });
// }

// function sendToChain(actionName, params) {
//   options = {
//     url: "http://localhost:10240/v1/verify/" + actionName,
//     method: "POST",
//     json: true,
//     body: params
//   }
//   request(options, function (error, response, body) {
//     if (!error && response.statusCode === 200) {
//       console.log(response.body);
//     } else {
//       console.log(error);
//     }
//   });
// }

// 添加文件到本地 ipfs 服务
// async function pinAdd(cid, tryTimes = 0) {
//   tryTimes += 1;
//   if (tryTimes >= 10) {
//     return "";
//   }
//   try {
//     let result = await Utils.ipfsClient.pinAdd(cid);
//     console.log("ping add result:", result)
//     return result;
//   } catch(error) {
//     console.log("ipfs pin add " + cid + " failed, try " + tryTimes);
//     console.log(JSON.parse(JSON.stringify(error)));
//     return pinAdd(cid, tryTimes);
//   }
// }