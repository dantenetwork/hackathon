## The market contract docs

The `market` smart contract is provided by `dante network team` as a sample platon wasm contract, and it defines the structures and actions needed for hackathon's core functionality.

### Testnet Contract address
```
lat13vzcph47kceqvxcu8urq22c7usuncaskymg4d0
```

### Test cases for market contract
[tests/contract-test.js](../tests/contract-test.js)

### API list

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
@param miner_required - amount of miners required
```

#### Renewal deal
```
@action renewal_deal
@param cid - deal cid of IPFS network
@param duration - deal duration (blocks)
```

#### Withdraw deal
```
@action withdraw_deal
@param enclave_public_key - miner enclave_public_key
@param cid - deal cid of IPFS network
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

#### miner update storage proof and ensure signature is verified by verify_contract
```
@action update_storage_proof
@param enclave_public_key - SGX enclave public key
@param added_files - deals which miner added
@param deleted_files - deals which miner deleted
```

#### Get miner last proof
```
@action get_storage_proof
@param enclave_public_key - SGX enclave public key
```

#### Claim deal reward
```
@action claim_deal_reward
@param enclave_public_key - SGX enclave public key
```

#### Get deal count
```
@action get_deal_count
```

#### Get all deals filled by miner
```
@action get_deals_by_miner
@param enclave_public_key - SGX enclave public key
```

#### Get the number of deals filled by miners
```
@action get_deal_count_by_miner
@param enclave_public_key - SGX enclave public key
```

### Contract event list

```
PLATON_EVENT1(AddDeal, Address, string, u128);
PLATON_EVENT0(FillDeal, string);
PLATON_EVENT0(RenewalDeal, string);
PLATON_EVENT0(WithdrawDeal, string);
PLATON_EVENT0(UpdateStorageProof, string);
PLATON_EVENT1(ClaimDealReward, Address, string);
```
