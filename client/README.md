DANTE Client

## Install dependencies
```
npm i lerna -g
npm i -d
```

## Convert the JavaScript file into a NodeJS command-line script
```
chmod +x index.js  # Make the file executable
npm link           # Link your command for development
```

## Command Line

#### dante-client
```
Command Line Interface to DANTE Client
Usage: dante-client SUBCOMMAND

Subcommands:
  version                     Retrieve version information
  add                         Add file to IPFS network and send to DANTE network
  download                    Download file from IPFS network by cid
  status                      Query deal status by cid
  list                        List deals sent by private key of config file
```

#### dante-client version
```
1.0.0
```

#### dante-client list
```
['QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve' ]
```

#### dante-client add

#### dante-client download QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```
file location: /home/yy/contracts/platon-hackathon/client/QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```

#### dante-client status QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve
```
[ 'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve',
  0,
  false,
  '100',
  '1000000000000000000',
  '10000',
  'lat120swfan2f50myx2g5kux4t8la9ypsz94dhh5ex',
  3,
  '30000000000000000000000',
  '30000000000000000000000',
  [] ]
```