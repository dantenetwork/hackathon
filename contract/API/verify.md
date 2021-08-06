## The verify contract API docs

The `verify` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for platon-hackathon's core functionality.

### Testnet Contract address
```
lat1x78z0lw3cere8xxsjduplqy5lnzfklr5c8qvhh
```

### Test cases for verify contract
[tests/verify.js](../tests/verify.js)

#### Contract init 
```
@action init
@param token_contract_address - DAT PRC20 token contract address
@param market_contract_address - DAT market contract address
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
@param address - Change DAT PRC20 token contract address
```

#### Query token contract address
```
@action get_token_contract
```

#### Change market contract
```
@action set_market_contract
@param address - Change DAT market contract address
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

#### Update miner by enclave_public_key & enclave_signature
```
@action update_miner
@param enclave_public_key - SGX enclave public key
@param reward_address - miner address which receive rewards
@param enclave_signature - SGX signature
```

#### Unregister miner by enclave_public_key & enclave_signature
```
@action unregister_miner
@param enclave_public_key - SGX enclave public key
@param enclave_signature - SGX signature
```

#### Submit enclave new deal proof
```
@action submit_new_deal_proof
@param enclave_public_key - SGX enclave public key
@param enclave_timestamp - SGX timestamp
@param stored_files - file list which storage provider stored
@param enclave_signature - SGX signature
```

#### Submit enclave storage proof
```
@action submit_storage_proof
@param enclave_public_key - SGX enclave public key
@param enclave_timestamp - SGX timestamp
@param enclave_plot_size - storage provider plot size
@param stored_files - file list which storage provider stored
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