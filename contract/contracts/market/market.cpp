#undef NDEBUG
#include "market.hpp"

namespace hackathon {
void market::init(const Address& token_contract_address,
                  const Address& verify_contract_address) {
  // set owner
  platon::set_owner();

  // set token contract address
  token_contract.self() = token_contract_address;

  // set verify contract address
  verify_contract.self() = verify_contract_address;

  // set deal count
  deal_count.self() = 0;
}

// Change contract owner
bool market::set_owner(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change owner");
  platon::set_owner(address.toString());

  return true;
}

// Query contract owner
string market::get_owner() {
  return platon::owner().toString();
}

// Change token contract address
bool market::set_token_contract(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change token contract");
  token_contract.self() = address;

  return true;
}

// Query token contract
string market::get_token_contract() {
  return token_contract.self().toString();
}

// Change verify contract
bool market::set_verify_contract(const Address& address) {
  platon_assert(platon::is_owner(), "Only owner can change verify contract");
  verify_contract.self() = address;

  return true;
}

// Query verify contract
string market::get_verify_contract() {
  return verify_contract.self().toString();
}

// ensure that current transaction is sent from verify contract
void market::require_verify_contract_auth() {
  platon_assert(platon_caller() == verify_contract.self(),
                "Caller is not equal with verify contract address");
}

void market::require_miner_registered(const string& enclave_public_key) {
  auto result = platon_call_with_return_value<bool>(
      verify_contract.self(), uint32_t(0), uint32_t(0), "is_registered",
      enclave_public_key);
  platon_assert(result.first && result.second, "The miner is not registered");
}

// add deal
void market::add_deal(const string& cid,
                      const u128& size,
                      const u128& price,
                      const u128& duration,
                      const int& miner_required) {
  // check if cid is exists
  auto vect_iter = deal_table.find<"cid"_n>(cid);
  platon_assert(vect_iter == deal_table.cend(), "Cid is already exists");

  Address sender = platon_caller();
  auto count = deal_table.count<"sender"_n>(sender);
  platon_assert(count <= kMaxDealEachSender,
                "Total deal count of sender can't larger than " +
                    std::to_string(kMaxDealEachSender));

  // calculate deal price
  u128 deal_price = hackathon::safeMul(price, duration);
  u128 total_reward = hackathon::safeMul(deal_price, miner_required);

  // transfer DAT from sender to market contract
  Address self = platon_address();

  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender,
      self, total_reward);

  platon_assert(transfer_result.first && transfer_result.second,
                "Add deal failed");

  DEBUG(sender.toString() + " add deal at " +
        std::to_string(platon_block_number()));

  // add deal
  deal_table.emplace([&](auto& deal) {
    deal.cid = cid;
    deal.state = 0;
    deal.slashed = 0;
    deal.size = size;
    deal.price = price;
    deal.duration = duration;
    deal.end_block_num = platon_block_number() + duration;
    deal.sender = sender;
    deal.miner_required = miner_required;
    deal.total_reward = total_reward;
    deal.reward_balance = total_reward;
  });

  deal_count.self() += 1;

  PLATON_EMIT_EVENT1(AddDeal, sender, cid, size);
}

// renewal deal
void market::renewal_deal(const string& cid, const u128& duration) {
  // Query deal info by cid
  auto current_deal = deal_table.find<"cid"_n>(cid);
  platon_assert(current_deal != deal_table.cend(),
                "Renewal deal failed, cid is not exists");

  Address sender = platon_caller();
  platon_assert(current_deal->sender == sender,
                "Only original sender can renewal deal");

  DEBUG(sender.toString() + " renewal deal at " +
        std::to_string(platon_block_number()));

  // get deal info from exists deal
  u128 price = current_deal->price;
  uint8_t miner_required = current_deal->miner_required;

  // calculate deal price
  u128 deal_price = hackathon::safeMul(price, duration);
  u128 total_reward = hackathon::safeMul(deal_price, miner_required);

  // transfer DAT from sender to market contract
  Address self = platon_address();
  auto transfer_result = platon_call_with_return_value<bool>(
      token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender,
      self, total_reward);

  platon_assert(transfer_result.first && transfer_result.second,
                "Renewal deal failed");

  // renewal deal
  deal_table.modify(current_deal, [&](auto& deal) {
    deal.duration += duration;
    deal.end_block_num += duration;
    deal.total_reward += total_reward;
    deal.reward_balance += total_reward;
  });

  PLATON_EMIT_EVENT0(RenewalDeal, cid);
}

