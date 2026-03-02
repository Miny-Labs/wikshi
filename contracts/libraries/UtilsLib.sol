// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

/// @title UtilsLib
/// @author Morpho Labs (adapted for Wikshi)
/// @notice Utility functions for safe casting and comparisons.
/// @dev Adapted from morpho-org/morpho-blue (formally verified, v1.0.0).
/// @custom:security-contact security@wikshi.xyz

library UtilsLib {
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error UtilsLib__ToUint128Overflow();

    /*//////////////////////////////////////////////////////////////
                           MATH HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns min(a, b).
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /// @dev Safely casts uint256 to uint128.
    function toUint128(uint256 x) internal pure returns (uint128) {
        if (x > type(uint128).max) revert UtilsLib__ToUint128Overflow();
        return uint128(x);
    }

    /// @dev Returns max(0, a - b) without underflow.
    function zeroFloorSub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : 0;
    }

}
