## The market contract API docs

The `market` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for platon-hackathon's core functionality.

### Testnet Contract address
```
lat10xhguelyz63wn7hsrmastqt52esla9axr5grfa
```

### Test cases for market contract
```
tests/market.js
```

#### Contract init 
```
@action init
@param token_contract_address - DAT PRC20 token contract address
@param verify_contract_address - DAT verify contract address
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

#### Change verify contract
```
@action set_verify_contract
@param address - Change DAT verify contract address
```

#### Query verify contract
```
@action get_verify_contract
```

#### Add deal
```
@action add_deal
@param cid - deal cid of IPFS network
@param size - deal files size
@param price - deal price per block
@param duration - deal duration (blocks)
@param storage_provider_required - amount of storage providers required
```

#### Get deal by cid
```
@action get_deal_by_cid
@param cid - deal cid of IPFS network
```

#### Get deal by sender
```
@action get_deal_by_sender
@param sender - account address which pushed add_deal transaction
@param skip - how many deals should be skipped
```

#### Get opened deals
```
@action get_opened_deal
@param skip - how many deals should be skipped
```

#### Storage provider fill deal(Verify Contract Only)
```
@action fill_deal
@param enclave_public_key - SGX enclave public key
@param deals - deals which storage provider stored
```

#### Storage provider update storage proof(Verify Contract Only)
```
@action update_storage_proof
@param enclave_public_key - SGX enclave public key
@param deals - deals which storage provider stored
```

#### Get storage provider last proof
```
@action get_storage_provider_proof
@param enclave_public_key - SGX enclave public key
```

#### Claim deal reward
```
@action claim_deal_reward
@param enclave_public_key - SGX enclave public key
```