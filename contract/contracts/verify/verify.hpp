#pragma once

#include <platon/platon.hpp>

using namespace platon;
using namespace platon::db;
using std::map;
using std::string;

namespace hackathon {

const u128 kTokenUnit = 1000000000000000000;  // DAT token decimal
const u128 kLockedAmount =
    Energon(100 * kTokenUnit)
        .Get();  // 100 DAT,the DAT token that storage provider need locked

struct miner {
 public:
  string enclave_public_key;  // SGX enclave public key
  Address reward_address;     // miner address which receive rewards
  Address sender;             // miner address which send transaction
  string primary_key() const { return enclave_public_key; }

  PLATON_SERIALIZE(miner, (enclave_public_key)(reward_address)(sender))
};

struct proof_of_capacity {
 public:
  string enclave_public_key;  // SGX enclave public key
  string enclave_timestamp;   // SGX enclave timestamp
  u128 enclave_capacity;      // SGX enclave committed capacity
  string enclave_signature;   // SGX enclave signature
  // string primary_key() const { return enclave_public_key; }

  PLATON_SERIALIZE(
      proof_of_capacity,
      (enclave_public_key)(enclave_timestamp)(enclave_capacity)(enclave_signature))
};

struct miner_info {
  Address sender;       // miner address which send transaction
  string name;          // miner name
  string peer_id;       // peer id of miner from IPFS network
  string country_code;  // country code
                        // (https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
  string url;           // url for miner website
  // Address primary_key() const { return sender; }

  PLATON_SERIALIZE(miner_info, (sender)(name)(peer_id)(country_code)(url))
};

CONTRACT dante_verify : public Contract {
 protected:
  StorageType<"token_contract"_n, Address>
      token_contract;                                    // dante token contract
  StorageType<"total_capacity"_n, u128> total_capacity;  // total capacity

  platon::db::Map<"miner"_n, string, miner> miner_map;  // miner table
  platon::db::Map<"proof_of_capacity"_n, string, proof_of_capacity>
      proof_of_capacity_map;  // proof_of_capacity table
  platon::db::Map<"miner_info"_n, Address, miner_info>
      miner_info_map;  // miner_info map

 public:
  ACTION void init(const Address &address);

  // Change contract owner
  ACTION bool set_owner(const Address &token_contract_address);

  // Query contract owner
  CONST string get_owner();

  // Change token contract
  ACTION bool set_token_contract(const Address &address);

  // Query token contract
  CONST string get_token_contract();

  // Add miner by enclave_public_key
  ACTION void register_miner(const string &enclave_public_key,
                             const Address &reward_address);

  // Modify miner info by enclave_public_key
  ACTION void update_miner(const string &enclave_public_key,
                           const Address &reward_address,
                           const string &enclave_signature);

  // Erase miner by enclave_public_key
  ACTION void unregister_miner(const string &enclave_public_key,
                               const string &enclave_signature);

  bool require_auth(const string &message, const string &enclave_signature);

  // Test signature
  ACTION void test(const string &message, const string &enclave_signature);

  // Submit enclave proof
  ACTION void submit_proof(
      const string &enclave_public_key, const string &enclave_timestamp,
      const u128 &enclave_capacity, const string &enclave_signature);

  // Query last enclave proof
  CONST proof_of_capacity get_submit_proof(const string &enclave_public_key);

  // Query miner info by enclave_public_key
  CONST miner get_miner(const string &enclave_public_key);

  // Query total capacity
  CONST u128 get_total_capacity();

  // Submit miner info
  ACTION void submit_miner_info(const string &name, const string &peer_id,
                                const string &country_code, const string &url);

  // Get miner info by sender
  CONST miner_info get_miner_info(const Address &sender);
};

PLATON_DISPATCH(
    dante_verify,
    (init)(set_owner)(get_owner)(set_token_contract)(get_token_contract)(register_miner)(update_miner)(unregister_miner)(test)(submit_proof)(get_submit_proof)(get_miner)(get_total_capacity)(submit_miner_info)(get_miner_info))
}  // namespace hackathon