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

// Change mining contract address
bool verify::set_mining_contract(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change mining contract");
  mining_contract.self() = address;
  return true;
}

// Query mining contract
string verify::get_mining_contract() {
  return mining_contract.self().toString();
}

// Register miner by enclave_public_key
void verify::register_miner(const string& enclave_public_key,
                            const Address& reward_address,
                            const uint8_t& staker_reward_ratio) {
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
  DEBUG("enclave_public_key address: " + enclave_public_key);
  DEBUG("enclave_public_key lat address: " + enclave_lat_address.toString());

  platon_assert(staker_reward_ratio <= 100,
                "staker_reward_ratio can't larger than 100");

  // register miner
  miner info;
  info.enclave_public_key = enclave_public_key;
  info.enclave_lat_address = enclave_lat_address;
  info.reward_address = reward_address;
  info.sender = platon_caller();
  info.staker_reward_ratio = staker_reward_ratio;
  miner_map.insert(enclave_public_key, std::move(info));

  miner_count.self() += 1;

  // pass register block num to mining contract
  auto register_result = platon_call_with_return_value<bool>(
      mining_contract.self(), uint32_t(0), uint32_t(0), "set_register_block",
      enclave_lat_address, platon_block_number());

  DEBUG("set register block result: " + std::to_string(register_result.first) +
        " " + std::to_string(register_result.second));

  // platon_assert(register_result.first && register_result.second,
  //               "Set register block failed");

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

  if (current_miner.miner_staked_token > 0) {
    platon_assert(
        current_miner.miner_pledged_token + amount >=
            current_miner.miner_staked_token / kMaxHolderStakeToMinerRatio,
        "Miner total pledge token can't less than staked token");
  }

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
  DEBUG("storage_size " + std::to_string(storage_size));

  // update miner pledged info
  current_miner.miner_pledged_token += amount;
  current_miner.miner_pledged_storage_size += storage_size;
  miner_map[enclave_public_key] = std::move(current_miner);

  PLATON_EMIT_EVENT0(PledgeMiner, enclave_public_key);
}

void verify::unpledge_miner(const string& enclave_public_key) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender can unpledge miner");

  // ensure total count of filled_deal is 0
  auto count_result = platon_call_with_return_value<uint32_t>(
      market_contract.self(), uint32_t(0), uint32_t(0),
      "get_deal_count_by_miner", enclave_public_key);

  // ensure cross contract called successfully
  platon_assert(count_result.second,
                "Get deal count by enclave_public_key failed");

  platon_assert(count_result.first == 0, "miner filled deal is not empty");

  // transfer pledged DAT from verify contract to sender
  Address self = platon_address();
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transfer", sender,
      current_miner.miner_pledged_token);

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "Unpledge miner failed");

  // update current miner info
  current_miner.miner_pledged_token = 0;
  current_miner.miner_pledged_storage_size = 0;
  miner_map[enclave_public_key] = std::move(current_miner);

  DEBUG("unpledge miner " + enclave_public_key);
  PLATON_EMIT_EVENT0(UnpledgeMiner, enclave_public_key);
}

// verify intel SGX signature
bool verify::verify_signature(const string& enclave_public_key,
                              const uint64_t& enclave_timestamp,
                              const u128& enclave_idle_size,
                              const vector<filled_deal> added_files,
                              const vector<filled_deal> deleted_files,
                              const string& enclave_signature,
                              const Address& enclave_lat_address) {
  // fill param
  string param = enclave_public_key + std::to_string(enclave_timestamp) +
                 std::to_string(enclave_idle_size);

  for (vector<filled_deal>::const_iterator added_itr = added_files.begin();
       added_itr != added_files.end(); ++added_itr) {
    param += added_itr->cid;
    param += std::to_string(added_itr->size);
  }

  for (vector<filled_deal>::const_iterator deleted_itr = deleted_files.begin();
       deleted_itr != deleted_files.end(); ++deleted_itr) {
    param += deleted_itr->cid;
    param += std::to_string(deleted_itr->size);
  }

  DEBUG("param: " + param);
  byte result[32];
  platon::platon_sha256(asBytes(param), result);

  string hashed_value = "";
  // recover public key
  Address recovered_address;
  auto ret =
      platon::platon_ecrecover(h256(result, sizeof(result)),
                               fromHex(enclave_signature), recovered_address);
  DEBUG(ret);
  DEBUG(recovered_address.toString());
  // platon_assert(ret == 0 && recovered_address == enclave_lat_address,
  //               "Verify signature failed");
  return true;  // TODO ,temporary return true for DEBUG
}

