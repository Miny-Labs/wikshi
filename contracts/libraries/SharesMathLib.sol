// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

import {MathLib} from "contracts/libraries/MathLib.sol";

uint256 constant VIRTUAL_SHARES = 1e6;
uint256 constant VIRTUAL_ASSETS = 1;

/// @title SharesMathLib
/// @author Morpho Labs (adapted for Wikshi)
/// @notice Share conversion library with virtual shares to prevent inflation attacks.
/// @dev Adapted from morpho-org/morpho-blue (formally verified, v1.0.0).
/// @dev Virtual shares (1e6) and virtual assets (1) prevent the first-depositor inflation attack
///      where an attacker donates assets to make subsequent depositors receive 0 shares.
/// @custom:security-contact security@wikshi.xyz
library SharesMathLib {
    using MathLib for uint256;

    /*//////////////////////////////////////////////////////////////
                        SHARES CONVERSIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Converts assets to shares, rounding DOWN (favors protocol on supply).
    function toSharesDown(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return assets.mulDivDown(totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    /// @dev Converts assets to shares, rounding UP (favors protocol on withdraw).
    function toSharesUp(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return assets.mulDivUp(totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    /// @dev Converts shares to assets, rounding DOWN (favors protocol on redeem).
    function toAssetsDown(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return shares.mulDivDown(totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }

    /// @dev Converts shares to assets, rounding UP (favors protocol on borrow accounting).
    function toAssetsUp(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return shares.mulDivUp(totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }
}
