const fs = require('fs');

module.exports = {
  /**
    * Show sub command help info
    */
  show() {
    let rawData = fs.readFileSync('./help/index.txt');
    console.log(rawData.toString());
  }
}