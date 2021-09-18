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
                      const uint8_t& miner_required) {
  // check if cid is exists
  auto vect_iter = deal_table.find<"cid"_n>(cid);
  platon_assert(vect_iter == deal_table.cend(), "Cid is already exists");

  Address sender = platon_caller();
  auto count = deal_table.count<"sender"_n>(sender);
  platon_assert(count < kMaxDealEachSender,
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
    deal.slashed = false;
    deal.size = size;
    deal.price = price;
    deal.duration = duration;
    deal.closed_block_num = platon_block_number() + duration;
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
    deal.closed_block_num += duration;
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

  // erase enclave_public_key into deal's miner_list
  vector<string> miner_list = current_deal->miner_list;

  // find miner enclave_public_key
  vector<string>::iterator itr =
      std::find(miner_list.begin(), miner_list.end(), enclave_public_key);

  if (itr != miner_list.end()) {
    // erase enclave_public_key from miner_list
    miner_list.erase(itr);

    // update deal
    deal_table.modify(current_deal, [&](auto& deal) {
      deal.miner_list = miner_list;
      deal.state = 0;
    });

    PLATON_EMIT_EVENT0(WithdrawDeal, enclave_public_key);
    return true;
  }
  DEBUG("withdraw_deal failed, miner is not exists");
  return false;
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
    ret.closed_block_num = current_deal->closed_block_num;
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
    // DEBUG("index: " + std::to_string(index));
    // DEBUG("skip: " + std::to_string(skip));
    // DEBUG("total: " + std::to_string(total));

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
    // DEBUG("index: " + std::to_string(index));
    // DEBUG("skip: " + std::to_string(skip));
    // DEBUG("total: " + std::to_string(total));

    // detect state == 0
    if (index >= skip && it->state == 0) {
      deal_cid.push_back(it->cid);
      total--;
    }
  }
  return deal_cid;
}

// fill deal
bool market::fill_deal(const string& enclave_public_key,
                       const vector<stored_deal>& deals) {
  // only verify contract allows call this function
  require_verify_contract_auth();
  require_miner_registered(enclave_public_key);
  uint64_t current_block_num = platon_block_number();

  u128 total_reward = 0;

  vector<stored_deal>::const_iterator it;
  DEBUG(enclave_public_key + " fill deal at " +
        std::to_string(current_block_num));

  for (it = deals.begin(); it != deals.end(); ++it) {
    auto current_deal = deal_table.find<"cid"_n>(it->cid);

    // ensure deal cid is exists
    platon_assert(current_deal != deal_table.cend(),
                  "fill deal failed, deal is not exists");

    // ensure deal state = 0
    platon_assert(current_deal->state == 0, "fill deal failed, deal state is ",
                  std::to_string(current_deal->state));

    // add enclave_public_key into deal's miner_list
    vector<string> miner_list = current_deal->miner_list;

    // ensure current miner in the list
    vector<string>::iterator itr =
        std::find(miner_list.begin(), miner_list.end(), enclave_public_key);
    platon_assert(itr == miner_list.end(), "Miner is already on the list");

    // update state to 1 (filled) if miner_list size is match with
    // required
    uint8_t deal_state = current_deal->state;
    if (current_deal->miner_list.size() + 1 == current_deal->miner_required) {
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
    fresh_deal_map.insert(it->cid, platon_block_number());
  }
  PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);
  return total_reward;
}

// update miner proof
bool market::update_storage_proof(const string& enclave_public_key,
                                  const vector<stored_deal>& stored_deals) {
  // only verify contract allows call this function
  require_verify_contract_auth();

  storage_proof proof;
  uint64_t current_block_num = platon_block_number();
  DEBUG(enclave_public_key + " update storage proof at " +
        std::to_string(current_block_num));

  // check if storage proof info already exists
  if (storage_proof_map.contains(enclave_public_key)) {
    proof = storage_proof_map[enclave_public_key];
    proof.last_proof_block_num = current_block_num;
    proof.stored_deals = stored_deals;
    storage_proof_map[enclave_public_key] = proof;
    market::claim_deal_reward(enclave_public_key);
  } else {
    // add new storage proof info
    proof.last_proof_block_num = current_block_num;
    proof.last_claimed_block_num = current_block_num;
    proof.stored_deals = stored_deals;
    storage_proof_map.insert(enclave_public_key, proof);
  }

  PLATON_EMIT_EVENT0(UpdateStorageProof, enclave_public_key);
  return true;
}

/**
 * get miner last proof
 * @param enclave_public_key - SGX enclave public key
 */
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
  storage_proof miner = storage_proof_map[enclave_public_key];
  vector<stored_deal> stored_deals = miner.stored_deals;

  // blocks gap between last_proof_block_num and last_claimed_block_num
  uint64_t stored_deal_reward_blocks =
      miner.last_proof_block_num - miner.last_claimed_block_num;

  if (stored_deal_reward_blocks <= 0) {
    DEBUG("stored_deal_reward_blocks is 0, waiting for new proofs");
    return false;
  }

  DEBUG("------------------------");

  u128 total_reward = 0;

  // check each stored deal's price, calculate the reward
  vector<stored_deal>::iterator stored_deal_iterator;

  // handle each deal
  for (stored_deal_iterator = stored_deals.begin();
       stored_deal_iterator != stored_deals.end(); ++stored_deal_iterator) {
    auto cid = stored_deal_iterator->cid;
    auto current_deal_reward_blocks = stored_deal_reward_blocks;

    // if cid exists in fresh_deal_map
    if (fresh_deal_map.contains(cid)) {
      DEBUG("cid " + cid + " exists in fresh_deal_map, filled_block_num: " +
            std::to_string(fresh_deal_map[cid]));
      current_deal_reward_blocks =
          miner.last_proof_block_num - fresh_deal_map[cid];
      fresh_deal_map.erase(cid);
    }

    DEBUG("current_deal_reward_blocks: " +
          std::to_string(current_deal_reward_blocks));

    u128 current_deal_reward = market::each_deal_reward(
        enclave_public_key, cid, current_deal_reward_blocks);
    total_reward += current_deal_reward;
  }

  if (total_reward > 0) {
    DEBUG("total_reward: " + std::to_string(total_reward));
    DEBUG("------------------------");
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

    // update last_claimed_block_num
    miner.last_claimed_block_num = platon_block_number();
    storage_proof_map[enclave_public_key] = miner;

    PLATON_EMIT_EVENT1(ClaimDealReward, platon_caller(), enclave_public_key);
    return true;
  } else {
    return false;
  }
}

u128 market::each_deal_reward(const string& enclave_public_key,
                              const string& cid,
                              uint64_t reward_blocks) {
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

  // check deal's miner_list contain enclave_public_key
  if (std::find(miner_list.begin(), miner_list.end(), enclave_public_key) !=
      miner_list.end()) {
    // calculate current deal reward
    u128 current_deal_reward = safeMul(price, reward_blocks);
    auto reward_balance = current_deal->reward_balance;

    // if current_deal_reward larger than reward_balance, close deal
    uint8_t deal_state = current_deal->state;

    if (current_deal_reward >= reward_balance &&
        platon_block_number() >= current_deal->closed_block_num) {
      // erase deal
      current_deal_reward = reward_balance;
      deal_table.erase(current_deal);

      deal_count.self() -= 1;
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

}  // namespace hackathon