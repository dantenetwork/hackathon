/*
 * @Description: 
 * @Author: kay
 * @Date: 2021-08-17 17:39:05
 * @LastEditTime: 2021-09-02 15:50:03
 * @LastEditors: kay
 */

const Utils = require('../utils')

module.exports = function (app) {
  app.post('/v1/verify/fill_deal', async function (req, res) {
    console.log(req.body);
    try {
      await Utils.pushTransaction(Utils.verifiContract, Utils.verifyContractAddress, 'fill_deal', req.body);
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch(error) {
      console.log(error.message);
      res.json({
        code: -1,
        message: error.message
      })
    }
  });

  app.post('/v1/verify/submit_storage_proof', async function (req, res) {
    console.log(req.body);
    try {
      await Utils.pushTransaction(Utils.verifiContract, Utils.verifyContractAddress, 'submit_storage_proof', req.body);
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch (error) {
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
      await Utils.pushTransaction(Utils.verifiContract, Utils.verifyContractAddress, 'register_miner', req.body);
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch (error) {
      console.log(error.message);
      res.json({
        code: -3,
        message: error.message
      });
    }
  });

  app.post('/v1/verify/claim_deal_reward', async function (req, res) {
    console.log(req.body);
    try {
      await await Utils.pushTransaction(Utils.marketContract, Utils.marketContractAddress, 'claim_deal_reward', req.body);
      res.json({
        code: 0,
        message: 'ok'
      });
    } catch (error) {
      console.log(error.message);
      res.json({
        code: -4,
        message: error.message
      });
    }
  });
}