// Withdraw deal
bool market::withdraw_deal(const string& enclave_public_key,
                           const string& cid) {
  require_verify_contract_auth();
  require_miner_registered(enclave_public_key);

  // Query deal info by cid
  auto current_deal = deal_table.find<"cid"_n>(cid);
  platon_assert(current_deal != deal_table.cend(),
                "Withdraw deal failed, cid is not exists");

  DEBUG(enclave_public_key + " withdraw deal at " +
        std::to_string(platon_block_number()));

  //////////////////////////////////////////////
  ////  erase miner from deal's miner_list  ////
  //////////////////////////////////////////////
  vector<string> miner_list = current_deal->miner_list;

  vector<string>::iterator miner_itr =
      std::find(miner_list.begin(), miner_list.end(), enclave_public_key);

  if (miner_itr != miner_list.end()) {
    miner_list.erase(miner_itr);
    // update deal
    deal_table.modify(current_deal, [&](auto& deal) {
      deal.miner_list = std::move(miner_list);
      deal.state = 0;
    });
  } else {
    DEBUG("withdraw_deal failed, miner is not exists in deal's miner_list");
    return false;
  }

  //////////////////////////////////////////////
  //  erase deal from miner's storage_proof  ///
  //////////////////////////////////////////////
  auto current_miner = storage_proof_map[enclave_public_key];
  vector<string> deals = current_miner.filled_deals;

  vector<string>::iterator deal_itr =
      std::find(deals.begin(), deals.end(), cid);
  if (deal_itr != deals.end()) {
    // update miner
    deals.erase(deal_itr);
    current_miner.filled_deals = std::move(deals);
    storage_proof_map[enclave_public_key] = std::move(current_miner);
  } else {
    DEBUG("withdraw_deal failed, deal is not exists in miner's filled_deal");
    return false;
  }

  PLATON_EMIT_EVENT0(WithdrawDeal, enclave_public_key);
  return true;
}

// get deal by cid
deal market::get_deal_by_cid(const string& cid) {
  auto current_deal = deal_table.find<"cid"_n>(cid);
  deal ret;
  if (current_deal != deal_table.cend()) {
    ret.cid = current_deal->cid;
    ret.state = current_deal->state;
    ret.slashed = current_deal->slashed;
    ret.size = current_deal->size;
    ret.price = current_deal->price;
    ret.duration = current_deal->duration;
    ret.end_block_num = current_deal->end_block_num;
    ret.sender = current_deal->sender;
    ret.miner_required = current_deal->miner_required;
    ret.total_reward = current_deal->total_reward;
    ret.reward_balance = current_deal->reward_balance;
    ret.miner_list = current_deal->miner_list;
  }
  return ret;
}

// get deal by sender, skip = how many deals should be skipped
vector<string> market::get_deal_by_sender(const Address& sender,
                                          const uint8_t& skip) {
  vector<string> deals;
  auto vect_iter = deal_table.get_index<"sender"_n>();
  uint8_t index = 0;   // the index of current deal in iterator
  uint8_t total = 20;  // return 20 deals per request

  for (auto it = vect_iter.cbegin(sender);
       it != vect_iter.cend(sender) && total > 0; it++, index++) {
    // detect deal.sender == sender
    if (index >= skip && it->sender == sender) {
      deals.push_back(it->cid);
      total--;
    }
  }
  return deals;
}

// get opened deals, skip = how many deals should be skipped
vector<string> market::get_opened_deal(const uint8_t& skip) {
  vector<string> deal_cid;
  uint8_t index = 0;   // the index of current deal in iterator
  uint8_t total = 20;  // return 20 deals per request

  for (auto it = deal_table.cbegin(); it != deal_table.cend() && total > 0;
       it++, index++) {
    // detect state == 0
    if (index >= skip && it->state == 0) {
      deal_cid.push_back(it->cid);
      total--;
    }
  }
  return deal_cid;
}

