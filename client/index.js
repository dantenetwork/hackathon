const { IpfsClient } = require('mini-ipfs');
const fetch = require('node-fetch');
var client = new IpfsClient('http://47.241.69.26:5001', { fetch });

(async function () {
  const cid = await client.add('Hello world');
  console.log('cid: ', cid);

  const ret = await client.cat(cid);
  console.log(ret.toString());
})();