// Modify miner info by enclave_public_key
void verify::update_miner(const string& enclave_public_key,
                          const Address& reward_address,
                          const uint8_t& staker_reward_ratio) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner info = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == info.sender, "Only original sender can update miner");

  platon_assert(staker_reward_ratio <= 100,
                "staker_reward_ratio can't larger than 100");

  // update miner
  info.reward_address = reward_address;
  info.staker_reward_ratio = staker_reward_ratio;
  miner_map[enclave_public_key] = std::move(info);

  PLATON_EMIT_EVENT0(UpdateMiner, enclave_public_key);
}

// Erase miner by enclave_public_key
void verify::unregister_miner(const string& enclave_public_key) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");
  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender can unregister miner");

  platon_assert(current_miner.miner_pledged_token == 0,
                "Please unpledge token before unregister");

  // pass register block num to mining contract
  auto unregister_result = platon_call_with_return_value<bool>(
      mining_contract.self(), uint32_t(0), uint32_t(0), "erase_register_block",
      current_miner.enclave_lat_address);

  platon_assert(unregister_result.first && unregister_result.second,
                "Erase register block failed");

  miner_map.erase(enclave_public_key);

  miner_count.self() -= 1;

  PLATON_EMIT_EVENT0(UnregisterMiner, enclave_public_key);
}

// check if enclave_public_key is registered or not
bool verify::is_registered(const string& enclave_public_key) {
  return miner_map.contains(enclave_public_key);
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

  platon_assert(result.first && result.second, "Withdraw deal failed");

  PLATON_EMIT_EVENT0(WithdrawDeal, enclave_public_key);
}

