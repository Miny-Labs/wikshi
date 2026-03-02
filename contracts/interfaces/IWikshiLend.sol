// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IWikshiLend Types and Interface
/// @notice Core types and interface for Wikshi's Morpho Blue-style lending protocol.
/// @dev Market ID is the keccak256 hash of MarketParams, same as Morpho Blue.
/// @custom:security-contact security@wikshi.xyz

/*//////////////////////////////////////////////////////////////
                            TYPES
//////////////////////////////////////////////////////////////*/

/// @dev Market ID — hash of MarketParams (same as Morpho Blue).
type Id is bytes32;

/// @dev Parameters that uniquely identify a lending market.
struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle; // IOracle — returns price scaled by ORACLE_PRICE_SCALE (1e36)
    address irm; // IIrm — returns per-second borrow rate in WAD
    uint256 lltv; // Base Loan-to-Value in WAD (e.g., 0.8e18 = 80%)
}

/// @dev Aggregate market state (totals).
struct Market {
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
    uint128 lastUpdate;
    uint128 fee; // WAD-scaled (e.g., 0.1e18 = 10% of interest to protocol)
}

/// @dev Per-user position in a market.
struct Position {
    uint256 supplyShares;
    uint128 borrowShares;
    uint128 collateral;
}

/*//////////////////////////////////////////////////////////////
                           INTERFACE
//////////////////////////////////////////////////////////////*/

interface IWikshiLend {
    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketCreated(Id indexed id, MarketParams marketParams);
    event Supply(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);
    event Withdraw(Id indexed id, address indexed caller, address indexed onBehalf, address receiver, uint256 assets, uint256 shares);
    event SupplyCollateral(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets);
    event WithdrawCollateral(Id indexed id, address indexed caller, address indexed onBehalf, address receiver, uint256 assets);
    event Borrow(Id indexed id, address indexed caller, address indexed onBehalf, address receiver, uint256 assets, uint256 shares);
    event Repay(Id indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);
    event Liquidate(Id indexed id, address indexed caller, address indexed borrower, uint256 repaidAssets, uint256 repaidShares, uint256 seizedAssets, uint256 badDebtAssets, uint256 badDebtShares);
    event AccrueInterest(Id indexed id, uint256 prevBorrowRate, uint256 interest, uint256 feeShares);
    event SetFee(Id indexed id, uint256 newFee);
    event SetFeeRecipient(address indexed oldRecipient, address indexed newRecipient);
    event FlashLoan(address indexed caller, address indexed token, uint256 assets);
    event SetAuthorization(address indexed caller, address indexed authorized, bool newIsAuthorized);
    event SetCreditOracle(address indexed oldOracle, address indexed newOracle);
    event EnableIrm(address indexed irm);
    event EnableLltv(uint256 lltv);
    event EnableOracle(address indexed oracle);
    event SetSupplyCap(Id indexed id, uint256 cap);
    event SetBorrowCap(Id indexed id, uint256 cap);

    /*//////////////////////////////////////////////////////////////
                          MARKET MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function createMarket(MarketParams calldata marketParams) external;
    function setFee(MarketParams calldata marketParams, uint256 newFee) external;
    function setFeeRecipient(address newRecipient) external;
    function setCreditOracle(address newOracle) external;
    function getMarketParams(Id id) external view returns (MarketParams memory);

    /*//////////////////////////////////////////////////////////////
                            SUPPLY SIDE
    //////////////////////////////////////////////////////////////*/

    function supply(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied);

    function withdraw(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /*//////////////////////////////////////////////////////////////
                             COLLATERAL
    //////////////////////////////////////////////////////////////*/

    function supplyCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        bytes calldata data
    ) external;

    function withdrawCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;

    /*//////////////////////////////////////////////////////////////
                            BORROW SIDE
    //////////////////////////////////////////////////////////////*/

    function borrow(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    function repay(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /*//////////////////////////////////////////////////////////////
                            LIQUIDATION
    //////////////////////////////////////////////////////////////*/

    function liquidate(
        MarketParams calldata marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes calldata data
    ) external returns (uint256 assetsSeized, uint256 assetsRepaid);

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function effectiveLltv(MarketParams calldata marketParams, address borrower) external view returns (uint256);
    function isHealthy(MarketParams calldata marketParams, address borrower) external view returns (bool);

    function market(Id id) external view returns (uint128, uint128, uint128, uint128, uint128, uint128);
    function position(Id id, address user) external view returns (uint256, uint128, uint128);
    function isMarketCreated(Id id) external view returns (bool);

    /// @notice Returns comprehensive user position data in a single call.
    function getUserPosition(MarketParams calldata marketParams, address user)
        external
        view
        returns (
            uint256 supplyShares,
            uint128 borrowShares,
            uint128 collateral,
            uint256 borrowAssets,
            uint256 effectiveLltvValue,
            bool healthy,
            uint256 creditScore
        );

    /// @notice Returns aggregate market data including caps and utilization.
    function getMarketData(MarketParams calldata marketParams)
        external
        view
        returns (
            uint128 totalSupplyAssets,
            uint128 totalSupplyShares,
            uint128 totalBorrowAssets,
            uint128 totalBorrowShares,
            uint128 lastUpdate,
            uint128 fee,
            uint256 supplyCapValue,
            uint256 borrowCapValue,
            uint256 utilization
        );

    /*//////////////////////////////////////////////////////////////
                            FLASH LOANS
    //////////////////////////////////////////////////////////////*/

    /// @notice Flash loan any token held by this contract. Zero fee.
    /// @param token The token to flash-borrow.
    /// @param assets The amount to flash-borrow.
    /// @param data Arbitrary data forwarded to the callback.
    function flashLoan(address token, uint256 assets, bytes calldata data) external;

    /*//////////////////////////////////////////////////////////////
                           AUTHORIZATION
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorize another address to act on your behalf (withdraw, borrow, withdrawCollateral).
    function setAuthorization(address authorized, bool newIsAuthorized) external;

    /// @notice Authorize via EIP-712 signature (gasless, bundler-compatible).
    function setAuthorizationWithSig(
        address authorizer,
        address authorized,
        bool newIsAuthorized,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Check if an address is authorized to act on behalf of another.
    function isAuthorized(address authorizer, address authorized) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                          IRM / LLTV WHITELISTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Whitelist an IRM for use in market creation.
    function enableIrm(address irm) external;

    /// @notice Check if an IRM is whitelisted.
    function isIrmEnabled(address irm) external view returns (bool);

    /// @notice Whitelist an LLTV value for use in market creation.
    function enableLltv(uint256 lltv) external;

    /// @notice Check if an LLTV value is whitelisted.
    function isLltvEnabled(uint256 lltv) external view returns (bool);

    /// @notice Whitelist an oracle address for use in market creation.
    function enableOracle(address oracle) external;

    /// @notice Check if an oracle is whitelisted.
    function isOracleEnabled(address oracle) external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                          RISK MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /// @notice Set supply cap for a market (0 = uncapped).
    function setSupplyCap(MarketParams calldata marketParams, uint256 newCap) external;

    /// @notice Set borrow cap for a market (0 = uncapped).
    function setBorrowCap(MarketParams calldata marketParams, uint256 newCap) external;

    /// @notice Pause inflow operations.
    function pause() external;

    /// @notice Unpause all operations.
    function unpause() external;

    /*//////////////////////////////////////////////////////////////
                          INTEREST ACCRUAL
    //////////////////////////////////////////////////////////////*/

    /// @notice Manually accrue interest for a market.
    function accrueInterest(MarketParams calldata marketParams) external;
}
