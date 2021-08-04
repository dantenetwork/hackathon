#pragma once

#include <platon/platon.hpp>

#include "../math.hpp"

using namespace platon;
using namespace platon::db;
using std::map;
using std::string;
using std::vector;

namespace hackathon {

struct deal {
 public:
  string cid;            // deal cid of IPFS network
  uint8_t state = 0;     // current deal state, 0 = deal opened, 1= filled, 2 =
                         // closed, 3 = invalid (storage provider reported file
                         // size is larger than size of deal) , default as 0
  bool slashed = false;  // is slashed, default as false
  u128 size;             // deal files size
  u128 price;            // deal price per block
  u128 duration;         // deal duration (blocks)
  Address sender;        // deal sender
  uint8_t
      storage_provider_required;  // the amount of storage providers required
  u128 total_reward;              // deal total rewards
  u128 reward_balance;  // reward balance after storage provider claimed
  vector<string> storage_provider_list;  // storage provider list
  string primary_key() const { return cid; }
  uint8_t by_state() const { return state; }
  Address by_sender() const { return sender; }

  PLATON_SERIALIZE(
      deal,
      (cid)(state)(slashed)(size)(price)(duration)(sender)(storage_provider_required)(total_reward)(reward_balance)(storage_provider_list));
};

struct cid_file {
 public:
  string cid;  // deal cid
  u128 size;   // file size of deal
  PLATON_SERIALIZE(cid_file, (cid)(size));
};

struct storage_provider {
 public:
  uint64_t last_proof_block_num;  // last storage proof that provider submitted
  uint64_t
      last_claimed_block_num;  // the block number that last deal reward claimed
  vector<cid_file> deals;      // deals which provider stored

  PLATON_SERIALIZE(storage_provider,
                   (last_proof_block_num)(last_claimed_block_num)(deals));
};

CONTRACT market : public Contract {
 protected:
  StorageType<"token_contract"_n, Address>
      token_contract;  // dante token contract
  StorageType<"verify_contract"_n, Address>
      verify_contract;  // dante verify contract

  // deal table
  // UniqueIndex: cid
  // NormalIndex: state
  // NormalIndex: sender
  MultiIndex<
      "deal"_n, deal,
      IndexedBy<"cid"_n, IndexMemberFun<deal, string, &deal::primary_key,
                                        IndexType::UniqueIndex>>,
      IndexedBy<"state"_n, IndexMemberFun<deal, uint8_t, &deal::by_state,
                                          IndexType::NormalIndex>>,
      IndexedBy<"sender"_n, IndexMemberFun<deal, Address, &deal::by_sender,
                                           IndexType::NormalIndex>>>
      deal_table;

  // storage provider map
  platon::db::Map<"enclave_public_key"_n, string, storage_provider>
      storage_provider_map;

 public:
  ACTION void init(const Address &token_contract_address,
                   const Address &verify_contract_address);

  // Change contract owner
  ACTION bool set_owner(const Address &account);

  // Query contract owner
  CONST string get_owner();

  // Change token contract
  ACTION bool set_token_contract(const Address &address);

  // Query token contract
  CONST string get_token_contract();

  // Change verify contract
  ACTION bool set_verify_contract(const Address &address);

  // Query verify contract
  CONST string get_verify_contract();

  // Add deal
  ACTION void add_deal(const string &cid, const u128 &size, const u128 &price,
                       const u128 &duration,
                       const uint8_t &storage_provider_required);

  // Get deal by cid
  CONST deal get_deal_by_cid(const string &get_deal_by_cid);

  // Get deal by sender
  CONST vector<string> get_deal_by_sender(const Address &sender,
                                          const uint8_t &skip);

  // Get opened deals
  CONST vector<string> get_opened_deal(const uint8_t &skip);

  // add storage provider's enclave_public_key into storage_provider_list of
  // deal_table
  CONST bool add_storage_provider(const string &enclave_public_key,
                                  const vector<cid_file> &deals);

  // update storage provider proof
  CONST bool update_storage_proof(const string &enclave_public_key,
                                  const vector<cid_file> &deals);

  // claim deal reward
  CONST bool claim_deal_reward(const string &enclave_public_key);
};

PLATON_DISPATCH(
    market,
    (init)(set_owner)(get_owner)(set_token_contract)(get_token_contract)(add_deal)(get_deal_by_cid)(get_deal_by_sender)(get_opened_deal)(update_storage_proof)(claim_deal_reward))
}  // namespace hackathon