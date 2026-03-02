// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

import {MarketParams, Market} from "contracts/interfaces/IWikshiLend.sol";

/// @title IIrm
/// @notice Interface for interest rate models compatible with Morpho Blue's IRM pattern.
/// @dev Returns per-second borrow rate in WAD (1e18).
/// @custom:security-contact security@wikshi.xyz
interface IIrm {
    /// @notice Returns the per-second borrow rate for the given market state.
    /// @param marketParams The market parameters.
    /// @param market_ The current market state (totals).
    /// @return The per-second borrow rate, WAD-scaled.
    function borrowRate(MarketParams calldata marketParams, Market calldata market_) external view returns (uint256);
}
