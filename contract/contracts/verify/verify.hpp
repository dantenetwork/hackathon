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

const u128 kTokenUnit = 1000000000000000000;  // DAT token decimal

const u128 kBytesPerPledgedDAT =
    1024 * 1024 * 1024;  // storage space for each pledged DAT(1TB)
const uint8_t kMaxHolderStakeToMinerRatio =
    9;  // ensure total token amount that DAT holder stake to miner can't
        // larger than miner_pledged_storage_size * 9

struct miner {
 public:
  string enclave_public_key;  // SGX enclave public key
  Address
      enclave_lat_address;  // convert enclave public key to lat format address
  Address reward_address;   // miner address which receive rewards
  Address sender;           // miner address which send transaction
  u128 miner_pledged_token = 0;         // miner pledged DAT token
  u128 miner_pledged_storage_size = 0;  // miner pledged storage size
  u128 miner_staked_token =
      0;  // total token amount that DAT holder staked to miner
  u128 miner_staked_storage_size =
      0;                           // miner_staked_token * kBytesPerPledgedDAT
  uint8_t staker_bonus_ratio = 0;  // staker's bonus rate
  string primary_key() const { return enclave_public_key; }

  PLATON_SERIALIZE(
      miner,
      (enclave_public_key)(enclave_lat_address)(reward_address)(sender)(
          miner_pledged_token)(miner_staked_token)(miner_pledged_storage_size))
};

struct cid_file {
 public:
  string cid;  // deal cid
  u128 size;   // file size of deal
  PLATON_SERIALIZE(cid_file, (cid)(size));
};

struct storage_proof {
 public:
  uint64_t enclave_timestamp = 0;  // SGX enclave timestamp
  u128 enclave_idle_size = 0;      // SGX enclave idle size
  u128 enclave_stored_size = 0;    // SGX enclave file stored size
  string enclave_signature;        // SGX enclave signature

  PLATON_SERIALIZE(storage_proof,
                   (enclave_timestamp)(enclave_idle_size)(enclave_stored_size)(
                       enclave_signature))
};

/**
 * Why we need a seperate struct miner_info, maybe it's part of struct miner
 * above? Let's say we have a miner pool here, and many intel SGX machines share
 * a Node.js client service to push blockchain transactions. If struct
 * miner_info is part of struct miner, then we will get a lot of repeated miner
 * info on the chain, that's unnecessary. Therefore, it's a simple way to
 * separate the miner & miner_info and find the corresponding miner info through
 * the same sender.
 */
struct miner_info {
  Address sender;       // miner address which send transaction
  string name;          // miner name
  string peer_id;       // peer id of miner from IPFS network
  string country_code;  // country code
                        // (https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
  string url;           // the website url of miner

  PLATON_SERIALIZE(miner_info, (sender)(name)(peer_id)(country_code)(url))
};

// DAT token holder stake record
struct stake {
  Address from;               // DAT holder address
  string enclave_public_key;  // miner enclave public key
  u128 amount;                // DAT stake amount
  uint64_t stake_block_num;   // stake block num
  Address by_from() const { return from; }
  string by_enclave_public_key() const { return enclave_public_key; }

  PLATON_SERIALIZE(stake, (from)(enclave_public_key)(amount)(stake_block_num));
};

