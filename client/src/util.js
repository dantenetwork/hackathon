
module.exports = {
  /**
    * detect object is number
    * @param number - param
    */
  isNumber(num) {
    return Object.prototype.toString.call(num) == '[object Number]';
  },

  /**
    * detect string is integer
    * @param string - param 
    */
  isInteger(string) {
    return Number.isInteger(Number(string));
  }
}