// update miner proof
int64_t market::update_storage_proof(const string& enclave_public_key,
                                     const vector<filled_deal>& added_files,
                                     const vector<filled_deal>& deleted_files,
                                     u128& miner_remaining_quota) {
  // only verify contract allows call this function
  require_verify_contract_auth();
  vector<string> filled_deals;
  storage_proof proof;
  if (storage_proof_map.contains(enclave_public_key)) {
    proof = storage_proof_map[enclave_public_key];
    filled_deals = proof.filled_deals;
  }
  uint64_t current_block_num = platon_block_number();
  DEBUG(enclave_public_key + " update storage proof at " +
        std::to_string(current_block_num));
  DEBUG("miner_remaining_quota: " + std::to_string(miner_remaining_quota));
  int64_t task_size_changed = 0;

  //////////////////////////////////////////////
  //                 add file                 //
  //////////////////////////////////////////////

  vector<filled_deal>::const_iterator itr;
  for (itr = added_files.begin(); itr != added_files.end(); ++itr) {
    // Query deal info by cid
    auto current_deal = deal_table.find<"cid"_n>(itr->cid);

    // ensure deal cid is exists
    if (current_deal != deal_table.cend()) {
      // deal size is invalid
      if (current_deal->size < itr->size) {
        // change deal state to 3(invalid)
        deal_table.modify(current_deal, [&](auto& deal) { deal.state = 3; });
      } else {
        // ensure deal is opened && deal size is smaller than miner remaining
        // quota
        if (current_deal->state == 0 &&
            current_deal->size <= miner_remaining_quota) {
          // ensure current miner is not in the list
          vector<string> miner_list = current_deal->miner_list;
          vector<string>::iterator miner_itr = std::find(
              miner_list.begin(), miner_list.end(), enclave_public_key);

          if (miner_itr == miner_list.end()) {
            // update task size
            task_size_changed += itr->size;

            // update miner remaining_quota
            miner_remaining_quota -= itr->size;

            // update state to 1 (filled) if miner_list size is match with
            // required
            uint8_t deal_state = current_deal->state;
            if (current_deal->miner_list.size() + 1 ==
                current_deal->miner_required) {
              DEBUG("change deal state to 1");
              deal_state = 1;
            }

            // add new enclave_public_key into miner_list
            miner_list.push_back(enclave_public_key);

            // update deal
            deal_table.modify(current_deal, [&](auto& deal) {
              deal.miner_list = miner_list;
              deal.state = deal_state;
            });

            // add storage proof of deal into fresh_deal
            fresh_deal_map.insert(itr->cid, current_block_num);

            // add cid into miner filled_deals
            filled_deals.push_back(itr->cid);

            PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);

          } else {
            DEBUG("miner is already in the list");
          }
        } else {
          DEBUG("deal " + itr->cid +
                " is closed or miner_remaining_quota is not enough");
        }
      }
    } else {
      DEBUG("deal " + itr->cid + " is not exists");
    }
  }

  //////////////////////////////////////////////
  //                delete file               //
  //////////////////////////////////////////////

  for (itr = deleted_files.begin(); itr != deleted_files.end(); ++itr) {
    // Query deal info by cid
    auto current_deal = deal_table.find<"cid"_n>(itr->cid);

    // deal is not closed
    if (current_deal != deal_table.cend()) {
      vector<string> miner_list = current_deal->miner_list;

      vector<string>::iterator miner_itr =
          std::find(miner_list.begin(), miner_list.end(), enclave_public_key);

      // if miner is storage provider of that deal
      if (miner_itr != miner_list.end()) {
        DEBUG("miner " + enclave_public_key + " delete file maliciously");
        // TODO, forfeiture miner
      }
    }

    // remove deal cid from filled_deal
    std::vector<string>::iterator position =
        std::find(filled_deals.begin(), filled_deals.end(), itr->cid);
    if (position != filled_deals.end()) {
      filled_deals.erase(std::move(position));
    }
    task_size_changed -= itr->size;
  }

  DEBUG("task_size_changed: " + std::to_string(task_size_changed));
  proof.filled_deals = std::move(filled_deals);
  proof.last_proof_block_num = std::move(current_block_num);

  // check if storage proof info already exists
  if (storage_proof_map.contains(enclave_public_key)) {
    storage_proof_map[enclave_public_key] = std::move(proof);
  } else {
    // add new storage proof info
    proof.last_claimed_block_num = proof.last_proof_block_num;
    storage_proof_map.insert(enclave_public_key, std::move(proof));
  }

  PLATON_EMIT_EVENT0(UpdateStorageProof, enclave_public_key);
  return task_size_changed;
}

// get miner last proof
storage_proof market::get_storage_proof(const string& enclave_public_key) {
  return storage_proof_map[enclave_public_key];
}

