const add = require('./add.js').add;
const list = require('./list.js').list;
const status = require('./status.js');

module.exports = {
  add: add,
  list: list,
  status: status.status
}