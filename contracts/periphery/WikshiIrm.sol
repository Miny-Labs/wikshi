// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IIrm} from "contracts/interfaces/IIrm.sol";
import {MarketParams, Market} from "contracts/interfaces/IWikshiLend.sol";
import {MathLib, WAD} from "contracts/libraries/MathLib.sol";

/// @title WikshiIrm
/// @notice Credit-aware kink-based interest rate model compatible with Morpho Blue's IIrm interface.
/// @dev Uses a two-slope model: gentle slope below optimal utilization, steep slope above.
///      All rates are per-second and WAD-scaled. The Taylor expansion in WikshiLend
///      compounds them over the elapsed time period.
///      Credit-native extension: `borrowRateForUser()` applies a per-borrower discount
///      based on their credit score — higher scores get lower effective rates.
///      Pool-level accounting uses the base rate; the discount is applied at the
///      UX/integration layer (same as Credora + Morpho Blue integration pattern).
/// @custom:security-contact security@wikshi.xyz
contract WikshiIrm is IIrm {
    using MathLib for uint256;

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum credit score value.
    uint256 public constant MAX_CREDIT_SCORE = 1000;

    /// @notice Maximum rate discount for highest credit score (20% of base rate).
    /// @dev Score 1000 → pays 80% of the pool rate. Score 0 → pays 100%.
    uint256 public constant MAX_CREDIT_RATE_DISCOUNT = 0.20e18;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Base borrow rate per second (WAD-scaled). ~2% APR.
    uint256 public immutable BASE_RATE;

    /// @notice Slope below optimal utilization per second (WAD-scaled). ~4% APR.
    uint256 public immutable SLOPE_1;

    /// @notice Slope above optimal utilization per second (WAD-scaled). ~75% APR.
    uint256 public immutable SLOPE_2;

    /// @notice Optimal utilization ratio (WAD-scaled, e.g., 0.8e18 = 80%).
    uint256 public immutable OPTIMAL_UTILIZATION;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiIrm__InvalidOptimalUtilization();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param baseRate Base rate per second (WAD).
    /// @param slope1 Slope below kink per second (WAD).
    /// @param slope2 Slope above kink per second (WAD).
    /// @param optimalUtilization Kink point (WAD, must be > 0 and < WAD).
    constructor(uint256 baseRate, uint256 slope1, uint256 slope2, uint256 optimalUtilization) {
        if (optimalUtilization == 0 || optimalUtilization >= WAD) {
            revert WikshiIrm__InvalidOptimalUtilization();
        }
        BASE_RATE = baseRate;
        SLOPE_1 = slope1;
        SLOPE_2 = slope2;
        OPTIMAL_UTILIZATION = optimalUtilization;
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IIrm
    function borrowRate(MarketParams calldata, Market calldata market_) external view returns (uint256) {
        return _borrowRate(market_);
    }

    /// @notice Returns the credit-adjusted borrow rate for a specific user.
    /// @dev Score 0 → base pool rate (no discount).
    ///      Score 1000 → pool rate * (1 - MAX_CREDIT_RATE_DISCOUNT) = 80% of pool rate.
    ///      This is a VIEW for UX/integration — pool accounting uses the uniform rate.
    /// @param market_ The current market state.
    /// @param creditScore The borrower's credit score (0-1000).
    /// @return The per-second credit-adjusted borrow rate, WAD-scaled.
    function borrowRateForUser(Market calldata market_, uint256 creditScore) external view returns (uint256) {
        uint256 poolRate = _borrowRate(market_);
        if (creditScore == 0) return poolRate;

        uint256 cappedScore = creditScore > MAX_CREDIT_SCORE ? MAX_CREDIT_SCORE : creditScore;
        // discount = MAX_CREDIT_RATE_DISCOUNT * score / MAX_CREDIT_SCORE
        uint256 discount = MAX_CREDIT_RATE_DISCOUNT * cappedScore / MAX_CREDIT_SCORE;
        // effectiveRate = poolRate * (1 - discount)
        return poolRate.wMulDown(WAD - discount);
    }

    /// @notice Returns the credit rate discount factor for a given score.
    /// @dev Useful for UIs: "Your credit score saves you X% on interest."
    /// @param creditScore The borrower's credit score (0-1000).
    /// @return The discount as a WAD fraction (e.g., 0.20e18 = 20% discount).
    function creditRateDiscount(uint256 creditScore) external pure returns (uint256) {
        if (creditScore == 0) return 0;
        uint256 cappedScore = creditScore > MAX_CREDIT_SCORE ? MAX_CREDIT_SCORE : creditScore;
        return MAX_CREDIT_RATE_DISCOUNT * cappedScore / MAX_CREDIT_SCORE;
    }

    /*//////////////////////////////////////////////////////////////
                      INTERNAL READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Core kink-based rate calculation.
    function _borrowRate(Market calldata market_) internal view returns (uint256) {
        if (market_.totalSupplyAssets == 0) return BASE_RATE;

        uint256 utilization = uint256(market_.totalBorrowAssets).wDivDown(uint256(market_.totalSupplyAssets));

        if (utilization <= OPTIMAL_UTILIZATION) {
            return BASE_RATE + utilization.wMulDown(SLOPE_1).wDivDown(OPTIMAL_UTILIZATION);
        }

        uint256 excessUtil = utilization - OPTIMAL_UTILIZATION;
        uint256 maxExcess = WAD - OPTIMAL_UTILIZATION;
        return BASE_RATE + SLOPE_1 + excessUtil.wMulDown(SLOPE_2).wDivDown(maxExcess);
    }
}