// Update enclave proof
void verify::update_storage_proof(const string& enclave_public_key,
                                  const uint64_t& enclave_timestamp,
                                  const u128& enclave_idle_size,
                                  const vector<filled_deal>& added_files,
                                  const vector<filled_deal>& deleted_files,
                                  const string& enclave_signature) {
  platon_assert(miner_map.contains(enclave_public_key),
                "The enclave_public_key is not exists");

  miner current_miner = miner_map[enclave_public_key];
  Address sender = platon_caller();
  platon_assert(sender == current_miner.sender,
                "Only original sender of miner can update storage proof");

  verify_signature(enclave_public_key, enclave_timestamp, enclave_idle_size,
                   added_files, deleted_files, enclave_signature,
                   current_miner.enclave_lat_address);

  // update miner proof
  u128 miner_previous_size = 0;
  storage_proof proof;

  // if previous storage_proof exists
  if (storage_proof_map.contains(enclave_public_key)) {
    proof = storage_proof_map[enclave_public_key];

    // ensure timestamp is larger than previous timestamp
    platon_assert(proof.enclave_timestamp < enclave_timestamp,
                  "Timestamp can't smaller than previous timestamp");
    miner_previous_size = proof.enclave_idle_size + proof.enclave_task_size;
  }
  // minus previous miner size
  DEBUG("miner_previous_size: " + std::to_string(miner_previous_size));
  total_capacity.self() -= miner_previous_size;
  proof.enclave_timestamp = enclave_timestamp;
  // proof.enclave_task_size = enclave_task_size;
  proof.enclave_signature = enclave_signature;

  //////////////////////////////////////////////
  // submit storage proof to market contract  //
  //////////////////////////////////////////////

  // ensure task size is less than miner_remaining_quota
  u128 miner_remaining_quota =
      current_miner.miner_pledged_storage_size - proof.enclave_task_size;
  // call update_storage_proof of market.cpp
  auto market_result = platon_call_with_return_value<int64_t>(
      market_contract.self(), uint32_t(0), uint32_t(0), "update_storage_proof",
      enclave_public_key, added_files, deleted_files, miner_remaining_quota);

  platon_assert(market_result.second, "Update storage proof failed");

  int64_t task_size_changed = market_result.first;

  platon_assert(task_size_changed <= miner_remaining_quota,
                "market contract calculate miner_remaining_quota failed");

  // update miner task size & idle size
  proof.enclave_task_size += task_size_changed;
  proof.enclave_idle_size = enclave_idle_size;

  // ensure miner_task_reward_capacity is less than miner_pledged_storage_size
  u128 miner_task_reward_capacity = std::min(
      proof.enclave_task_size, current_miner.miner_pledged_storage_size);

  // ensure pledged_staked_capacity is less than miner_pledged_storage_size * 10
  u128 pledged_staked_capacity = std::min(
      current_miner.miner_pledged_storage_size +
          current_miner.miner_staked_storage_size,
      current_miner.miner_pledged_storage_size * kMaxHolderStakeToMinerRatio);

  // ensure miner_reward_capacity is less than pledged_staked_capacity
  // if miner pledge token is 0 after unpledged, then miner staked size is 0

  u128 miner_reward_capacity =
      std::min(proof.enclave_task_size + proof.enclave_idle_size,
               pledged_staked_capacity);

  // update miner storage proof
  storage_proof_map[enclave_public_key] = std::move(proof);

  DEBUG("miner_reward_capacity: " + std::to_string(miner_reward_capacity));
  total_capacity.self() += miner_reward_capacity;

  //////////////////////////////////////////////
  // submit storage proof to mining contract  //
  //////////////////////////////////////////////

  // call update_storage of mining.cpp
  auto mining_result = platon_call_with_return_value<claim_info>(
      mining_contract.self(), uint32_t(0), uint32_t(0), "update_storage",
      current_miner.enclave_lat_address, miner_reward_capacity,
      miner_task_reward_capacity);

  platon_assert(mining_result.second, "call mining contract failed");

  Energon contract_balance = platon_balance(platon_address());
  DEBUG("verify_contract balance: " + std::to_string(contract_balance.Get()));

  // //////////////////////////////////////////////
  // //          calculate staking reward        //
  // //////////////////////////////////////////////
  u128 reward = mining_result.first.rewards;
  DEBUG("mining reward: " + std::to_string(reward));

  if (reward > 0) {
    uint64_t period_end_block_num = mining_result.first.cur_period_end_block;

    u128 miner_reward = 0;
    // calculate miner reward
    if (current_miner.miner_staked_token == 0) {
      miner_reward = reward;
      DEBUG("miner_reward: " + std::to_string(miner_reward));
      miner_mining_reward_map[current_miner.sender] += miner_reward;
    } else {
      miner_reward = reward / 100 * current_miner.staker_reward_ratio;
      DEBUG("miner_reward: " + std::to_string(miner_reward));
      miner_mining_reward_map[current_miner.sender] += miner_reward;

      // calculate staker's reward
      u128 staker_reward = reward - miner_reward;
      DEBUG("staker_reward: " + std::to_string(staker_reward));

      // calculate staker's total staked token at that period
      auto vect_iter = stake_table.get_index<"enclave_public_key"_n>();
      u128 unclaimed_stake_token = 0;
      for (auto itr = vect_iter.cbegin(enclave_public_key);
           itr != vect_iter.cend(enclave_public_key); itr++) {
        // ensure only valid staker is rewarded
        if (itr->stake_block_num <= period_end_block_num) {
          unclaimed_stake_token += itr->amount;
        }
      }
      DEBUG("unclaimed_stake_token: " + std::to_string(unclaimed_stake_token));

      staker_mining_reward new_staker_mining_reward;
      // total staker mining reward
      new_staker_mining_reward.total_reward = staker_reward;
      // total staked token
      new_staker_mining_reward.unclaimed_stake_token = unclaimed_stake_token;
      // reward for each staked token
      new_staker_mining_reward.reward_for_each_token =
          staker_reward / (unclaimed_stake_token / kTokenUnit);
      // reward period end block num
      new_staker_mining_reward.period_end_block =
          mining_result.first.cur_period_end_block;

      // push current reward period into staker_mining_reward_map
      vector<staker_mining_reward> reward_vector;
      if (staker_mining_reward_map.contains(enclave_public_key)) {
        reward_vector = staker_mining_reward_map[enclave_public_key];
      }
      reward_vector.push_back(std::move(new_staker_mining_reward));
      staker_mining_reward_map[enclave_public_key] = std::move(reward_vector);
    }
  }

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

  miner_info_map[sender] = std::move(info);

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

// DAT token holder stake token to miner
void verify::stake_token(const string& enclave_public_key, const u128& amount) {
  Address sender = platon_caller();

  // query current staking record
  auto vect_iter = stake_table.get_index<"from"_n>();

  vector<staker_mining_reward> reward_vector;
  // find all stake records
  for (auto itr = vect_iter.cbegin(sender); itr != vect_iter.cend(sender);
       itr++) {
    // if from -> miner stake record is exists
    if (itr->enclave_public_key == enclave_public_key) {
      // claim stake reward and erase record
      verify::claim_stake_reward();
      vect_iter.erase(itr);
      break;
    }
  }

  // transfer register DAT from verify contract to sender
  Address self = platon_address();

  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender,
      self, amount);

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "Stake to miner failed");

  // add stake record
  stake_table.emplace([&](auto& stake) {
    stake.from = sender;
    stake.enclave_public_key = enclave_public_key;
    stake.amount = amount;
    stake.stake_block_num = platon_block_number();
  });

  DEBUG(sender.toString() + " stake to miner " + enclave_public_key + " " +
        std::to_string(amount));

  miner current_miner = miner_map[enclave_public_key];

  // update miner staked token & miner staked storage size
  platon_assert(
      current_miner.miner_staked_token + amount <=
          current_miner.miner_pledged_token * kMaxHolderStakeToMinerRatio,
      "Stake token can't larger than miner_pledged_token * 9");

  current_miner.miner_staked_token += amount;
  current_miner.miner_staked_storage_size +=
      (amount / kTokenUnit) * kBytesPerPledgedDAT;

  miner_map[enclave_public_key] = std::move(current_miner);
  PLATON_EMIT_EVENT0(StakeToken, sender);
}

