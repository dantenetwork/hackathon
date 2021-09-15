## The verify contract docs

The `verify` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for platon-hackathon's core functionality.

### Testnet Contract address
```
lat1kfnefgxrvn3c8wn5p2mat2j2mvqsq2g2vs5cfs
```

### Test cases for verify contract
[tests/verify.js](../tests/verify.js)

### API list

#### Contract init 
```
@action init
@param token_contract_address - PRC20 token contract address
@param market_contract_address - market contract address
@param mining_contract_address - mining contract address
```

#### Change contract owner
```
@action set_owner
@param address - market contract owner address
```

#### Query contract owner
```
@action get_owner
```

#### Change token contract
```
@action set_token_contract
@param address - Change PRC20 token contract address
```

#### Query token contract
```
@action get_token_contract
```

#### Change market contract
```
@action set_market_contract
@param address - Change market contract address
```

#### Query market contract
```
@action get_market_contract
```

#### Register miner by enclave_public_key
```
@action register_miner
@param enclave_public_key - SGX enclave public key
@param reward_address - miner address which receive rewards
```

#### Verify signature
```
@action verify_signature
@param enclave_public_key - SGX enclave public key
@param hashed_value - hashed value of original data
@param enclave_signature - SGX signature
```

#### Update miner
```
@action update_miner
@param enclave_public_key - SGX enclave public key
@param reward_address - miner address which receive rewards
```


#### Unregister miner
```
@action unregister_miner
@param enclave_public_key - SGX enclave public key
```

#### Submit enclave new deal proof to fill deal
```
@action fill_deal
@param enclave_public_key - SGX enclave public key
@param enclave_timestamp - SGX timestamp
@param stored_files - file list which storage provider stored
@param hashed_value - hashed value of original data
@param enclave_signature - SGX signature
```

#### Withdraw storage service from deal
```
@action withdraw_deal
@param enclave_public_key - SGX enclave public key
@param cid - deal cid
```

#### Update enclave storage proof
```
@action update_storage_proof
@param enclave_public_key - SGX enclave public key
@param enclave_timestamp - SGX timestamp
@param enclave_plot_size - storage provider plot size
@param stored_files - file list which storage provider stored
@param hashed_value - hashed value of original data
@param enclave_signature - SGX signature
```

#### Query last enclave proof
```
@action get_storage_proof
```

#### Query miner info by enclave_public_key
```
@action get_miner
@param enclave_public_key - SGX enclave public key
```

#### Query total capacity
```
@action get_total_capacity
```

#### Query miner count
```
@action get_miner_count
```

#### Submit miner info
```
@action submit_miner_info
@param name - miner name
@param peer_id - peer id of miner from IPFS network
@param country_code - country code(https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
@param url - the website url of storage provider
```

#### Get miner info by sender
```
@action get_miner_info
@param sender - the account which submit miner info
```

### Contract event list
```
PLATON_EMIT_EVENT1(RegisterMiner, enclave_public_key);
PLATON_EMIT_EVENT0(UpdateMiner, enclave_public_key);
PLATON_EMIT_EVENT0(UnregisterMiner, enclave_public_key);
PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);
PLATON_EMIT_EVENT0(SubmitStorageProof, enclave_public_key);
PLATON_EMIT_EVENT1(SubmitMinerInfo, platon_caller());
```