// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

/// @title IOracle
/// @notice Interface for price oracles compatible with Morpho Blue's oracle pattern.
/// @dev Returns price of 1 asset of collateral token quoted in loan token, scaled by 1e36.
/// @custom:security-contact security@wikshi.xyz
interface IOracle {
    /// @notice Returns the price of 1 unit of collateral token quoted in loan token.
    /// @dev Price is scaled by ORACLE_PRICE_SCALE (1e36).
    ///      Example: If collateral is WETH ($2000) and loan is USDT ($1),
    ///      price() returns 2000e36.
    function price() external view returns (uint256);
}