// DAT token holder unstake token from miner
void verify::unstake_token(const string& enclave_public_key,
                           const u128& amount) {
  verify::claim_stake_reward();

  Address sender = platon_caller();

  auto vect_iter = stake_table.get_index<"from"_n>();

  // if user has staked multi times, then all records have to be processed.
  u128 remaining_unstake_amount = amount;
  DEBUG("remaining_unstake_amount: " +
        std::to_string(remaining_unstake_amount));

  for (auto itr = vect_iter.cbegin(sender);
       itr != vect_iter.cend(sender) && remaining_unstake_amount > 0; itr++) {
    // if staked amount is less than unstake amount, erase stake record
    if (itr->amount <= remaining_unstake_amount) {
      vect_iter.erase(itr);
    } else {
      // staked amount of current record is larger than unstake amount
      vect_iter.modify(itr, [&](auto& record) {
        record.amount -= remaining_unstake_amount;
      });
    }
    remaining_unstake_amount -= itr->amount;
  }

  DEBUG("remaining_unstake_amount: " +
        std::to_string(remaining_unstake_amount));
  platon_assert(remaining_unstake_amount == 0,
                "Unstake token can't larger than staked token");

  // transfer token to DAT token holder
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transfer", sender,
      amount);

  // ensure cross contract called successfully
  platon_assert(transfer_result.first && transfer_result.second,
                "Unstake token failed");

  DEBUG(sender.toString() + " unstake token " + std::to_string(amount));

  // update miner staked info
  miner current_miner = miner_map[enclave_public_key];
  current_miner.miner_staked_token -= amount;
  current_miner.miner_staked_storage_size -=
      (amount / kTokenUnit) * kBytesPerPledgedDAT;

  miner_map[enclave_public_key] = std::move(current_miner);

  PLATON_EMIT_EVENT0(UnstakeToken, sender);
}

// miner claim mining reward
bool verify::claim_miner_reward() {
  Address sender = platon_caller();
  if (!miner_mining_reward_map.contains(sender)) {
    return false;
  }

  u128 reward_balance = miner_mining_reward_map[sender];
  if (reward_balance == 0) {
    return false;
  }

  DEBUG("miner claim mining reward: " + std::to_string(reward_balance));

  // TODO
  // auto transfer_result = platon_call_with_return_value<bool>(
  //     token_contract.self(), uint32_t(0), uint32_t(0), "transfer", sender,
  //     reward_balance);

  // // ensure cross contract called successfully
  // platon_assert(transfer_result.first && transfer_result.second,
  //               "Claim miner mining reward failed");

  miner_mining_reward_map[sender] = 0;

  // DEBUG(sender.toString() + " claim miner mining reward " +
  //       std::to_string(reward_balance));

  PLATON_EMIT_EVENT0(ClaimStakeReward, sender);
  return true;
}

