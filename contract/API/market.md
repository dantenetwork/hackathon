## The market contract docs

The `market` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for platon-hackathon's core functionality.

### Testnet Contract address
```
lat13vzcph47kceqvxcu8urq22c7usuncaskymg4d0
```

### Test cases for market contract
[tests/market.js](../tests/market.js)

### API List

#### Contract init 
```
@action init
@param token_contract_address - PRC20 token contract address
@param verify_contract_address - verify contract address
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

#### Change verify contract
```
@action set_verify_contract
@param address - Change verify contract address
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

### Contract event List

```
PLATON_EMIT_EVENT2(SetOwner, platon_caller(), address);
PLATON_EMIT_EVENT2(SetTokenContract, platon_caller(), address);
PLATON_EMIT_EVENT2(SetVerifyContract, platon_caller(), address);
PLATON_EMIT_EVENT2(AddDeal, platon_caller(), cid);
PLATON_EMIT_EVENT2(FillDeal, platon_caller(), enclave_public_key, deals);
PLATON_EMIT_EVENT2(UpdateStorageProof, platon_caller(), enclave_public_key, deals);
PLATON_EMIT_EVENT2(ClaimReward, platon_caller(), enclave_public_key);
```
