
const path = require('path');
const pipe = require('it-pipe');
const { map } = require('streaming-iterables');
const toIterable = require('stream-to-it');
const fs = require('fs');

const { IpfsClient } = require('mini-ipfs');
const fetch = require('node-fetch');
const config = require('config');

const client = new IpfsClient(config.get('IPFS.clientAddress'), { fetch });


module.exports = {
  /**
  * Download file from IPFS network by cid
  * @param cid - IPFS cid
  */
  async download(cid) {
    if (!cid) {
      console.log('{dante-client download} expected 1 param,but got 0');
      return;
    }

    let cwd = process.cwd(); // get current working directory

    // option default : {save: false}
    for await (const file of await client.get(cid, { save: true })) {
      const fullFilePath = path.join(cwd, file.path);
      if (file.content) {
        // download file
        await fs.promises.mkdir(path.join(cwd, path.dirname(file.path)), { recursive: true });
        await pipe(
          file.content,
          map((chunk) => chunk.slice()),
          toIterable.sink(fs.createWriteStream(fullFilePath))
        );
        console.log('file is downloaded: ' + cwd + '/' + cid);
      }
    }
  }
}