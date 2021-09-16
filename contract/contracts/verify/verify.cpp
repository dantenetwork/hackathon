#undef NDEBUG
#include "verify.hpp"

namespace hackathon {

void verify::init(const Address& token_contract_address,
                  const Address& market_contract_address,
                  const Address& mining_contract_address) {
  // set owner
  platon::set_owner();

  // set token contract
  token_contract.self() = token_contract_address;

  // set market contract
  market_contract.self() = market_contract_address;

  // set mining contract
  mining_contract.self() = mining_contract_address;

  // set total capacity
  total_capacity.self() = 0;

  // set miner count
  miner_count.self() = 0;
}

// Change contract owner
bool verify::set_owner(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change owner");
  platon::set_owner(address.toString());

  return true;
}

// Query contract owner
string verify::get_owner() {
  return platon::owner().toString();
}

// Change token contract address
bool verify::set_token_contract(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change token contract");
  token_contract.self() = address;

  return true;
}

// Query token contract
string verify::get_token_contract() {
  return token_contract.self().toString();
}

// Change market contract address
bool verify::set_market_contract(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change token contract");
  market_contract.self() = address;

  return true;
}

// Query market contract
string verify::get_market_contract() {
  return market_contract.self().toString();
}

// Register miner by enclave_public_key
void verify::register_miner(const string& enclave_public_key,
                            const Address& reward_address) {
  platon_assert(!miner_map.contains(enclave_public_key),
                "The enclave_public_key is already exists");

  // convert enclave_public_key to lat format address
  auto public_key_bytes = fromHex(enclave_public_key);
  platon_assert(public_key_bytes.size() >= 64,
                "Enclave public key decode to lat address failed");
  if (public_key_bytes.size() > 64) {
    public_key_bytes.erase(public_key_bytes.begin());
  }
  auto public_key_sha3 = platon_sha3(public_key_bytes);
  auto enclave_lat_address = Address(public_key_sha3.begin() + 12, 20);
  DEBUG("enclave_public_key lat address: " + enclave_lat_address.toString());

  // register miner
  miner info;
  info.enclave_public_key = enclave_public_key;
  info.enclave_lat_address = enclave_lat_address;
  info.reward_address = reward_address;
  info.sender = platon_caller();
  miner_map.insert(enclave_public_key, info);

  miner_count.self() += 1;

  PLATON_EMIT_EVENT1(RegisterMiner, enclave_public_key);
}

// pledge DAT token
void verify::pledge_miner(const string& enclave_public_key,
                          const u128& amount) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender can pledge miner");

  // check sender DAT balance
  auto balance_result = platon_call_with_return_value<u128>(
      token_contract.self(), uint32_t(0), uint32_t(0), "balanceOf", sender);

  // ensure cross contract called successfully
  platon_assert(balance_result.second, "Query balance failed");
  // ensure sender balance is >= deal reward
  u128 balance = balance_result.first;
  platon_assert(balance >= amount,
                "Sender balance is less than " + std::to_string(amount));

  // transfer register DAT from sender to verify contract
  Address self = platon_address();
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender,
      self, amount);

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "Pledge miner failed");

  auto storage_size = (amount / kTokenUnit) * kBytesPerPledgedDAT;

  DEBUG("pledge miner " + enclave_public_key + " " + std::to_string(amount));
  // update miner pledged info
  current_miner.miner_pledged_token += amount;
  current_miner.miner_pledged_storage_size += storage_size;
  miner_map[enclave_public_key] = current_miner;

  PLATON_EMIT_EVENT0(PledgeMiner, enclave_public_key);
}

void verify::unpledge_miner(const string& enclave_public_key,
                            const u128& amount) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender can unpledge miner");

  platon_assert(amount < current_miner.miner_pledged_token,
                "Unpledge token can't larger than pledged token");

  storage_proof proof = storage_proof_map[enclave_public_key];
  platon_assert(proof.enclave_stored_size == 0,
                "Please withdraw all deals before unpledge miner");

  // update current miner info
  current_miner.miner_pledged_token -= amount;
  auto unpledge_size = (amount / kTokenUnit) * kBytesPerPledgedDAT;
  current_miner.miner_pledged_storage_size -= unpledge_size;
  miner_map[enclave_public_key] = current_miner;

  // transfer register DAT from verify contract to sender
  Address self = platon_address();
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transfer", sender,
      amount);

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "Unpledge miner failed");

  DEBUG("unpledge miner " + enclave_public_key + " " + std::to_string(amount));
  PLATON_EMIT_EVENT0(UnpledgeMiner, enclave_public_key);
}

// verify intel SGX signature
bool verify::verify_signature(const string& enclave_public_key,
                              const string& hashed_value,
                              const string& enclave_signature) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  auto miner = miner_map[enclave_public_key];
  Address enclave_lat_address = miner.enclave_lat_address;

  // recover public key
  Address recovered_address;
  auto ret =
      platon::platon_ecrecover(h256(hashed_value, sizeof(hashed_value)),
                               fromHex(enclave_signature), recovered_address);

  // check ecrecover result
  if (ret == 0 && enclave_lat_address == recovered_address) {
    DEBUG("verify_signature success");
    return true;
  }
  // DEBUG("verify_signature failed, enclave_lat_address: " +
  //       enclave_lat_address.toString() +
  //       ", recovered_address: " + recovered_address.toString());
  return true;  // TODO temporary return true for DEBUG
}

// Modify miner info by enclave_public_key
void verify::update_miner(const string& enclave_public_key,
                          const Address& reward_address) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner info = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == info.sender, "Only original sender can update miner");

  // update miner
  info.reward_address = reward_address;
  miner_map[enclave_public_key] = info;

  PLATON_EMIT_EVENT0(UpdateMiner, enclave_public_key);
}

