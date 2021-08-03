#undef NDEBUG
#include "market.hpp"

namespace hackathon {

void market::init(const Address& token_contract_address,const Address& verify_contract_address) {
	// set owner
	platon::set_owner();

	// set token contract
	token_contract.self() = token_contract_address;
  verify_contract.self() = verify_contract_address;
}

// Change contract owner
bool market::set_owner(const Address& account) {
	platon_assert(platon::is_owner(), "Only owner can change owner.");
	platon::set_owner(account.toString());
	return true;
}

// Query contract owner
string market::get_owner() {
	return platon::owner().toString();
}

// Change token contract address
bool market::set_token_contract(const Address& address) {
	platon_assert(platon::is_owner(), "Only owner can change token contract.");
	token_contract.self() = address;
	return true;
}

// Query token contract
string market::get_token_contract() {
	return token_contract.self().toString();
}

// Query verify contract
string market::get_verify_contract(){
  return verify_contract.self().toString();
}

// Change verify contract
bool market::set_verify_contract(const Address &address){
  platon_assert(platon::is_owner(), "Only owner can change verify contract.");
	verify_contract.self() = address;
	return true;
}

// add deal
void market::add_deal(const string& cid, const u128& size, const u128& price, const u128& duration, const uint8_t& provider_required) {
	DEBUG("Hello");
	u128 deal_price = hackathon::safeMul(price, duration);
	u128 total_price = hackathon::safeMul(deal_price, provider_required);
	DEBUG(price);
	DEBUG(deal_price);
	DEBUG(total_price);

  Address sender = platon_caller();
	Address self = platon_address();
	// platon_assert(platon_balance(sender).Get() >= deal_price, "sender balance is not enough");

	// // transfer deal DAT from sender to contract
	// auto result = platon_call_with_return_value<bool>(token_contract.self(), uint32_t(0), uint32_t(0), "transferFrom", sender, self, total_price);
	// DEBUG(result.first);
	// DEBUG(result.second);

	// platon_assert(result.first && result.second, "platon_call transferFrom failed");

	// add deal
	deal_table.emplace([&](auto& deal) {
		deal.cid = cid;
		deal.size = size;
		deal.price = price;
		deal.duration = duration;
		deal.sender = sender;
		deal.provider_required = provider_required;
	});
}

// get deal by cid
deal market::get_deal_by_cid(const string& cid) {
	auto itr = deal_table.find<"cid"_n>(cid);
	deal ret;
	if (itr != deal_table.cend()) {
		ret.cid = itr->cid;
		ret.state = itr->state;
		ret.slashed = itr->slashed;
		ret.size = itr->size;
		ret.price = itr->price;
		ret.duration = itr->duration;
		ret.sender = itr->sender;
		ret.provider_required = itr->provider_required;
	}
	return ret;
}

// get deal by sender, skip = how many deals should be skipped
vector<string> market::get_deal_by_sender(const Address& sender, const uint8_t& skip) {
	vector<string> ret;
	auto vect_iter = deal_table.get_index<"sender"_n>();
	uint8_t index = 0;   // the index of current deal in iterator
	uint8_t total = 20;  // return 20 deals per request
	for (auto it = vect_iter.cbegin(sender); it != vect_iter.cend(sender) && total > 0; it++, index++) {
		DEBUG(index);
		DEBUG(skip);
		DEBUG(total);
		if (index >= skip && it->sender == sender) {
			ret.push_back(it->cid);
			total--;
		}
	}
	return ret;
}

// get opened deals, skip = how many deals should be skipped
vector<string> market::get_opened_deal(const uint8_t& skip) {
	vector<string> ret;
	auto vect_iter = deal_table.get_index<"state"_n>();
	uint8_t index = 0;   // the index of current deal in iterator
	uint8_t total = 20;  // return 20 deals per request
	for (auto it = vect_iter.cbegin(0); it != vect_iter.cend(0) && total > 0; it++, index++) {
		DEBUG(index);
		DEBUG(skip);
		DEBUG(total);
		if (index >= skip && it->state == 0) {
			ret.push_back(it->cid);
			total--;
		}
	}
	return ret;
}

// update provider proof
bool market::update_provider_proof(const string& by_enclave_public_key, const vector<string>& cid) {
	return true;
}
}  // namespace hackathon