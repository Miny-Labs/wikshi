// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

import {MarketParams, Id} from "contracts/interfaces/IWikshiLend.sol";

/// @title MarketParamsLib
/// @notice Library for computing market IDs from MarketParams.
/// @dev Market ID = keccak256(abi.encode(MarketParams)), same pattern as Morpho Blue.
/// @custom:security-contact security@wikshi.xyz
library MarketParamsLib {
    /// @dev Returns the ID of a market from its params.
    function id(MarketParams memory marketParams) internal pure returns (Id) {
        return Id.wrap(keccak256(abi.encode(marketParams)));
    }
}
