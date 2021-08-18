DANTE Client

## install dependencies
```
npm i lerna -g
npm i -d
```

## convert the JavaScript file into a NodeJS command-line script
```
chmod +x index.js  # Make the file executable
npm link           # Link your command for development
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