#undef NDEBUG
#include "market.hpp"

namespace hackathon {
void market::init(const Address &token_contract_address, const Address &verify_contract_address) {
	// set owner
	platon::set_owner();

	// set token contract address
	token_contract.self() = token_contract_address;

	// set verify contract address
	verify_contract.self() = verify_contract_address;
}

// Change contract owner
bool market::set_owner(const Address &address) {
	platon_assert(platon::is_owner(), "Only owner can change owner");
	platon::set_owner(address.toString());

	return true;
}

// Query contract owner
string market::get_owner() { return platon::owner().toString(); }

// Change token contract address
bool market::set_token_contract(const Address &address) {
	platon_assert(platon::is_owner(), "Only owner can change token contract");
	token_contract.self() = address;

	return true;
}

// Query token contract
string market::get_token_contract() { return token_contract.self().toString(); }

// Query verify contract
string market::get_verify_contract() {
	return verify_contract.self().toString();
}

// Change verify contract
bool market::set_verify_contract(const Address &address) {
	platon_assert(platon::is_owner(), "Only owner can change verify contract");
	verify_contract.self() = address;

	return true;
}

// ensure that current transaction is sent from verify contract
void market::require_verify_contract_auth() {
	DEBUG("platon_caller:" + platon_caller().toString());
	DEBUG("verify_contract address :" + verify_contract.self().toString());
	// platon_assert(platon_caller() == verify_contract.self(),
	//               "platon_caller is not equal with verify contract address");
}

void market::require_miner_registered(const string &enclave_public_key) {
	auto result = platon_call_with_return_value<bool>(verify_contract.self(), uint32_t(0), uint32_t(0), "is_registered", enclave_public_key);

	if (result.first && result.second) {
		DEBUG("the miner is registered");
	} else {
		DEBUG("the miner is not registered");
	}
	DEBUG(result.first);
	DEBUG(result.second);

	// platon_assert(result.first && result.second, "the miner is not registered");
}

// add deal
void market::add_deal(const string &cid, const u128 &size, const u128 &price, const u128 &duration, const uint8_t &storage_provider_required) {
	// check cid is not exists
	auto vect_iter = deal_table.find<"cid"_n>(cid);
	platon_assert(vect_iter == deal_table.cend(), "cid is already exists");

	// calculate deal price
	u128 deal_price = hackathon::safeMul(price, duration);
	u128 total_reward = hackathon::safeMul(deal_price, storage_provider_required);
	DEBUG("price: " + std::to_string(price));
	DEBUG("deal_price: " + std::to_string(deal_price));
	DEBUG("total_reward: " + std::to_string(total_reward));

	Address sender = platon_caller();
	// Address self = platon_address();
	// platon_assert(platon_balance(sender).Get() >= deal_price, "sender balance
	// is not enough");

	// // transfer deal DAT from sender to contract
	// auto result = platon_call_with_return_value<bool>(token_contract.self(),
	// uint32_t(0), uint32_t(0), "transferFrom", sender, self, total_price);
	// DEBUG(result.first);
	// DEBUG(result.second);

	// platon_assert(result.first && result.second, "platon_call transferFrom
	// failed");

	// add deal
	deal_table.emplace([&](auto &deal) {
		deal.cid = cid;
		deal.size = size;
		deal.price = price;
		deal.duration = duration;
		deal.sender = sender;
		deal.storage_provider_required = storage_provider_required;
		deal.total_reward = total_reward;
		deal.reward_balance = total_reward;
	});

	PLATON_EMIT_EVENT1(AddDeal, sender, cid, size);
}

// get deal by cid
deal market::get_deal_by_cid(const string &cid) {
	auto current_deal = deal_table.find<"cid"_n>(cid);
	deal ret;
	if (current_deal != deal_table.cend()) {
		ret.cid = current_deal->cid;
		ret.state = current_deal->state;
		ret.slashed = current_deal->slashed;
		ret.size = current_deal->size;
		ret.price = current_deal->price;
		ret.duration = current_deal->duration;
		ret.sender = current_deal->sender;
		ret.storage_provider_required = current_deal->storage_provider_required;
		ret.total_reward = current_deal->total_reward;
		ret.reward_balance = current_deal->reward_balance;
		ret.storage_provider_list = current_deal->storage_provider_list;
	}
	return ret;
}

// get deal by sender, skip = how many deals should be skipped
vector<string> market::get_deal_by_sender(const Address &sender, const uint8_t &skip) {
	vector<string> deals;
	auto vect_iter = deal_table.get_index<"sender"_n>();
	uint8_t index = 0;  // the index of current deal in iterator
	uint8_t total = 20; // return 20 deals per request

	// iterate vector iterator
	for (auto it = vect_iter.cbegin(sender); it != vect_iter.cend(sender) && total > 0; it++, index++) {
		DEBUG("index: " + std::to_string(index));
		DEBUG("skip: " + std::to_string(skip));
		DEBUG("total: " + std::to_string(total));

		// detect deal.sender == sender
		if (index >= skip && it->sender == sender) {
			deals.push_back(it->cid);
			total--;
		}
	}
	return deals;
}

// get opened deals, skip = how many deals should be skipped
vector<string> market::get_opened_deal(const uint8_t &skip) {
	vector<string> deal_cid;
	uint8_t index = 0;  // the index of current deal in iterator
	uint8_t total = 20; // return 20 deals per request

	// iterate vector iterator
	for (auto it = deal_table.cbegin(); it != deal_table.cend() && total > 0; it++, index++) {
		DEBUG("index: " + std::to_string(index));
		DEBUG("skip: " + std::to_string(skip));
		DEBUG("total: " + std::to_string(total));

		// detect state == 0
		if (index >= skip && it->state == 0) {
			deal_cid.push_back(it->cid);
			total--;
		}
	}
	return deal_cid;
}

// add storage provider's enclave_public_key into storage_provider_list of deal_table
bool market::fill_deal(const string &enclave_public_key, const vector<cid_file> &deals) {
	// only verify contract allows call this function
	require_verify_contract_auth();
	require_miner_registered(enclave_public_key);

	DEBUG("market.cpp fill deal");
	DEBUG(enclave_public_key);

	vector<cid_file>::const_iterator it;

	// iterate vector iterator
	for (it = deals.begin(); it != deals.end(); ++it) {
		auto current_deal = deal_table.find<"cid"_n>(it->cid);
		DEBUG("cid: " + current_deal->cid);
		DEBUG("state: " + std::to_string(current_deal->state));
		DEBUG("uploaded size: " + std::to_string(it->size));
		DEBUG("deal size: " + std::to_string(current_deal->size));

		// check cid is exists && deal state = 0
		if (current_deal == deal_table.cend() || current_deal->state != 0) {
			return false;
		}

		// storage provider reported file size is larger than size of deal
		if (current_deal->size > it->size) {
			deal_table.modify(current_deal, [&](auto &deal) { deal.state = 3; });
			return false;
		}

		// add enclave_public_key into deal's storage_provider_list
		vector<string> provider_list = current_deal->storage_provider_list;

		// ensure current storage provider is not on the list
		if (std::find(provider_list.begin(), provider_list.end(), enclave_public_key) != provider_list.end()) {
			DEBUG("storage provider is already on the list");
		} else {

			// update state to 1 (filled) if storage_provider_list size is match with required
			uint8_t deal_state = current_deal->state;
			if (current_deal->storage_provider_list.size() + 1 == current_deal->storage_provider_required) {
				DEBUG("change deal state to 1");
				deal_state = 1;
			}

			// add new enclave_public_key into storage_provider_list
			DEBUG("add enclave_public_key " + enclave_public_key + " into storage_provider_list");
			provider_list.push_back(enclave_public_key);

			// update deal
			deal_table.modify(current_deal, [&](auto &deal) {
				deal.storage_provider_list = provider_list;
				deal.state = deal_state;
			});
		}
	}

	PLATON_EMIT_EVENT0(FillDeal, enclave_public_key);
	return true;
}

// update storage provider proof
bool market::update_storage_proof(const string &enclave_public_key, const vector<cid_file> &deals) {
	// only verify contract allows call this function
	require_verify_contract_auth();
	DEBUG(enclave_public_key);

	storage_provider provider;
	uint64_t current_block_num = platon_block_number();

	if (storage_provider_map.contains(enclave_public_key)) {
		// storage provider info already exists
		provider = storage_provider_map[enclave_public_key];
		provider.last_proof_block_num = current_block_num;
		provider.deals = deals;
		storage_provider_map[enclave_public_key] = provider;
	} else {
		// add new storage provider info
		provider.last_proof_block_num = current_block_num;
		provider.last_claimed_block_num = current_block_num;
		provider.deals = deals;
		storage_provider_map.insert(enclave_public_key, provider);
	}

	PLATON_EMIT_EVENT0(UpdateStorageProof, enclave_public_key);
	return true;
}

/**
  * get storage provider last proof
  * @param enclave_public_key - SGX enclave public key
*/
storage_provider market::get_storage_provider_proof(const string &enclave_public_key) {
	return storage_provider_map[enclave_public_key];
}

// claim deal reward
bool market::claim_deal_reward(const string &enclave_public_key) {
	// checkt enclave_public_key is exists
	if (!storage_provider_map.contains(enclave_public_key)) {
		return false;
	}

	DEBUG("enclave_public_key: " + enclave_public_key);
	require_miner_registered(enclave_public_key);

	// get target provider info
	storage_provider provider = storage_provider_map[enclave_public_key];
	vector<cid_file> deal_vector = provider.deals;

	// blocks gap between last_proof_block_num and last_claimed_block_num
	uint64_t reward_blocks = provider.last_proof_block_num - provider.last_claimed_block_num;

	DEBUG("provider.last_proof_block_num: " + std::to_string(provider.last_proof_block_num));
	DEBUG("provider.last_claimed_block_num: " + std::to_string(provider.last_claimed_block_num));
	DEBUG("reward_blocks: " + std::to_string(reward_blocks));

	if (reward_blocks <= 0) {
		return false;
	}

	u128 total_reward = 0;

	// check each deal's price, calculate the reward
	vector<cid_file>::iterator it;

	for (it = deal_vector.begin(); it != deal_vector.end(); ++it) {
		// Query deal info by cid
		auto current_deal = deal_table.find<"cid"_n>(it->cid);
		auto state = current_deal->state;

		//check current deal status, 0 = deal opened, 1= filled
		if (state == 0 || state == 1) {

			u128 price = current_deal->price;
			vector<string> provider_list = current_deal->storage_provider_list;

			// check deal's storage_provider_list contains enclave_public_key
			if (std::find(provider_list.begin(), provider_list.end(), enclave_public_key) != provider_list.end()) {
				// calculate current deal reward
				u128 current_deal_reward = safeMul(price, reward_blocks);
				auto reward_balance = current_deal->reward_balance;

				DEBUG("current_deal_reward: " + std::to_string(current_deal_reward));
				DEBUG("reward_balance: " + std::to_string(reward_balance));

				// if current_deal_reward larger than reward_balance, close deal
				uint8_t deal_state = current_deal->state;
				if (current_deal_reward >= reward_balance) {
					// close deal
					deal_state = 2;
					current_deal_reward = reward_balance;
				}

				DEBUG("current_deal_reward: " + std::to_string(current_deal_reward));

				total_reward += current_deal_reward;

				// update reward balance
				deal_table.modify(current_deal, [&](auto &deal) {
					deal.reward_balance -= current_deal_reward;
					deal.state = deal_state;
				});
			}
		}
	}

	DEBUG("total_reward: " + std::to_string(total_reward));

	// TODO transfer tokens to storage provider reward address

	// update last_claimed_block_num
	provider.last_claimed_block_num = platon_block_number();
	storage_provider_map[enclave_public_key] = provider;

	PLATON_EMIT_EVENT1(ClaimDealReward, platon_caller(), enclave_public_key);
	return true;
}
} // namespace hackathon