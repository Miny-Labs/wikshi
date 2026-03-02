// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWikshiSupplyCallback, IWikshiRepayCallback, IWikshiSupplyCollateralCallback, IWikshiLiquidateCallback, IWikshiFlashLoanCallback} from "contracts/interfaces/IWikshiCallbacks.sol";

/// @dev Minimal interface for initiating flash loans from mock contracts.
interface IFlashLoanInitiator {
    function flashLoan(address token, uint256 assets, bytes calldata data) external;
}

/// @title MockFlashSupplier
/// @notice Mock callback contract for testing flash supply.
contract MockFlashSupplier is IWikshiSupplyCallback {
    bool public callbackInvoked;
    uint256 public callbackAssets;

    function onWikshiSupply(uint256 assets, bytes calldata data) external {
        callbackInvoked = true;
        callbackAssets = assets;
        // Decode the loan token address and approve WikshiLend to pull
        address loanToken = abi.decode(data, (address));
        IERC20(loanToken).approve(msg.sender, assets);
    }
}

/// @title MockFlashRepayer
/// @notice Mock callback contract for testing flash repay.
contract MockFlashRepayer is IWikshiRepayCallback {
    bool public callbackInvoked;
    uint256 public callbackAssets;

    function onWikshiRepay(uint256 assets, bytes calldata data) external {
        callbackInvoked = true;
        callbackAssets = assets;
        address loanToken = abi.decode(data, (address));
        IERC20(loanToken).approve(msg.sender, assets);
    }
}

/// @title MockFlashCollateralSupplier
/// @notice Mock callback contract for testing flash collateral supply.
contract MockFlashCollateralSupplier is IWikshiSupplyCollateralCallback {
    bool public callbackInvoked;
    uint256 public callbackAssets;

    function onWikshiSupplyCollateral(uint256 assets, bytes calldata data) external {
        callbackInvoked = true;
        callbackAssets = assets;
        address collateralToken = abi.decode(data, (address));
        IERC20(collateralToken).approve(msg.sender, assets);
    }
}

/// @title MockFlashLiquidator
/// @notice Mock callback contract for testing flash liquidation.
/// @dev In the callback, the liquidator already holds the seized collateral.
///      It simulates selling collateral on a DEX and using proceeds to approve loan repayment.
contract MockFlashLiquidator is IWikshiLiquidateCallback {
    bool public callbackInvoked;
    uint256 public callbackRepaidAssets;
    uint256 public collateralBalanceDuringCallback;

    function onWikshiLiquidate(uint256 repaidAssets, bytes calldata data) external {
        callbackInvoked = true;
        callbackRepaidAssets = repaidAssets;

        (address loanToken, address collateralToken) = abi.decode(data, (address, address));

        // Record collateral balance to prove we received it BEFORE this callback
        collateralBalanceDuringCallback = IERC20(collateralToken).balanceOf(address(this));

        // Approve WikshiLend to pull the loan tokens for repayment
        IERC20(loanToken).approve(msg.sender, repaidAssets);
    }
}

/// @title MockFlashLoanReceiver
/// @notice Mock callback contract for testing free flash loans.
/// @dev Receives tokens, approves WikshiLend to pull them back.
contract MockFlashLoanReceiver is IWikshiFlashLoanCallback {
    bool public callbackInvoked;
    uint256 public callbackAssets;
    uint256 public tokenBalanceDuringCallback;

    function onWikshiFlashLoan(uint256 assets, bytes calldata data) external {
        callbackInvoked = true;
        callbackAssets = assets;

        address token = abi.decode(data, (address));
        tokenBalanceDuringCallback = IERC20(token).balanceOf(address(this));

        // Approve WikshiLend to pull the tokens back
        IERC20(token).approve(msg.sender, assets);
    }

    /// @notice Trigger a flash loan from this contract (for integration testing).
    function executeFlashLoan(address wikshiLend, address token, uint256 assets) external {
        bytes memory data = abi.encode(token);
        IFlashLoanInitiator(wikshiLend).flashLoan(token, assets, data);
    }
}

/// @title MockBadFlashLoanReceiver
/// @notice Mock that does NOT approve repayment — should cause flash loan to revert.
contract MockBadFlashLoanReceiver is IWikshiFlashLoanCallback {
    function onWikshiFlashLoan(uint256, bytes calldata) external {
        // Intentionally do NOT approve — the flash loan should revert
    }
}