CONTRACT verify : public Contract {
 protected:
  // dante token contract
  StorageType<"token_contract"_n, Address> token_contract;

  // dante market contract
  StorageType<"market_contract"_n, Address> market_contract;

  // dante mining contract
  StorageType<"mining_contract"_n, Address> mining_contract;

  // network total capacity
  StorageType<"total_capacity"_n, u128> total_capacity;

  // miner table
  platon::db::Map<"miner"_n, string, miner> miner_map;

  // total miner count
  StorageType<"miner_count"_n, uint64_t> miner_count;

  // miner storage proof
  platon::db::Map<"storage_proof"_n, string, storage_proof> storage_proof_map;

  // miner info map
  platon::db::Map<"miner_info"_n, Address, miner_info> miner_info_map;

  // Stake table
  // UniqueIndex: from, NormalIndex: miner
  MultiIndex<
      "stake"_n, stake,
      IndexedBy<"from"_n, IndexMemberFun<stake, Address, &stake::by_from,
                                         IndexType::NormalIndex>>,
      IndexedBy<"enclave_public_key"_n,
                IndexMemberFun<stake, string, &stake::by_enclave_public_key,
                               IndexType::NormalIndex>>>
      stake_table;

  // LAT token holder reward balance
  platon::db::Map<"staker_reward"_n, Address, u128> staker_reward_map;

  // Verify contract events
 public:
  PLATON_EVENT0(RegisterMiner, string);
  PLATON_EVENT0(PledgeMiner, string);
  PLATON_EVENT0(UnpledgeMiner, string);
  PLATON_EVENT0(UpdateMiner, string);
  PLATON_EVENT0(UnregisterMiner, string);
  PLATON_EVENT0(FillDeal, string);
  PLATON_EVENT0(WithdrawDeal, string);
  PLATON_EVENT0(SubmitStorageProof, string);
  PLATON_EVENT0(SubmitMinerInfo, Address);
  PLATON_EVENT0(StakeToken, Address);
  PLATON_EVENT0(UnstakeToken, Address);
  PLATON_EVENT0(ClaimStakeReward, Address);

 public:
  /**
   * Contract init
   * @param token_contract_address - DAT PRC20 token contract address
   * @param market_contract_address - DAT market contract address
   * @param mining_contract_address - mining contract address
   */
  ACTION void init(const Address& token_contract_address,
                   const Address& market_contract_address,
                   const Address& mining_contract_address);

  /**
   * Change contract owner
   * @param address - market contract owner address
   */
  ACTION bool set_owner(const Address& address);

  /**
   * Query contract owner
   */
  CONST string get_owner();

  /**
   * Change token contract
   * @param address - Change DAT PRC20 token contract address
   */
  ACTION bool set_token_contract(const Address& address);

  /**
   * Query token contract address
   */
  CONST string get_token_contract();

  /**
   * Change market contract
   * @param address - Change DAT market contract address
   */
  ACTION bool set_market_contract(const Address& address);

  /**
   * Query market contract
   */
  CONST string get_market_contract();

  /**
   * Register miner by enclave_public_key
   * @param enclave_public_key - SGX enclave public key
   * @param reward_address - miner address which receive rewards
   */
  ACTION void register_miner(const string& enclave_public_key,
                             const Address& reward_address);

  /**
   * Pledge DAT token
   * @param enclave_public_key - SGX enclave public key
   * @param amount - token amount
   */
  ACTION void pledge_miner(const string& enclave_public_key,
                           const u128& amount);

  /**
   * Unpledge DAT token
   * @param enclave_public_key - SGX enclave public key
   * @param amount - token amount
   */
  ACTION void unpledge_miner(const string& enclave_public_key,
                             const u128& amount);

  /**
   * Verify SGX signature
   * @param enclave_public_key - SGX enclave_public_key
   * @param hashed_value - hashed value of original data
   * @param enclave_signature - SGX signature
   */
  ACTION bool verify_signature(const string& enclave_public_key,
                               const string& hashed_value,
                               const string& enclave_signature);

  /**
   * Update miner by enclave_public_key & enclave_signature
   * @param enclave_public_key - SGX enclave public key
   * @param reward_address - miner address which receive rewards
   */
  ACTION void update_miner(const string& enclave_public_key,
                           const Address& reward_address);

  /**
   * Unregister miner by enclave_public_key & enclave_signature
   * @param enclave_public_key - SGX enclave public key
   */
  ACTION void unregister_miner(const string& enclave_public_key);

  /**
   * check if enclave_public_key is registered or not
   * @param enclave_public_key - SGX enclave public key
   */
  CONST bool is_registered(const string& enclave_public_key);

  /**
   * Submit enclave new deal proof to fill deal
   * @param enclave_public_key - SGX enclave public key
   * @param enclave_timestamp - SGX timestamp
   * @param enclave_stored_size - miner new file size
   * @param stored_files - file list which miner stored
   * @param hashed_value - hashed value of original data
   * @param enclave_signature - SGX signature
   */
  ACTION void fill_deal(
      const string& enclave_public_key, const uint64_t& enclave_timestamp,
      const u128& enclave_stored_size, const vector<cid_file> stored_files,
      const string& hashed_value, const string& enclave_signature);

  /**
   * Withdraw storage service from deal
   * @param enclave_public_key - SGX enclave public key
   * @param cid - deal cid
   */
  ACTION void withdraw_deal(const string& enclave_public_key,
                            const string& cid);

  /**
   * Update enclave storage proof
   * @param enclave_public_key - SGX enclave public key
   * @param enclave_timestamp - SGX timestamp
   * @param enclave_idle_size - miner idle size
   * @param enclave_stored_size - miner file stored size
   * @param stored_files - file list which miner stored
   * @param hashed_value - hashed value of original data
   * @param enclave_signature - SGX signature
   */
  ACTION void update_storage_proof(
      const string& enclave_public_key, const uint64_t& enclave_timestamp,
      const u128& enclave_idle_size, const u128& enclave_stored_size,
      const vector<cid_file> stored_files, const string& hashed_value,
      const string& enclave_signature);

  /**
   * Query last enclave proof
   */
  CONST storage_proof get_storage_proof(const string& enclave_public_key);

  /**
   * Query miner info by enclave_public_key
   * @param enclave_public_key - SGX enclave public key
   */
  CONST miner get_miner(const string& enclave_public_key);

  /**
   * Query total capacity
   */
  CONST u128 get_total_capacity();

  /**
   * Query miner count
   */
  CONST uint64_t get_miner_count();

  /**
   * Submit miner info
   * @param name - miner name
   * @param peer_id - peer id of miner from IPFS network
   * @param country_code - country
   * code(https://en.wikipedia.org/wiki/ISO_3166-1_numeric)
   * @param url - the website url of miner
   */
  ACTION void submit_miner_info(const string& name, const string& peer_id,
                                const string& country_code, const string& url);

  /**
   * Get miner info by sender
   * @param sender - the account which submit miner info
   */
  CONST miner_info get_miner_info(const Address& sender);

  /**
   * Get miner reward address by enclave_public_key
   * @param enclave_public_key - SGX enclave public key
   */
  Address get_miner_reward_address(const string& enclave_public_key);

  /**
   * DAT token holder stake token to miner
   * @param enclave_public_key - SGX enclave public key
   * @param amount - token amount
   */
  ACTION void stake_token(const string& enclave_public_key, const u128& amount);

  /**
   * DAT token holder unstake token from miner
   * @param enclave_public_key - SGX enclave public key
   * @param amount - token amount
   */
  ACTION void unstake_token(const string& enclave_public_key,
                            const u128& amount);

  /**
   * DAT token holder claim stake reward
   */
  ACTION void claim_stake_reward();

  /**
   * Get stake record by from
   * @param from - the account which stake token to miner
   * @param skip - how many records should be skipped
   */
  CONST vector<stake> get_stake_by_from(const Address& from,
                                        const uint8_t& skip);

  /**
   * Get stake record by miner
   * @param enclave_public_key - miner enclave public key
   * @param skip - how many records should be skipped
   */
  CONST vector<stake> get_stake_by_miner(const string& enclave_public_key,
                                         const uint8_t& skip);
};

PLATON_DISPATCH(
    verify,
    (init)(set_owner)(get_owner)(set_token_contract)(get_token_contract)(
        set_market_contract)(get_market_contract)(register_miner)(pledge_miner)(
        unpledge_miner)(update_miner)(unregister_miner)(is_registered)(
        verify_signature)(fill_deal)(withdraw_deal)(update_storage_proof)(
        get_storage_proof)(get_miner)(get_total_capacity)(get_miner_count)(
        submit_miner_info)(get_miner_info)(get_miner_reward_address)(
        stake_token)(unstake_token)(claim_stake_reward)(get_stake_by_from)(
        get_stake_by_miner))
}  // namespace hackathon