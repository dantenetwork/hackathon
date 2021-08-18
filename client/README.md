# DANTE Client

## install dependencies
```
npm i lerna -g
npm i -d
```

## convert JS file into node.js command-line script
```
chmod +x index.js  # Make the file executable
npm link           # Link your command for development
```

## update config/default.json
```
{
  "Blockchain": {
    "chainId": 210309, // PlatON mainnet chain id
    "nodeAddress": "http://192.168.1.64:6789", // PlatON node api address
    "privateKey": "0x34382ebae7d7c628e13f14b4314c9b0149db7bbbc06428ae89de9883ffc7c341", // private key used to submit PlatON blockchain transaction
    "marketContractAbi": "abi/market.abi.json", // Dante network market contract abi file
    "marketContractAddress": "lat13vzcph47kceqvxcu8urq22c7usuncaskymg4d0" // Dante network market contract address
  },
  "IPFS": {
    "clientAddress": "http://47.241.69.26:5001" // IPFS node address
  }
}
```

## dante-client command line

#### show help
```
dante-client
```

#### retrieve version information
```
dante-client version
```

#### list deals sent by private key of config file
```
dante-client list
```

#### add file to IPFS network and send to DANTE network
```
dante-client add a.txt 1 10000 10
```

#### download file from IPFS network by cid
```
dante-client download QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```

#### query deal status by cid
```
dante-client status QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```