#pragma once

#include <platon/platon.hpp>

using namespace platon;
using namespace platon::db;
using std::map;
using std::string;
using std::vector;

namespace hackathon {

/**
 * The `verify` smart contract is provided by `dante network team` as a sample
 * platon wasm contract, and it defines the structures and actions needed for
 * platon-hackathon's core functionality.
 */

const u128 kTokenUnit = 1000000000000000000;                // DAT token decimal
const u128 kLockedAmount = Energon(100 * kTokenUnit).Get(); // 100 DAT,the DAT token that storage provider need locked

struct miner {
  public:
	string enclave_public_key; // SGX enclave public key
	Address reward_address;    // miner address which receive rewards
	Address sender;            // miner address which send transaction
	string primary_key() const { return enclave_public_key; }

	PLATON_SERIALIZE(miner, (enclave_public_key)(reward_address)(sender))
};

/**
* Why we need a seperate struct miner_info, maybe it's part of struct miner above?
* Let's say we have a miner pool here, and many intel SGX machines share a Node.js client service to push blockchain transactions.
* If struct miner_info is part of struct miner, then we will get a lot of repeated miner info on the chain, that's unnecessary.
* Therefore, it's a simple way to separate the miner & miner_info and find the corresponding miner info through the same sender.
*/
struct miner_info {
	Address sender;      // miner address which send transaction
	string name;         // miner name
	string peer_id;      // peer id of miner from IPFS network
	string country_code; // country code (https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
	string url;          // the website url of storage provider

	PLATON_SERIALIZE(miner_info, (sender)(name)(peer_id)(country_code)(url))
};

struct cid_file {
  public:
	string cid; // deal cid
	u128 size;  // file size of deal
	PLATON_SERIALIZE(cid_file, (cid)(size));
};

struct storage_proof {
  public:
	string enclave_timestamp; // SGX enclave timestamp
	u128 enclave_plot_size;   // SGX enclave committed plot size
	string enclave_signature; // SGX enclave signature

	PLATON_SERIALIZE(storage_proof, (enclave_timestamp)(enclave_plot_size)(enclave_signature))
};

CONTRACT verify : public Contract {
  protected:
	// dante token contract
	StorageType<"token_contract"_n, Address> token_contract;

	// network total capacity
	StorageType<"total_capacity"_n, u128> total_capacity;

	// dante market contract
	StorageType<"market_contract"_n, Address> market_contract;

	// miner table
	platon::db::Map<"miner"_n, string, miner> miner_map;

	// proof_of_capacity table
	platon::db::Map<"storage_proof"_n, string, storage_proof> storage_proof_map;

	// miner_info map
	platon::db::Map<"miner_info"_n, Address, miner_info> miner_info_map;

	// Verify contract events
  public:
	PLATON_EVENT1(VerifyContract, string, string);

  public:
	/**
   * Contract init
   * @param token_contract_address - DAT PRC20 token contract address
   * @param market_contract_address - DAT market contract address
   */
	ACTION void init(const Address &token_contract_address, const Address &market_contract_address);

	/**
   * Change contract owner
   * @param address - market contract owner address
   */
	ACTION bool set_owner(const Address &address);

	/**
   * Query contract owner
   */
	CONST string get_owner();

	/**
   * Change token contract
   * @param address - Change DAT PRC20 token contract address
   */
	ACTION bool set_token_contract(const Address &address);

	/**
   * Query token contract address
   */
	CONST string get_token_contract();

	/**
   * Change market contract
   * @param address - Change DAT market contract address
   */
	ACTION bool set_market_contract(const Address &address);

	/**
   * Query market contract
   */
	CONST string get_market_contract();

	/**
   * Register miner by enclave_public_key
   * @param enclave_public_key - SGX enclave public key
   * @param reward_address - miner address which receive rewards
   */
	ACTION void register_miner(const string &enclave_public_key, const Address &reward_address, const string &enclave_signature);

	/**
   * Update miner by enclave_public_key & enclave_signature
   * @param enclave_public_key - SGX enclave public key
   * @param reward_address - miner address which receive rewards
   * @param enclave_signature - SGX signature
   */
	ACTION void update_miner(const string &enclave_public_key, const Address &reward_address, const string &enclave_signature);

	/**
   * Unregister miner by enclave_public_key & enclave_signature
   * @param enclave_public_key - SGX enclave public key
   * @param enclave_signature - SGX signature
   */
	ACTION void unregister_miner(const string &enclave_public_key, const string &enclave_signature);

	/**
   * Verify SGX signature
   * @param message - origin message of signature
   * @param enclave_signature - SGX signature
   */
	bool require_auth(const string &message, const string &enclave_signature);

	// Test signature
	ACTION void test(const string &message, const string &enclave_signature);

	/**
   * Submit enclave new deal proof to fill deal
   * @param enclave_public_key - SGX enclave public key
   * @param enclave_timestamp - SGX timestamp
   * @param stored_files - file list which storage provider stored
   * @param enclave_signature - SGX signature
   */
	ACTION void fill_deal(const string &enclave_public_key, const string &enclave_timestamp, const vector<cid_file> stored_files, const string &enclave_signature);

	/**
   * Submit enclave storage proof
   * @param enclave_public_key - SGX enclave public key
   * @param enclave_timestamp - SGX timestamp
   * @param enclave_plot_size - storage provider plot size
   * @param stored_files - file list which storage provider stored
   * @param enclave_signature - SGX signature
   */
	ACTION void submit_storage_proof(const string &enclave_public_key, const string &enclave_timestamp, const u128 &enclave_plot_size, const vector<cid_file> stored_files, const string &enclave_signature);

	/**
   * Query last enclave proof
   */
	CONST storage_proof get_storage_proof(const string &enclave_public_key);

	/**
   * Query miner info by enclave_public_key
   * @param enclave_public_key - SGX enclave public key
   */
	CONST miner get_miner(const string &enclave_public_key);

	/**
   * Query total capacity
   */
	CONST u128 get_total_capacity();

	/**
   * Submit miner info
   * @param name - miner name
   * @param peer_id - peer id of miner from IPFS network
   * @param country_code - country
   * code(https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
   * @param url - the website url of storage provider
   */
	ACTION void submit_miner_info(const string &name, const string &peer_id, const string &country_code, const string &url);

	/**
   * Get miner info by sender
   * @param sender - the account which submit miner info
   */
	CONST miner_info get_miner_info(const Address &sender);
};

PLATON_DISPATCH(
    verify, (init)(set_owner)(get_owner)(set_token_contract)(get_token_contract)(set_market_contract)(get_market_contract)(register_miner)(update_miner)(unregister_miner)(test)(fill_deal)(submit_storage_proof)(get_storage_proof)(get_miner)(get_total_capacity)(submit_miner_info)(get_miner_info))
} // namespace hackathon