// claim deal reward
bool market::claim_deal_reward(const string& enclave_public_key) {
  // check if enclave_public_key is exists
  if (!storage_proof_map.contains(enclave_public_key)) {
    return false;
  }

  require_miner_registered(enclave_public_key);

  // get target miner info
  storage_proof current_miner = storage_proof_map[enclave_public_key];
  vector<string> filled_deals = current_miner.filled_deals;

  // blocks gap between last_proof_block_num and last_claimed_block_num
  uint64_t reward_blocks =
      current_miner.last_proof_block_num - current_miner.last_claimed_block_num;

  if (reward_blocks <= 0) {
    DEBUG("reward_blocks is 0, waiting for new proofs");
    return false;
  }

  u128 total_reward = 0;

  // check each stored deal's price, calculate the reward
  // handle each deal
  for (auto& cid : filled_deals) {
    // if cid exists in fresh_deal_map
    if (fresh_deal_map.contains(cid)) {
      DEBUG("cid " + cid + " exists in fresh_deal_map, filled_block_num: " +
            std::to_string(fresh_deal_map[cid]));
      reward_blocks = current_miner.last_proof_block_num - fresh_deal_map[cid];
      fresh_deal_map.erase(cid);
    }

    DEBUG("reward_blocks: " + std::to_string(reward_blocks));

    u128 current_deal_reward = market::each_deal_reward(
        enclave_public_key, cid, reward_blocks, filled_deals);
    total_reward += current_deal_reward;
  }

  // update fill_deals
  current_miner.filled_deals = std::move(filled_deals);

  storage_proof_map[enclave_public_key] = current_miner;

  if (total_reward > 0) {
    DEBUG("total_reward: " + std::to_string(total_reward));
    // query miner reward address
    auto address_result = platon_call_with_return_value<Address>(
        verify_contract.self(), uint32_t(0), uint32_t(0),
        "get_miner_reward_address", enclave_public_key);
    platon_assert(address_result.second, "Get miner reward address failed");

    // transfer DAT from market contract to miner
    Address reward_address = address_result.first;
    Address self = platon_address();
    auto transfer_result = platon_call_with_return_value<bool>(
        token_contract.self(), uint32_t(0), uint32_t(0), "transfer",
        reward_address, total_reward);

    platon_assert(transfer_result.first && transfer_result.second,
                  "Transfer deal reward failed");

    DEBUG("miner claim deal reward " + std::to_string(total_reward));
    // update last_claimed_block_num
    current_miner.last_claimed_block_num = platon_block_number();
    storage_proof_map[enclave_public_key] = std::move(current_miner);

    PLATON_EMIT_EVENT1(ClaimDealReward, platon_caller(), enclave_public_key);
    return true;
  } else {
    return false;
  }
}

u128 market::each_deal_reward(const string& enclave_public_key,
                              const string& cid,
                              uint64_t& reward_blocks,
                              vector<string>& filled_deals) {
  // Query deal info by cid
  auto current_deal = deal_table.find<"cid"_n>(cid);

  // ensure deal cid is exists
  if (current_deal == deal_table.cend()) {
    DEBUG("claim reward failed, deal " + cid + " is not exists");
    return 0;
  }

  auto state = current_deal->state;
  u128 current_deal_reward = 0;

  // check current deal status, 0 = deal opened, 1= filled
  if (state > 1) {
    DEBUG("claim reward failed, deal state is " + std::to_string(state));
    return 0;
  }

  u128 price = current_deal->price;
  vector<string> miner_list = current_deal->miner_list;
  auto current_miner =
      std::find(miner_list.begin(), miner_list.end(), enclave_public_key);

  // check deal's miner_list contain enclave_public_key
  if (current_miner != miner_list.end()) {
    // calculate current deal reward
    u128 current_deal_reward = safeMul(price, reward_blocks);
    auto reward_balance = current_deal->reward_balance;

    // if current_deal_reward larger than reward_balance, close deal
    if (current_deal_reward >= reward_balance &&
        platon_block_number() >= current_deal->end_block_num) {
      // erase deal
      current_deal_reward = reward_balance;
      deal_table.erase(current_deal);

      deal_count.self() -= 1;

      // remove cid from miner's filled_deals
      vector<string>::iterator deal_itr =
          std::find(filled_deals.begin(), filled_deals.end(), cid);
      if (deal_itr != filled_deals.end()) {
        // update miner
        filled_deals.erase(std::move(deal_itr));
      }

    } else {
      // update reward balance
      deal_table.modify(current_deal, [&](auto& deal) {
        deal.reward_balance -= current_deal_reward;
      });
    }

    DEBUG("current_deal_reward: " + std::to_string(current_deal_reward));
    return current_deal_reward;
  } else {
    DEBUG("claim reward failed, enclave_public_key is not in miner_list");
    return 0;
  }
}

uint64_t market::get_deal_count() {
  return deal_count.self();
}

// Query all deals filled by miner
vector<string> market::get_deals_by_miner(const string& enclave_public_key) {
  return storage_proof_map[enclave_public_key].filled_deals;
}

// Query deal count filled by miner
uint32_t market::get_deal_count_by_miner(const string& enclave_public_key) {
  return storage_proof_map[enclave_public_key].filled_deals.size();
}

}  // namespace hackathon