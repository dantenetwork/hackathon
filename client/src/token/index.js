const query = require('./query.js');
const stake = require('./stake.js');

module.exports = {
  getBalance: query.getBalance,
  getAllowance: query.getAllowance,
  stakeToken: stake.stakeToken,
  unStakeToken: stake.unStakeToken
}