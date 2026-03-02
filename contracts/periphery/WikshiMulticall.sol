// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IWikshiLend, MarketParams} from "contracts/interfaces/IWikshiLend.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title WikshiMulticall
/// @notice Batches multiple WikshiLend operations into a single transaction.
/// @dev Provides typed entrypoints that enforce msg.sender == onBehalf, preventing
///      third parties from acting on behalf of users who authorized this contract.
///      The generic multicall(bytes[]) pattern was intentionally avoided because it would
///      forward arbitrary calldata to WikshiLend with the multicall contract as msg.sender,
///      allowing any third party to drain any user who authorized the contract.
///      Users must call setAuthorization(multicall, true) on WikshiLend before using helpers.
/// @custom:security-contact security@wikshi.xyz
contract WikshiMulticall {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The WikshiLend singleton.
    IWikshiLend public immutable WIKSHI_LEND;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiMulticall__OnBehalfMismatch();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address wikshiLend_) {
        WIKSHI_LEND = IWikshiLend(wikshiLend_);
    }

    /*//////////////////////////////////////////////////////////////
                         CONVENIENCE HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Supply collateral and borrow in a single transaction.
    /// @dev Caller must have approved this contract for collateralToken and
    ///      authorized this contract on WikshiLend via setAuthorization.
    ///      onBehalf MUST equal msg.sender to prevent third-party abuse.
    function supplyCollateralAndBorrow(
        MarketParams calldata marketParams,
        uint256 collateralAmount,
        uint256 borrowAmount,
        address onBehalf,
        address receiver
    ) external {
        if (onBehalf != msg.sender) revert WikshiMulticall__OnBehalfMismatch();

        // Transfer collateral from caller to this contract
        IERC20(marketParams.collateralToken).safeTransferFrom(msg.sender, address(this), collateralAmount);

        // Approve WikshiLend to pull collateral
        IERC20(marketParams.collateralToken).forceApprove(address(WIKSHI_LEND), collateralAmount);

        // Supply collateral on behalf of the user
        WIKSHI_LEND.supplyCollateral(marketParams, collateralAmount, onBehalf, "");

        // Borrow on behalf of the user, sending to receiver
        WIKSHI_LEND.borrow(marketParams, borrowAmount, 0, onBehalf, receiver);
    }

    /// @notice Repay debt and withdraw collateral in a single transaction.
    /// @dev Caller must have approved this contract for loanToken and
    ///      authorized this contract on WikshiLend via setAuthorization.
    ///      onBehalf MUST equal msg.sender to prevent third-party abuse.
    function repayAndWithdrawCollateral(
        MarketParams calldata marketParams,
        uint256 repayAmount,
        uint256 collateralAmount,
        address onBehalf,
        address receiver
    ) external {
        if (onBehalf != msg.sender) revert WikshiMulticall__OnBehalfMismatch();

        // Transfer loan tokens from caller to this contract
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), repayAmount);

        // Approve WikshiLend to pull repayment
        IERC20(marketParams.loanToken).forceApprove(address(WIKSHI_LEND), repayAmount);

        // Repay on behalf of the user
        WIKSHI_LEND.repay(marketParams, repayAmount, 0, onBehalf, "");

        // Withdraw collateral to receiver
        WIKSHI_LEND.withdrawCollateral(marketParams, collateralAmount, onBehalf, receiver);
    }
}
