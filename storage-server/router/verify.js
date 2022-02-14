/*
 * @Description: 
 * @Author: kay
 * @Date: 2021-08-17 17:39:05
 * @LastEditTime: 2022-02-14 17:21:07
 * @LastEditors: kay
 */

const Utils = require('../utils');
const config = require('config');
const fs = require('fs-extra')
const path = require('path');

const verifiContractAddress = config.get('BlockChain.verifyContractAddress');

module.exports = function (app) {
  app.post('/v1/verify/update_storage_proof', async function (req, res) {
    console.log(req.body);
    try {
      var obj = JSON.parse(req.body);
      console.log(obj)
      await Utils.pushTransaction(Utils.verifiContract, verifiContractAddress, 'update_storage_proof',
        [obj.enclave_public_key, obj.enclave_timestamp, obj.enclave_task_size, obj.enclave_idle_size, obj.added_files, obj.deleted_files, obj.enclave_signature]);
      
      await calculate_mining_reward(obj.enclave_public_key);
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch (error) {
      console.log("update storage proof failed.");
      console.log(error.message);
      res.json({
        code: -2,
        message: error.message
      });
    }
  });

  app.post('/v1/verify/register_miner', async function (req, res) {
    console.log(req.body);
    try {
      var obj = JSON.parse(req.body);
      console.log(obj)
      let miner = await Utils.verifiContract.methods.get_miner(obj.enclave_public_key).call();
      console.log(miner);
      var file = path.join(__dirname, '../config/enclavePublicKey.json');
      fs.writeFile(file, JSON.stringify(obj.enclave_public_key), function (err) {
        if (err) {
          return console.log(err);
        }
      });
      if (miner[0].length == 0) {
        console.log("start register");
        let name = "Dante";
        let peer_id = "123";
        let country_code = "123";
        let url = "www.123.com";
        await Utils.pushTransaction(Utils.verifiContract, verifiContractAddress, 'register_miner', [obj.enclave_public_key, name, peer_id, country_code, url, obj.reward_address, obj.staker_reward_ratio]);
        console.log('register successfully');
        // console.log(ret);
      }
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch (error) {
      console.log(error.message);
      res.json({
        code: 0,
        message: error.message
      });
    }
  });
}

async function calculate_mining_reward(enclave_public_key) {
  try {
    let reward = await Utils.verifiContract.methods.get_uncalculated_mining_reward(enclave_public_key).call();
    while (parseInt(reward[5])) {
      console.log("start calculate_mining_reward");
      await Utils.pushTransaction(Utils.verifiContract, verifiContractAddresss, 'calculate_mining_reward', [enclave_public_key]);
      reward = await Utils.verifiContract.methods.get_uncalculated_mining_reward(enclave_public_key).call();
      console.log(reward);
    }
  } catch (error) {
    console.log("calculate mining reward failed");
    console.log(error.message);
    await calculate_mining_reward(enclave_public_key);
  }
}