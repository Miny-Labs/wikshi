// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IWikshiCallbacks
/// @notice Callback interfaces for flash-style operations in WikshiLend.
/// @dev Follows Morpho Blue's callback pattern: Effects → Callback → TransferFrom.
///      Implementers receive control AFTER state updates but BEFORE tokens are pulled,
///      enabling flash supply, flash repay, and flash liquidation.

interface IWikshiSupplyCallback {
    /// @notice Called after supply state updates, before loan tokens are pulled.
    /// @param assets The amount of loan tokens to be pulled after this callback.
    /// @param data Arbitrary data passed through from the supply call.
    function onWikshiSupply(uint256 assets, bytes calldata data) external;
}

interface IWikshiRepayCallback {
    /// @notice Called after repay state updates, before loan tokens are pulled.
    /// @param assets The amount of loan tokens to be pulled after this callback.
    /// @param data Arbitrary data passed through from the repay call.
    function onWikshiRepay(uint256 assets, bytes calldata data) external;
}

interface IWikshiSupplyCollateralCallback {
    /// @notice Called after collateral state updates, before collateral tokens are pulled.
    /// @param assets The amount of collateral tokens to be pulled after this callback.
    /// @param data Arbitrary data passed through from the supplyCollateral call.
    function onWikshiSupplyCollateral(uint256 assets, bytes calldata data) external;
}

interface IWikshiLiquidateCallback {
    /// @notice Called after collateral is sent to the liquidator, before loan tokens are pulled.
    /// @dev Enables flash liquidation: sell seized collateral in this callback, use proceeds to repay.
    /// @param repaidAssets The amount of loan tokens to be pulled after this callback.
    /// @param data Arbitrary data passed through from the liquidate call.
    function onWikshiLiquidate(uint256 repaidAssets, bytes calldata data) external;
}

interface IWikshiFlashLoanCallback {
    /// @notice Called during a flash loan, after tokens are sent to the borrower.
    /// @dev The borrower must approve WikshiLend to pull back the full amount before returning.
    /// @param assets The amount of tokens flash-borrowed.
    /// @param data Arbitrary data passed through from the flashLoan call.
    function onWikshiFlashLoan(uint256 assets, bytes calldata data) external;
}
