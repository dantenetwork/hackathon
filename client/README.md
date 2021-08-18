# dante client

## Install dependencies
```
npm i lerna -g
npm i -d
```

## Convert JS file into node.js command-line script
```
chmod +x index.js  # Make the file executable
npm link           # Link your command for development
```

## Update config/default.json
```
{
  "Blockchain": {
    "chainId": 210309, // PlatON mainnet chain id
    "nodeAddress": "http://192.168.1.64:6789", // PlatON node api address
    "privateKey": "0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341", // private key used to submit PlatON blockchain transaction
    "marketContractAddress": "lat13vzcph47kceqvxcu8urq22c7usuncaskymg4d0", // Dante network market contract address
    "tokenContractAddress": "lat1hzan4ed929nh9mnua7zht0erzrcxuj5q24a0gt" // Dante network token contract address
  },
  "IPFS": {
    "clientAddress": "http://47.241.69.26:5001" // IPFS node address
  }
}
```

## Command Line

#### Show help
```
dante-client
```

#### Retrieve version information
```
dante-client version
```

#### List deals sent by private key of config file
```
dante-client list
```

#### Add file to IPFS network and send to DANTE network
```
/**
  * @param file_name - file path and name 
  * @param price - deal price per block
  * @param duration - deal duration (blocks)
  * @param storage_provider_required - amount of storage providers required
  */

dante-client add a.txt 1 10000 10
```

#### Download file from IPFS network by cid
```
/**
  * @param cid - IPFS cid
  */
  
dante-client download QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```

#### Query deal status by cid
```
/**
  * @param cid - IPFS cid
  */

dante-client status QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```

#### Query DAT balance of current account
```
dante-client balance
```

#### Query DAT allowance from current account to market contract
```
dante-client allowance
```