// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MarketParams, IWikshiLend} from "contracts/interfaces/IWikshiLend.sol";
import {IWikshiLiquidateCallback} from "contracts/interfaces/IWikshiCallbacks.sol";

/// @dev Minimal interface for WikshiReceivableWrapper liquidation operations.
interface IWikshiReceivableWrapper {
    function unwrapTo(uint256 tokenId, address recipient) external;
    function depositorOf(uint256 tokenId) external view returns (address);
}

/// @title WikshiLiquidationRouter
/// @notice Atomically liquidates wREC-collateralized positions and unwraps receivable NFTs.
/// @dev Solves the non-transferable redemption rights problem: when WikshiReceivableWrapper
///      is used as collateral in WikshiLend, liquidators seize fungible wREC but cannot
///      redeem it for the underlying NFTs (restricted to depositor/authorized unwrappers).
///      This router bridges the gap by using WikshiLend's flash liquidation callback to
///      unwrap seized wREC and deliver the receivable NFT directly to the liquidator.
///
///      Prevents cherry-picking by validating that:
///      (1) wrapper == marketParams.collateralToken (no cross-wrapper attacks), and
///      (2) depositorOf(tokenId) == borrower (can only unwrap the liquidated borrower's NFT).
///      Without these checks, a liquidator could specify any high-value tokenId from
///      the wrapper pool and steal other depositors' receivables.
///
///      REQUIREMENTS:
///      - This contract must be set as an authorizedUnwrapper on WikshiReceivableWrapper.
///      - Liquidator must approve this router for sufficient loanToken.
///
///      FLOW:
///      1. Liquidator calls liquidateAndUnwrap()
///      2. Router validates wrapper == collateralToken and depositorOf(tokenId) == borrower
///      3. Router calls WikshiLend.liquidate() with callback data
///      4. WikshiLend transfers seized wREC to this router
///      5. WikshiLend calls onWikshiLiquidate() on this router
///      6. Router calls wrapper.unwrapTo(tokenId, liquidator) → NFT goes to liquidator
///      7. Router pulls loanToken from liquidator for repayment
///      8. WikshiLend pulls loanToken from router to complete liquidation
/// @custom:security-contact security@wikshi.xyz
contract WikshiLiquidationRouter is IWikshiLiquidateCallback, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The WikshiLend singleton this router interacts with.
    address public immutable wikshiLend;

    /// @dev Callback context: the actual liquidator (EOA/contract that called liquidateAndUnwrap).
    address private _liquidator;

    /// @dev Callback context: the receivable NFT token ID to unwrap.
    uint256 private _tokenId;

    /// @dev Callback context: the WikshiReceivableWrapper address.
    address private _wrapper;

    /// @dev Callback context: the loan token address for repayment.
    address private _loanToken;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiRouter__OnlyWikshiLend();
    error WikshiRouter__ZeroAddress();
    error WikshiRouter__WrapperMismatch();
    error WikshiRouter__TokenIdNotOwnedByBorrower();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address wikshiLend_) {
        if (wikshiLend_ == address(0)) revert WikshiRouter__ZeroAddress();
        wikshiLend = wikshiLend_;
    }

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Liquidate a wREC-collateralized position and unwrap the receivable NFT.
    /// @dev Caller must have approved this router for sufficient loanToken beforehand.
    ///      Validates wrapper matches collateralToken and tokenId belongs to borrower
    ///      to prevent cherry-picking high-value NFTs from the wrapper pool.
    /// @param marketParams Market parameters (collateralToken must be the wrapper's wREC).
    /// @param borrower The borrower to liquidate.
    /// @param seizedAssets Amount of wREC collateral to seize (or 0 to use repaidShares).
    /// @param repaidShares Borrow shares to repay (or 0 to use seizedAssets).
    /// @param wrapper The WikshiReceivableWrapper address holding the receivable.
    /// @param tokenId The receivable NFT token ID to unwrap after seizure.
    /// @return assetsSeized The amount of wREC collateral seized.
    /// @return assetsRepaid The amount of loanToken repaid.
    function liquidateAndUnwrap(
        MarketParams calldata marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        address wrapper,
        uint256 tokenId
    ) external nonReentrant returns (uint256 assetsSeized, uint256 assetsRepaid) {
        if (wrapper == address(0)) revert WikshiRouter__ZeroAddress();

        // Prevent cross-wrapper attacks.
        // The wrapper must be the actual collateral token of the market being liquidated.
        if (wrapper != marketParams.collateralToken) revert WikshiRouter__WrapperMismatch();

        // Prevent cherry-picking.
        // The tokenId must belong to the borrower being liquidated — liquidators cannot
        // choose arbitrary high-value NFTs from other depositors in the wrapper pool.
        if (IWikshiReceivableWrapper(wrapper).depositorOf(tokenId) != borrower) {
            revert WikshiRouter__TokenIdNotOwnedByBorrower();
        }

        // Store callback context
        _liquidator = msg.sender;
        _tokenId = tokenId;
        _wrapper = wrapper;
        _loanToken = marketParams.loanToken;

        // Trigger liquidation with callback — WikshiLend will:
        // 1. Transfer seized wREC to this router
        // 2. Call onWikshiLiquidate() on this router
        // 3. Pull loanToken from this router
        (assetsSeized, assetsRepaid) = IWikshiLend(wikshiLend).liquidate(
            marketParams, borrower, seizedAssets, repaidShares, abi.encode(tokenId)
        );

        // Cleanup callback context
        _liquidator = address(0);
        _tokenId = 0;
        _wrapper = address(0);
        _loanToken = address(0);
    }

    /// @dev Callback from WikshiLend during liquidation.
    ///      At this point, this router holds the seized wREC tokens.
    function onWikshiLiquidate(uint256 repaidAssets, bytes calldata) external {
        if (msg.sender != wikshiLend) revert WikshiRouter__OnlyWikshiLend();

        // 1. Unwrap: burn seized wREC, send receivable NFT directly to liquidator
        IWikshiReceivableWrapper(_wrapper).unwrapTo(_tokenId, _liquidator);

        // 2. Pull loan tokens from liquidator to this contract
        IERC20(_loanToken).safeTransferFrom(_liquidator, address(this), repaidAssets);

        // 3. Approve WikshiLend to pull loan tokens from this contract
        IERC20(_loanToken).forceApprove(wikshiLend, repaidAssets);
    }
}
