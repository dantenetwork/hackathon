#pragma once

#include <platon/platon.hpp>

#include "../math.hpp"

using namespace platon;
using namespace platon::db;
using std::map;
using std::string;
using std::vector;

namespace hackathon {

/**
 * The `market` smart contract is provided by `dante network team` as a sample
 * platon wasm contract, and it defines the structures and actions needed for
 * platon-hackathon's core functionality.
 */

const uint8_t kMaxDealEachSender = 10;  // max deal count for each sender

struct deal {
 public:
  string cid;     // deal cid of IPFS network
  uint8_t state;  // current deal state, 0 = deal opened, 1= filled, 2 = closed,
                  // 3 = invalid (miner reported file size is larger
                  // than size of deal) , default as 0
  bool slashed;   // is slashed, default as false
  u128 size;      // deal files size
  u128 price;     // deal price per block
  u128 duration;  // deal duration (blocks)
  uint64_t end_block_num;     // the block number that deal will be end
  Address sender;             // deal sender
  uint8_t miner_required;     // the amount of miners required
  u128 total_reward;          // deal total rewards
  u128 reward_balance;        // reward balance after miner claimed
  vector<string> miner_list;  // miner list
  string primary_key() const { return cid; }
  Address by_sender() const { return sender; }

  PLATON_SERIALIZE(
      deal,
      (cid)(state)(slashed)(size)(price)(duration)(end_block_num)(sender)(
          miner_required)(total_reward)(reward_balance)(miner_list));
};

struct filled_deal {
 public:
  string cid;  // deal cid
  u128 size;   // file size of deal
  PLATON_SERIALIZE(filled_deal, (cid)(size));
};

struct storage_proof {
 public:
  uint64_t last_proof_block_num;  // last storage proof when miner submitted
  uint64_t
      last_claimed_block_num;   // block number when last deal reward claimed
  vector<string> filled_deals;  // deals that miner stored

  PLATON_SERIALIZE(
      storage_proof,
      (last_proof_block_num)(last_claimed_block_num)(filled_deals));
};

CONTRACT market : public Contract {
 public:
  // DANTE token contract
  StorageType<"token_contract"_n, Address> token_contract;

  // DANTE verify contract
  StorageType<"verify_contract"_n, Address> verify_contract;

  // total deal count
  StorageType<"deal_count"_n, uint64_t> deal_count;

  // Deal table
  // UniqueIndex: cid, NormalIndex: sender
  MultiIndex<
      "deal"_n, deal,
      IndexedBy<"cid"_n, IndexMemberFun<deal, string, &deal::primary_key,
                                        IndexType::UniqueIndex>>,
      IndexedBy<"sender"_n, IndexMemberFun<deal, Address, &deal::by_sender,
                                           IndexType::NormalIndex>>>
      deal_table;

  // Storage proof map of miner
  // <enclave_public_key, storage_proof>
  platon::db::Map<"storage_proof"_n, string, storage_proof> storage_proof_map;

  /**
   * If the miner fills a new deal, the storage proof record will be
   * stored in the temporary fresh_deal_map, which will be deleted after the
   * next reward is claimed
   */
  // <cid, filled_block_num>
  platon::db::Map<"fresh_deal"_n, string, uint64_t> fresh_deal_map;

  // Market contract events
 public:
  PLATON_EVENT1(AddDeal, Address, string, u128);
  PLATON_EVENT0(FillDeal, string);
  PLATON_EVENT0(RenewalDeal, string);
  PLATON_EVENT0(WithdrawDeal, string);
  PLATON_EVENT0(UpdateStorageProof, string);
  PLATON_EVENT1(ClaimDealReward, Address, string);

 public:
  /**
   * Contract init
   * @param token_contract_address - DAT PRC20 token contract address
   * @param verify_contract_address - DAT verify contract address
   */
  ACTION void init(const Address& token_contract_address,
                   const Address& verify_contract_address);

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
   * Query token contract
   */
  CONST string get_token_contract();

  /**
   * Change verify contract
   * @param address - Change DAT verify contract address
   */
  ACTION bool set_verify_contract(const Address& address);

  /**
   * Query verify contract
   */
  CONST string get_verify_contract();

  /**
   * Ensure current transaction is sent from verify contract
   */
  void require_verify_contract_auth();

  /**
   * Ensure enclave_public_key is registered
   */
  void require_miner_registered(const string& enclave_public_key);

  /**
   * Add deal
   * @param cid - deal cid of IPFS network
   * @param size - deal files size
   * @param price - deal price per block
   * @param duration - deal duration (blocks)
   * @param miner_required - amount of miners required
   */
  ACTION void add_deal(const string& cid, const u128& size, const u128& price,
                       const u128& duration, const uint8_t& miner_required);

  /**
   * Renewal deal
   * @param cid - deal cid of IPFS network
   * @param duration - deal duration (blocks)
   */
  ACTION void renewal_deal(const string& cid, const u128& duration);

  /**
   * Withdraw deal
   * @param enclave_public_key - miner enclave_public_key
   * @param cid - deal cid of IPFS network
   */
  ACTION bool withdraw_deal(const string& enclave_public_key,
                            const string& cid);

  /**
   * Get deal by cid
   * @param cid - deal cid of IPFS network
   */
  CONST deal get_deal_by_cid(const string& cid);

  /**
   * Get deal by sender
   * @param sender - account address which pushed add_deal transaction
   * @param skip - how many deals should be skipped
   */
  CONST vector<string> get_deal_by_sender(const Address& sender,
                                          const uint8_t& skip);

  /**
   * Get opened deals
   * @param skip - how many deals should be skipped
   */
  CONST vector<string> get_opened_deal(const uint8_t& skip);

  /**
   * miner update storage proof and ensure signature is verified by
   * verify_contract
   * @param enclave_public_key - SGX enclave public key
   * @param added_files - deals which miner added
   * @param deleted_files - deals which miner deleted
   */
  ACTION int64_t update_storage_proof(
      const string& enclave_public_key, const vector<filled_deal>& added_files,
      const vector<filled_deal>& deleted_files, u128& miner_remaining_quota);

  /**
   * Get miner last proof
   * @param enclave_public_key - SGX enclave public key
   */
  CONST storage_proof get_storage_proof(const string& enclave_public_key);

  /**
   * Claim deal reward
   * @param enclave_public_key - SGX enclave public key
   */
  ACTION bool claim_deal_reward(const string& enclave_public_key);

  /**
   * handle one deal reward
   * @param enclave_public_key - SGX enclave public key
   * @param cid - deal cid
   * @param reward_blocks - block number since last claimed
   */
  u128 each_deal_reward(const string& enclave_public_key, const string& cid,
                        uint64_t reward_blocks);

  /**
   * Get deal count
   */
  CONST uint64_t get_deal_count();

  /**
   * Get all deals filled by miner
   * @param enclave_public_key - SGX enclave public key
   */
  CONST vector<string> get_deals_by_miner(const string& enclave_public_key);

  /**
   * Get the number of deals filled by miners
   * @param enclave_public_key - SGX enclave public key
   */
  CONST uint32_t get_deal_count_by_miner(const string& enclave_public_key);
};

PLATON_DISPATCH(
    market,
    (init)(set_owner)(get_owner)(set_token_contract)(get_token_contract)(
        set_verify_contract)(get_verify_contract)(add_deal)(renewal_deal)(
        withdraw_deal)(get_deal_by_cid)(get_deal_by_sender)(get_opened_deal)(
        update_storage_proof)(get_storage_proof)(claim_deal_reward)(
        get_deal_count)(get_deals_by_miner)(get_deal_count_by_miner))
}  // namespace hackathon