// DAT token holder claim stake reward
bool verify::claim_stake_reward() {
  // ensure stake_block_num < mining_period_end_block_num
  Address sender = platon_caller();

  // valid stake record
  auto vect_iter = stake_table.get_index<"from"_n>();

  vector<staker_mining_reward> reward_vector;
  u128 total_stake_reward = 0;

  // find all stake records
  for (auto itr = vect_iter.cbegin(sender); itr != vect_iter.cend(sender);
       itr++) {
    // query staking record
    auto enclave_public_key = itr->enclave_public_key;
    auto stake_block_num = itr->stake_block_num;
    auto stake_amount = itr->amount;

    // ensure miner claimed mining reward
    if (staker_mining_reward_map.contains(enclave_public_key)) {
      reward_vector = staker_mining_reward_map[enclave_public_key];

      DEBUG("staker_mining_reward_map length: " +
            std::to_string(reward_vector.size()));
      // iterator mining reward for each period
      for (auto staker_reward_itr = reward_vector.begin();
           staker_reward_itr != reward_vector.end();) {
        // ensure stake block num <= mining period end block num

        if (stake_block_num <= staker_reward_itr->period_end_block) {
          auto stake_reward = staker_reward_itr->reward_for_each_token *
                              (stake_amount / kTokenUnit);
          total_stake_reward += stake_reward;

          DEBUG("staker claim mining reward, receiver: " + sender.toString() +
                " staked: " + std::to_string(stake_amount) + " reward: " +
                std::to_string(stake_reward) + " reward_for_each_token: " +
                std::to_string(staker_reward_itr->reward_for_each_token));

          // update staker_reward_itr unclaimed_stake_token
          staker_reward_itr->unclaimed_stake_token -= stake_amount;

          // erase staker mining reward's record if unclaimed_stake_token = 0
          if (staker_reward_itr->unclaimed_stake_token == 0) {
            reward_vector.erase(staker_reward_itr);
          } else {
            ++staker_reward_itr;
          }
        }
      }
      DEBUG("staker_mining_reward_map length: " +
            std::to_string(reward_vector.size()));
      staker_mining_reward_map[enclave_public_key] = std::move(reward_vector);
    }
  }

  DEBUG("total_stake_reward: " + std::to_string(total_stake_reward));
  // TODO
  // if (total_stake_reward > 0) {
  //   auto transfer_result = platon_call_with_return_value<bool>(
  //       token_contract.self(), uint32_t(0), uint32_t(0), "transfer",
  //       sender, total_stake_reward);

  //   // ensure cross contract called successfully
  //   platon_assert(transfer_result.first && transfer_result.second,
  //                 "Claim stake reward failed");
  // }

  return true;
}  // namespace hackathon

// Get stake record by from
vector<stake> verify::get_stake_by_from(const Address& from,
                                        const uint8_t& skip) {
  vector<stake> stake_records;
  auto vect_iter = stake_table.get_index<"from"_n>();
  uint8_t index = 0;   // the index of current stake record in iterator
  uint8_t total = 20;  // return 20 stake_records per request

  for (auto itr = vect_iter.cbegin(from);
       itr != vect_iter.cend(from) && total > 0; itr++, index++) {
    // detect stake_deal.from == from
    if (index >= skip && itr->from == from) {
      stake ret;
      ret.from = itr->from;
      ret.enclave_public_key = itr->enclave_public_key;
      ret.amount = itr->amount;
      ret.stake_block_num = itr->stake_block_num;
      stake_records.push_back(ret);
      total--;
    }
  }
  return stake_records;
}

// Get stake record by miner
vector<stake> verify::get_stake_by_miner(const string& enclave_public_key,
                                         const uint8_t& skip) {
  vector<stake> stake_records;
  auto vect_iter = stake_table.get_index<"enclave_public_key"_n>();
  uint8_t index = 0;   // the index of current stake record in iterator
  uint8_t total = 20;  // return 20 stake_records per request

  for (auto itr = vect_iter.cbegin(enclave_public_key);
       itr != vect_iter.cend(enclave_public_key) && total > 0; itr++, index++) {
    // detect stake_deal.enclave_public_key == enclave_public_key
    if (index >= skip && itr->enclave_public_key == enclave_public_key) {
      stake ret;
      ret.from = itr->from;
      ret.enclave_public_key = itr->enclave_public_key;
      ret.amount = itr->amount;
      ret.stake_block_num = itr->stake_block_num;
      stake_records.push_back(ret);
      total--;
    }
  }
  return stake_records;
}
}  // namespace hackathon