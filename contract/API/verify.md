## The verify contract docs

The `verify` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for hackathon's core functionality.

### Testnet Contract address
```
lat1kfnefgxrvn3c8wn5p2mat2j2mvqsq2g2vs5cfs
```

### Test cases for verify contract
[tests/contract-test.js](../tests/contract-test.js)

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

#### Change mining contract
```
@action set_mining_contract
@param address - Change mining contract address
```

#### Query mining contract
```
@action get_mining_contract
```

#### Register miner by enclave_public_key
```
@action register_miner
@param enclave_public_key - SGX enclave public key
@param reward_address - address of miner receiving reward
@param staker_reward_ratio - staker reward ratio(0 - 100)
```

#### Pledge DAT token
```
@action pledge_miner
@param enclave_public_key - SGX enclave public key
@param amount - token amount
```

#### Unpledge DAT token
```
@action unpledge_miner
@param enclave_public_key - SGX enclave public key
```

#### Verify signature
```
@action verify_signature
@param enclave_public_key - SGX enclave public key
@param enclave_timestamp - SGX timestamp
@param enclave_idle_size - miner idle size
@param added_files - added file list
@param deleted_files - deleted file list
@param enclave_signature - SGX signature
@param enclave_lat_address - LAT address that the signature should match
```

#### Update miner
```
@action update_miner
@param enclave_public_key - SGX enclave public key
@param reward_address - address of miner receiving reward
@param staker_reward_ratio - staker reward ratio(0 - 100)
```

#### Unregister miner
```
@action unregister_miner
@param enclave_public_key - SGX enclave public key
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
@param enclave_idle_size - miner idle size
@param added_files - added file list
@param deleted_files - deleted file list
@param enclave_signature - SGX signature
```

#### Query last enclave proof
```
@action get_storage_proof
@param enclave_public_key - SGX enclave public key
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

#### Get miner reward address by enclave_public_key
```
@action get_miner_reward_address
@param enclave_public_key - SGX enclave public key
```

#### DAT token holder stake token to miner
```
@action stake_token
@param enclave_public_key - SGX enclave public key
@param amount - token amount
```

#### DAT token holder unstake token from miner
```
@action unstake_token
@param enclave_public_key - SGX enclave public key
@param amount - token amount
```

#### DAT token holder claim stake reward
```
@action claim_stake_reward
```

#### Get stake record by from
```
@action get_stake_by_from
@param from - DAT token holder
@param skip - how many records should be skipped
```

#### Get stake record by miner
```
@action get_stake_by_miner
@param enclave_public_key - miner enclave public key
@param skip - how many records should be skipped
```

### Contract event list
```
PLATON_EVENT0(RegisterMiner, string);
PLATON_EVENT0(PledgeMiner, string);
PLATON_EVENT0(UnpledgeMiner, string);
PLATON_EVENT0(UpdateMiner, string);
PLATON_EVENT0(UnregisterMiner, string);
PLATON_EVENT0(FillDeal, string);
PLATON_EVENT0(WithdrawDeal, string);
PLATON_EVENT0(SubmitStorageProof, string);
PLATON_EVENT0(SubmitMinerInfo, Address);
PLATON_EVENT0(StakeToken, Address);
PLATON_EVENT0(UnstakeToken, Address);
PLATON_EVENT0(ClaimStakeReward, Address);
```