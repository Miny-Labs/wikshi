// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.26;

uint256 constant WAD = 1e18;

/// @title MathLib
/// @author Morpho Labs (adapted for Wikshi)
/// @notice WAD-scaled math library with safe rounding.
/// @dev Adapted from morpho-org/morpho-blue (formally verified, v1.0.0).
/// @custom:security-contact security@wikshi.xyz
library MathLib {
    /*//////////////////////////////////////////////////////////////
                           WAD MATH FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns (`x` * `y`) / WAD rounded down.
    function wMulDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, y, WAD);
    }

    /// @dev Returns (`x` * WAD) / `y` rounded down.
    function wDivDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, WAD, y);
    }

    /// @dev Returns (`x` * WAD) / `y` rounded up.
    function wDivUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivUp(x, WAD, y);
    }

    /*//////////////////////////////////////////////////////////////
                          MULDIV FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns (`x` * `y`) / `d` rounded down.
    function mulDivDown(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y) / d;
    }

    /// @dev Returns (`x` * `y`) / `d` rounded up.
    function mulDivUp(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y + (d - 1)) / d;
    }

    /*//////////////////////////////////////////////////////////////
                        TAYLOR COMPOUNDING
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns the 3-term Taylor expansion of e^(x*n) - 1, WAD-scaled.
    /// @dev Used for compound interest accrual: interest = totalBorrow.wMulDown(wTaylorCompounded(rate, elapsed))
    function wTaylorCompounded(uint256 x, uint256 n) internal pure returns (uint256) {
        uint256 firstTerm = x * n;
        uint256 secondTerm = mulDivDown(firstTerm, firstTerm, 2 * WAD);
        uint256 thirdTerm = mulDivDown(secondTerm, firstTerm, 3 * WAD);
        return firstTerm + secondTerm + thirdTerm;
    }
}
