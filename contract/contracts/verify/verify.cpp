#undef NDEBUG
#include "verify.hpp"

namespace hackathon {

void verify::init(const Address& token_contract_address,
                  const Address& market_contract_address) {
  // set owner
  platon::set_owner();

  // set token contract
  token_contract.self() = token_contract_address;

  // set market contract
  market_contract.self() = market_contract_address;

  total_capacity.self() = 0;
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

// Add miner by enclave_public_key
void verify::register_miner(const string& enclave_public_key,
                            const Address& reward_address,
                            const string& enclave_signature) {
  require_auth(enclave_public_key, enclave_signature);
  platon_assert(!miner_map.contains(enclave_public_key),
                "the enclave_public_key is already exists");

  // check sender DAT balance
  Address sender = platon_caller();
  auto balance_result = platon_call_with_return_value<u128>(
      token_contract.self(), uint32_t(0), uint32_t(0), "balanceOf", sender);

  // ensure cross contract called successfully
  platon_assert(balance_result.second, "check balance failed");
  // ensure sender balance is >= deal reward
  u128 balance = balance_result.first;
  platon_assert(balance >= kLockedAmount,
                "sender balance is less than " + std::to_string(kLockedAmount));

  // transfer register DAT from sender to verify contract
  Address self = platon_address();
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender,
      self, kLockedAmount);
  DEBUG("token contract: ", token_contract.self().toString());
  DEBUG("sender: ", sender.toString());
  DEBUG("receiver: ", self.toString());
  DEBUG("kLockedAmount: ", std::to_string(kLockedAmount));

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "register miner failed");

  // add miner
  miner info;
  info.enclave_public_key = enclave_public_key;
  info.reward_address = reward_address;
  info.sender = platon_caller();
  miner_map.insert(enclave_public_key, info);

  PLATON_EMIT_EVENT1(RegisterMiner, enclave_public_key);
}

// Modify miner info by enclave_public_key
void verify::update_miner(const string& enclave_public_key,
                          const Address& reward_address,
                          const string& enclave_signature) {
  require_auth(enclave_public_key, enclave_signature);
  platon_assert(miner_map.contains(enclave_public_key),
                "the enclave_public_key is not exists");

  // update miner
  miner info;
  info.enclave_public_key = enclave_public_key;
  info.reward_address = reward_address;
  info.sender = platon_caller();
  miner_map[enclave_public_key] = info;

  PLATON_EMIT_EVENT0(UpdateMiner, enclave_public_key);
}

// Erase miner by enclave_public_key
void verify::unregister_miner(const string& enclave_public_key,
                              const string& enclave_signature) {
  require_auth(enclave_public_key, enclave_signature);
  platon_assert(miner_map.contains(enclave_public_key),
                "the enclave_public_key is not exists");
  miner_map.erase(enclave_public_key);

  PLATON_EMIT_EVENT0(UnregisterMiner, enclave_public_key);
}

// check if enclave_public_key is registered or not
bool verify::is_registered(const string& enclave_public_key) {
  return miner_map.contains(enclave_public_key);
}

bool verify::require_auth(const string& message,
                          const string& enclave_signature) {
  return true;
}

// Test signature
void verify::test(const string& message, const string& enclave_signature) {
  DEBUG("message: " + message);
  DEBUG("enclave_signature: " + enclave_signature);

  byte hashed_value[32];
  platon::platon_sha256(asBytes(message), hashed_value);

  Address recovered_address;
  auto ret =
      platon::platon_ecrecover(h256(hashed_value, sizeof(hashed_value)),
                               fromHex(enclave_signature), recovered_address);

  DEBUG("ret: " + std::to_string(ret));
  DEBUG("recovered_address: " + recovered_address.toString());
}

// Submit enclave new deal proof
void verify::fill_deal(const string& enclave_public_key,
                       const string& enclave_timestamp,
                       const vector<cid_file> stored_files,
                       const string& enclave_signature) {
  require_auth(enclave_public_key, enclave_signature);

  // call add_storage_provider of market.cpp
  Address sender = platon_caller();
  auto result = platon_call_with_return_value<bool>(
      market_contract.self(), uint32_t(0), uint32_t(0), "fill_deal",
      enclave_public_key, stored_files);

  platon_assert(result.first && result.second, "platon_call fill_deal failed");

  PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);
}

// Submit enclave proof
void verify::submit_storage_proof(const string& enclave_public_key,
                                  const string& enclave_timestamp,
                                  const u128& enclave_plot_size,
                                  const vector<cid_file> stored_files,
                                  const string& enclave_signature) {
  require_auth(enclave_public_key, enclave_signature);

  // update storage provider proof
  storage_proof proof;
  proof.enclave_timestamp = enclave_timestamp;
  proof.enclave_plot_size = enclave_plot_size;
  proof.enclave_signature = enclave_signature;
  storage_proof_map[enclave_public_key] = proof;

  // call update_storage_proof of market.cpp
  Address sender = platon_caller();
  auto result = platon_call_with_return_value<bool>(
      market_contract.self(), uint32_t(0), uint32_t(0), "update_storage_proof",
      enclave_public_key, stored_files);

  platon_assert(result.first && result.second,
                "platon_call update_storage_proof failed");

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
                "the enclave_public_key is not exists");
  return miner_map[enclave_public_key].reward_address;
}
}  // namespace hackathon