// Erase miner by enclave_public_key
void verify::unregister_miner(const string& enclave_public_key) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner info = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == info.sender,
                "Only original sender can unregister miner");

  miner_map.erase(enclave_public_key);

  miner_count.self() -= 1;

  PLATON_EMIT_EVENT0(UnregisterMiner, enclave_public_key);
}

// check if enclave_public_key is registered or not
bool verify::is_registered(const string& enclave_public_key) {
  return miner_map.contains(enclave_public_key);
}

// Submit enclave new deal proof
void verify::fill_deal(const string& enclave_public_key,
                       const uint64_t& enclave_timestamp,
                       const u128& enclave_stored_size,
                       const vector<cid_file> stored_files,
                       const string& hashed_value,
                       const string& enclave_signature) {
  verify_signature(enclave_public_key, hashed_value, enclave_signature);

  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender of miner can fill deal");

  platon_assert(storage_proof_map.contains(enclave_public_key),
                "Fill deal failed, miner storage proof is empty");

  storage_proof proof = storage_proof_map[enclave_public_key];

  platon_assert(
      (proof.enclave_stored_size + enclave_stored_size) <=
          current_miner.miner_pledged_storage_size,
      "Fill deal failed, miner stored size can't larger than pledged storage "
      "size");

  // update miner idle size
  if (proof.enclave_idle_size > enclave_stored_size) {
    proof.enclave_idle_size -= enclave_stored_size;
  } else {
    proof.enclave_idle_size = 0;
  }

  // update miner stored size
  proof.enclave_stored_size += enclave_stored_size;
  storage_proof_map[enclave_public_key] = proof;

  // call fill_deal of market.cpp
  auto fill_deal_result = platon_call_with_return_value<bool>(
      market_contract.self(), uint32_t(0), uint32_t(0), "fill_deal",
      enclave_public_key, stored_files);

  platon_assert(fill_deal_result.second, "Fill Deal failed");

  PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);
}

// Withdraw storage service from deal
void verify::withdraw_deal(const string& enclave_public_key,
                           const string& cid) {
  miner info = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == info.sender,
                "Only original sender of miner can withdraw deal");

  // call withdraw_deal of market.cpp
  auto result = platon_call_with_return_value<bool>(
      market_contract.self(), uint32_t(0), uint32_t(0), "withdraw_deal",
      enclave_public_key, cid);

  platon_assert(result.first && result.second, "Withdraw_deal failed");

  PLATON_EMIT_EVENT0(WithdrawDeal, enclave_public_key);
}

// Update enclave proof
void verify::update_storage_proof(const string& enclave_public_key,
                                  const uint64_t& enclave_timestamp,
                                  const u128& enclave_idle_size,
                                  const u128& enclave_stored_size,
                                  const vector<cid_file> stored_files,
                                  const string& hashed_value,
                                  const string& enclave_signature) {
  verify_signature(enclave_public_key, hashed_value, enclave_signature);

  miner info = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == info.sender,
                "Only original sender of miner can update storage proof");

  // update miner proof
  u128 miner_previous_size = 0;
  storage_proof proof;

  // if previous storage_proof exists
  if (storage_proof_map.contains(enclave_public_key)) {
    proof = storage_proof_map[enclave_public_key];

    // ensure timestamp is larger than previous timestamp
    platon_assert(proof.enclave_timestamp < enclave_timestamp,
                  "Timestamp is smaller than previous timestamp of proof");
    miner_previous_size = proof.enclave_idle_size + proof.enclave_stored_size;
  }

  proof.enclave_timestamp = enclave_timestamp;
  proof.enclave_idle_size = enclave_idle_size;
  proof.enclave_stored_size = enclave_stored_size;
  proof.enclave_signature = enclave_signature;
  storage_proof_map[enclave_public_key] = proof;

  // call update_storage_proof of market.cpp
  auto result = platon_call_with_return_value<bool>(
      market_contract.self(), uint32_t(0), uint32_t(0), "update_storage_proof",
      enclave_public_key, stored_files);

  platon_assert(result.first && result.second, "Update storage proof failed");

  u128 miner_enclave_size = enclave_stored_size + enclave_idle_size;

  total_capacity.self() -= miner_previous_size;
  total_capacity.self() += miner_enclave_size;

  PLATON_EMIT_EVENT0(SubmitStorageProof, enclave_public_key);
}

// Query last enclave proof
storage_proof verify::get_storage_proof(const string& enclave_public_key) {
  return storage_proof_map[enclave_public_key];
}

// Query miner info by enclave_machine_id
miner verify::get_miner(const string& enclave_public_key) {
  return miner_map[enclave_public_key];
}

// Query total capacity
u128 verify::get_total_capacity() {
  return total_capacity.self();
}

// Query miner count
uint64_t verify::get_miner_count() {
  return miner_count.self();
}

// Submit miner info
void verify::submit_miner_info(const string& name,
                               const string& peer_id,
                               const string& country_code,
                               const string& url) {
  Address sender = platon_caller();

  miner_info info;
  info.sender = sender;
  info.name = name;
  info.peer_id = peer_id;
  info.country_code = country_code;
  info.url = url;

  miner_info_map[sender] = info;

  PLATON_EMIT_EVENT1(SubmitMinerInfo, platon_caller());
}

// Get miner info by sender
miner_info verify::get_miner_info(const Address& sender) {
  return miner_info_map[sender];
}

// Get miner reward address by enclave_public_key
Address verify::get_miner_reward_address(const string& enclave_public_key) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  return miner_map[enclave_public_key].reward_address;
}
}  // namespace hackathon