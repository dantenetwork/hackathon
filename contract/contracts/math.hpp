#pragma once

#include <platon/platon.hpp>

using namespace platon;

namespace hackathon {

// Safe multiplication, revert transaction if multiplication overflowed
u128 safeMul(const u128& a, const u128& b) {
	// Gas optimization: this is cheaper than requiring 'a' not being zero, but the
	// benefit is lost if 'b' is also tested.
	// See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
	if (a == 0) return 0;
	u128 c = a * b;
	if (c / a != b) {
		platon_revert();
	}
	return c;
}

}  // namespace hackathon