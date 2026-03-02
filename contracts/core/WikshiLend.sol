// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

import {Id, MarketParams, Market, Position, IWikshiLend} from "contracts/interfaces/IWikshiLend.sol";
import {IOracle} from "contracts/interfaces/IOracle.sol";
import {IIrm} from "contracts/interfaces/IIrm.sol";
import {IWikshiCreditOracle} from "contracts/interfaces/IWikshiCreditOracle.sol";
import {MathLib, WAD} from "contracts/libraries/MathLib.sol";
import {SharesMathLib} from "contracts/libraries/SharesMathLib.sol";
import {UtilsLib} from "contracts/libraries/UtilsLib.sol";
import {MarketParamsLib} from "contracts/libraries/MarketParamsLib.sol";
import {IWikshiSupplyCallback, IWikshiRepayCallback, IWikshiSupplyCollateralCallback, IWikshiLiquidateCallback, IWikshiFlashLoanCallback} from "contracts/interfaces/IWikshiCallbacks.sol";

/// @title WikshiLend
/// @notice Singleton lending protocol with isolated markets and credit-adjusted LLTV.
/// @dev Architecture: Morpho Blue (formally verified, 650 lines core) + one addition:
///      credit scores from WikshiCreditOracle adjust the LLTV per-borrower, enabling
///      borrowers with proven credit history to post less collateral.
///      Key difference from Morpho Blue: `_effectiveLltv()` reads credit oracle.
/// @custom:security-contact security@wikshi.xyz
contract WikshiLend is IWikshiLend, Ownable2Step, ReentrancyGuard, Pausable, EIP712, Nonces {
    using MathLib for uint256;
    using MathLib for uint128;
    using SharesMathLib for uint256;
    using UtilsLib for uint256;
    using MarketParamsLib for MarketParams;
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum protocol fee (25% of interest).
    uint256 public constant MAX_FEE = 0.25e18;

    /// @notice Maximum base LLTV (98%).
    uint256 public constant MAX_LLTV = 0.98e18;

    /// @notice Price scale for oracles (1e36).
    uint256 public constant ORACLE_PRICE_SCALE = 1e36;

    /// @notice Cursor for liquidation incentive calculation.
    uint256 public constant LIQUIDATION_CURSOR = 0.3e18;

    /// @notice Maximum liquidation incentive factor (15% bonus).
    uint256 public constant MAX_LIQUIDATION_INCENTIVE_FACTOR = 1.15e18;

    /// @notice Maximum LLTV bonus from credit score (10%).
    uint256 public constant MAX_CREDIT_LLTV_BONUS = 0.10e18;

    /// @notice Maximum credit score value.
    uint256 public constant MAX_CREDIT_SCORE = 1000;

    /// @notice EIP-712 typehash for setAuthorizationWithSig.
    bytes32 public constant AUTHORIZATION_TYPEHASH = keccak256(
        "Authorization(address authorizer,address authorized,bool isAuthorized,uint256 nonce,uint256 deadline)"
    );

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Market aggregate state by ID.
    mapping(Id => Market) public market;

    /// @notice Market params stored by ID (for reverse lookup).
    mapping(Id => MarketParams) internal idToMarketParams;

    /// @notice Per-user positions by market ID.
    mapping(Id => mapping(address => Position)) public position;

    /// @notice Whether a market ID has been created.
    mapping(Id => bool) public isMarketCreated;

    /// @notice Protocol fee recipient.
    address public feeRecipient;

    /// @notice Credit oracle for score lookups.
    IWikshiCreditOracle public creditOracle;

    /// @notice Authorization: authorizer => authorized => bool.
    /// @dev Enables vaults, routers, and bundlers to manage positions on behalf of users.
    mapping(address => mapping(address => bool)) public isAuthorized;

    /// @notice Whitelisted IRM addresses.
    mapping(address => bool) public isIrmEnabled;

    /// @notice Whitelisted LLTV values.
    mapping(uint256 => bool) public isLltvEnabled;

    /// @notice Whitelisted oracle addresses.
    mapping(address => bool) public isOracleEnabled;

    /// @notice Supply cap per market (0 = uncapped).
    mapping(Id => uint256) public supplyCap;

    /// @notice Borrow cap per market (0 = uncapped).
    mapping(Id => uint256) public borrowCap;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiLend__MarketAlreadyCreated();
    error WikshiLend__MarketNotCreated();
    error WikshiLend__InvalidLltv();
    error WikshiLend__FeeTooHigh();
    error WikshiLend__ZeroAddress();
    error WikshiLend__ZeroAssets();
    error WikshiLend__InsufficientLiquidity();
    error WikshiLend__HealthyPosition();
    error WikshiLend__UnhealthyPosition();
    error WikshiLend__Unauthorized();
    error WikshiLend__InconsistentInput();
    error WikshiLend__IrmNotEnabled();
    error WikshiLend__LltvNotEnabled();
    error WikshiLend__CapExceeded();
    error WikshiLend__OracleNotEnabled();
    error WikshiLend__SignatureExpired();
    error WikshiLend__InvalidSignature();
    error WikshiLend__TransferAmountMismatch();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param initialOwner The initial owner (should be multisig for mainnet).
    /// @param creditOracle_ The credit oracle contract.
    constructor(address initialOwner, address creditOracle_) Ownable(initialOwner) EIP712("WikshiLend", "1") {
        if (creditOracle_ == address(0)) revert WikshiLend__ZeroAddress();
        creditOracle = IWikshiCreditOracle(creditOracle_);
    }

    /*//////////////////////////////////////////////////////////////
                    USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiLend
    /// @dev Restricted to onlyOwner to prevent oracle/token mismatch attacks. Without this, an attacker
    ///      could create a market pairing a worthless collateral token with an enabled oracle for a
    ///      different pair, then borrow valuable assets against phantom collateral.
    ///      Owner responsibility: ensure the enabled oracle correctly prices the (loanToken, collateralToken) pair.
    function createMarket(MarketParams calldata marketParams) external onlyOwner {
        Id id = marketParams.id();
        if (isMarketCreated[id]) revert WikshiLend__MarketAlreadyCreated();
        if (marketParams.lltv >= WAD) revert WikshiLend__InvalidLltv();
        if (!isLltvEnabled[marketParams.lltv]) revert WikshiLend__LltvNotEnabled();
        if (!isIrmEnabled[marketParams.irm]) revert WikshiLend__IrmNotEnabled();
        if (!isOracleEnabled[marketParams.oracle]) revert WikshiLend__OracleNotEnabled();
        if (marketParams.loanToken == address(0)) revert WikshiLend__ZeroAddress();
        if (marketParams.collateralToken == address(0)) revert WikshiLend__ZeroAddress();

        isMarketCreated[id] = true;
        idToMarketParams[id] = marketParams;
        market[id].lastUpdate = uint128(block.timestamp);

        emit MarketCreated(id, marketParams);
    }

    /// @inheritdoc IWikshiLend
    function setFee(MarketParams calldata marketParams, uint256 newFee) external onlyOwner {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (newFee > MAX_FEE) revert WikshiLend__FeeTooHigh();

        _accrueInterest(marketParams, id);
        market[id].fee = uint128(newFee);

        emit SetFee(id, newFee);
    }

    /// @notice Sets the fee recipient address.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert WikshiLend__ZeroAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit SetFeeRecipient(oldRecipient, newRecipient);
    }

    /// @notice Updates the credit oracle address.
    function setCreditOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert WikshiLend__ZeroAddress();
        address oldOracle = address(creditOracle);
        creditOracle = IWikshiCreditOracle(newOracle);
        emit SetCreditOracle(oldOracle, newOracle);
    }

    /// @inheritdoc IWikshiLend
    function setAuthorization(address authorized, bool newIsAuthorized) external {
        isAuthorized[msg.sender][authorized] = newIsAuthorized;
        emit SetAuthorization(msg.sender, authorized, newIsAuthorized);
    }

    /// @inheritdoc IWikshiLend
    /// @dev Morpho Blue parity: EIP-712 signature-based authorization for gasless ops,
    ///      bundlers, and account abstraction compatibility.
    function setAuthorizationWithSig(
        address authorizer,
        address authorized,
        bool newIsAuthorized,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (block.timestamp > deadline) revert WikshiLend__SignatureExpired();

        bytes32 structHash = keccak256(abi.encode(
            AUTHORIZATION_TYPEHASH,
            authorizer,
            authorized,
            newIsAuthorized,
            _useNonce(authorizer),
            deadline
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);

        if (signer != authorizer) revert WikshiLend__InvalidSignature();

        isAuthorized[authorizer][authorized] = newIsAuthorized;
        emit SetAuthorization(authorizer, authorized, newIsAuthorized);
    }

    /// @inheritdoc IWikshiLend
    function enableIrm(address irm) external onlyOwner {
        isIrmEnabled[irm] = true;
        emit EnableIrm(irm);
    }

    /// @inheritdoc IWikshiLend
    function enableLltv(uint256 lltv) external onlyOwner {
        if (lltv >= WAD) revert WikshiLend__InvalidLltv();
        isLltvEnabled[lltv] = true;
        emit EnableLltv(lltv);
    }

    /// @inheritdoc IWikshiLend
    /// @dev Oracle allowlist prevents malicious oracles in market creation.
    function enableOracle(address oracle) external onlyOwner {
        if (oracle == address(0)) revert WikshiLend__ZeroAddress();
        isOracleEnabled[oracle] = true;
        emit EnableOracle(oracle);
    }

    /// @inheritdoc IWikshiLend
    function setSupplyCap(MarketParams calldata marketParams, uint256 newCap) external onlyOwner {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        supplyCap[id] = newCap;
        emit SetSupplyCap(id, newCap);
    }

    /// @inheritdoc IWikshiLend
    function setBorrowCap(MarketParams calldata marketParams, uint256 newCap) external onlyOwner {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        borrowCap[id] = newCap;
        emit SetBorrowCap(id, newCap);
    }

    /// @notice Pause inflow operations (supply, borrow, supplyCollateral, flashLoan).
    /// @dev Withdraw, repay, liquidate remain operational — users must always be able to exit.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all operations.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc IWikshiLend
    function accrueInterest(MarketParams calldata marketParams) external {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        _accrueInterest(marketParams, id);
    }

    /// @inheritdoc IWikshiLend
    /// @dev Free flash loans — Morpho Blue's signature feature. Zero fee.
    ///      Flow: snapshot balance → transfer out → callback → pull back → verify balance restored.
    ///      Balance check after callback prevents fee-on-transfer token drain.
    function flashLoan(address token, uint256 assets, bytes calldata data) external nonReentrant whenNotPaused {
        if (assets == 0) revert WikshiLend__ZeroAssets();

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransfer(msg.sender, assets);

        IWikshiFlashLoanCallback(msg.sender).onWikshiFlashLoan(assets, data);

        IERC20(token).safeTransferFrom(msg.sender, address(this), assets);

        if (IERC20(token).balanceOf(address(this)) < balanceBefore) revert WikshiLend__TransferAmountMismatch();

        emit FlashLoan(msg.sender, token, assets);
    }

    /// @inheritdoc IWikshiLend
    function supply(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external nonReentrant whenNotPaused returns (uint256 assetsSupplied, uint256 sharesSupplied) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (onBehalf == address(0)) revert WikshiLend__ZeroAddress();

        _accrueInterest(marketParams, id);

        if (assets != 0 && shares != 0) revert WikshiLend__InconsistentInput();

        // Exactly one of assets/shares must be nonzero
        if (assets > 0) {
            // shares rounded DOWN — favors protocol
            sharesSupplied = assets.toSharesDown(market[id].totalSupplyAssets, market[id].totalSupplyShares);
            assetsSupplied = assets;
        } else if (shares > 0) {
            // assets rounded UP — favors protocol (supplier provides more)
            assetsSupplied = shares.toAssetsUp(market[id].totalSupplyAssets, market[id].totalSupplyShares);
            sharesSupplied = shares;
        } else {
            revert WikshiLend__ZeroAssets();
        }

        // Effects
        market[id].totalSupplyAssets += assetsSupplied.toUint128();
        market[id].totalSupplyShares += sharesSupplied.toUint128();
        position[id][onBehalf].supplyShares += sharesSupplied;

        // Supply cap enforcement
        uint256 _supplyCap = supplyCap[id];
        if (_supplyCap != 0 && market[id].totalSupplyAssets > _supplyCap) revert WikshiLend__CapExceeded();

        // Callback (enables flash supply)
        if (data.length > 0) IWikshiSupplyCallback(msg.sender).onWikshiSupply(assetsSupplied, data);

        // Interactions — balance check prevents fee-on-transfer token inflation
        uint256 balBefore = IERC20(marketParams.loanToken).balanceOf(address(this));
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), assetsSupplied);
        if (IERC20(marketParams.loanToken).balanceOf(address(this)) < balBefore + assetsSupplied) {
            revert WikshiLend__TransferAmountMismatch();
        }

        emit Supply(id, msg.sender, onBehalf, assetsSupplied, sharesSupplied);
    }

    /// @inheritdoc IWikshiLend
    function withdraw(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external nonReentrant returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (receiver == address(0)) revert WikshiLend__ZeroAddress();
        if (!_isSenderAuthorized(onBehalf)) revert WikshiLend__Unauthorized();

        _accrueInterest(marketParams, id);

        if (assets != 0 && shares != 0) revert WikshiLend__InconsistentInput();

        if (assets > 0) {
            // shares rounded UP — favors protocol (more shares burned)
            sharesWithdrawn = assets.toSharesUp(market[id].totalSupplyAssets, market[id].totalSupplyShares);
            assetsWithdrawn = assets;
        } else if (shares > 0) {
            // assets rounded DOWN — favors protocol (less assets returned)
            assetsWithdrawn = shares.toAssetsDown(market[id].totalSupplyAssets, market[id].totalSupplyShares);
            sharesWithdrawn = shares;
        } else {
            revert WikshiLend__ZeroAssets();
        }

        if (position[id][onBehalf].supplyShares < sharesWithdrawn) {
            revert WikshiLend__InsufficientLiquidity();
        }

        // Effects
        position[id][onBehalf].supplyShares -= sharesWithdrawn;
        market[id].totalSupplyAssets -= assetsWithdrawn.toUint128();
        market[id].totalSupplyShares -= sharesWithdrawn.toUint128();

        // Check liquidity
        if (market[id].totalBorrowAssets > market[id].totalSupplyAssets) {
            revert WikshiLend__InsufficientLiquidity();
        }

        // Interactions
        IERC20(marketParams.loanToken).safeTransfer(receiver, assetsWithdrawn);

        emit Withdraw(id, msg.sender, onBehalf, receiver, assetsWithdrawn, sharesWithdrawn);
    }

    /// @inheritdoc IWikshiLend
    function supplyCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        bytes calldata data
    ) external nonReentrant whenNotPaused {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (onBehalf == address(0)) revert WikshiLend__ZeroAddress();
        if (assets == 0) revert WikshiLend__ZeroAssets();

        // Effects
        position[id][onBehalf].collateral += assets.toUint128();

        // Callback (enables flash collateral supply)
        if (data.length > 0) IWikshiSupplyCollateralCallback(msg.sender).onWikshiSupplyCollateral(assets, data);

        // Interactions — balance check prevents phantom collateral from fee-on-transfer tokens
        uint256 balBefore = IERC20(marketParams.collateralToken).balanceOf(address(this));
        IERC20(marketParams.collateralToken).safeTransferFrom(msg.sender, address(this), assets);
        if (IERC20(marketParams.collateralToken).balanceOf(address(this)) < balBefore + assets) {
            revert WikshiLend__TransferAmountMismatch();
        }

        emit SupplyCollateral(id, msg.sender, onBehalf, assets);
    }

    /// @inheritdoc IWikshiLend
    function withdrawCollateral(
        MarketParams calldata marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external nonReentrant {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (receiver == address(0)) revert WikshiLend__ZeroAddress();
        if (!_isSenderAuthorized(onBehalf)) revert WikshiLend__Unauthorized();
        if (assets == 0) revert WikshiLend__ZeroAssets();

        _accrueInterest(marketParams, id);

        // Effects
        position[id][onBehalf].collateral -= assets.toUint128();

        // Skip oracle call when borrower has no debt — fully repaid users can always
        // withdraw collateral regardless of oracle state. This prevents stale or reverting
        // oracles from locking user collateral indefinitely.
        if (position[id][onBehalf].borrowShares > 0) {
            uint256 collateralPrice = IOracle(marketParams.oracle).price();
            if (!_isHealthy(marketParams, id, onBehalf, collateralPrice)) {
                revert WikshiLend__UnhealthyPosition();
            }
        }

        // Interactions
        IERC20(marketParams.collateralToken).safeTransfer(receiver, assets);

        emit WithdrawCollateral(id, msg.sender, onBehalf, receiver, assets);
    }

    /// @inheritdoc IWikshiLend
    function borrow(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external nonReentrant whenNotPaused returns (uint256 assetsBorrowed, uint256 sharesBorrowed) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (receiver == address(0)) revert WikshiLend__ZeroAddress();
        if (!_isSenderAuthorized(onBehalf)) revert WikshiLend__Unauthorized();

        _accrueInterest(marketParams, id);

        if (assets != 0 && shares != 0) revert WikshiLend__InconsistentInput();

        if (assets > 0) {
            // shares rounded UP — borrower owes more
            sharesBorrowed = assets.toSharesUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            assetsBorrowed = assets;
        } else if (shares > 0) {
            // assets rounded DOWN — borrower receives less
            assetsBorrowed = shares.toAssetsDown(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            sharesBorrowed = shares;
        } else {
            revert WikshiLend__ZeroAssets();
        }

        // Effects
        position[id][onBehalf].borrowShares += sharesBorrowed.toUint128();
        market[id].totalBorrowAssets += assetsBorrowed.toUint128();
        market[id].totalBorrowShares += sharesBorrowed.toUint128();

        // Borrow cap enforcement
        uint256 _borrowCap = borrowCap[id];
        if (_borrowCap != 0 && market[id].totalBorrowAssets > _borrowCap) revert WikshiLend__CapExceeded();

        // Check health after borrowing — uses credit-adjusted LLTV
        uint256 collateralPrice = IOracle(marketParams.oracle).price();
        if (!_isHealthy(marketParams, id, onBehalf, collateralPrice)) {
            revert WikshiLend__UnhealthyPosition();
        }

        // Check there's enough liquidity
        if (market[id].totalBorrowAssets > market[id].totalSupplyAssets) {
            revert WikshiLend__InsufficientLiquidity();
        }

        // Interactions
        IERC20(marketParams.loanToken).safeTransfer(receiver, assetsBorrowed);

        emit Borrow(id, msg.sender, onBehalf, receiver, assetsBorrowed, sharesBorrowed);
    }

    /// @inheritdoc IWikshiLend
    function repay(
        MarketParams calldata marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes calldata data
    ) external nonReentrant returns (uint256 assetsRepaid, uint256 sharesRepaid) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        if (onBehalf == address(0)) revert WikshiLend__ZeroAddress();

        _accrueInterest(marketParams, id);

        if (assets != 0 && shares != 0) revert WikshiLend__InconsistentInput();

        if (assets > 0) {
            // shares rounded DOWN — protocol collects slightly less (conservative)
            sharesRepaid = assets.toSharesDown(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            assetsRepaid = assets;
        } else if (shares > 0) {
            // assets rounded UP — borrower pays more
            assetsRepaid = shares.toAssetsUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            sharesRepaid = shares;
        } else {
            revert WikshiLend__ZeroAssets();
        }

        // Effects
        position[id][onBehalf].borrowShares -= sharesRepaid.toUint128();
        market[id].totalBorrowAssets -= assetsRepaid.toUint128();
        market[id].totalBorrowShares -= sharesRepaid.toUint128();

        // Callback (enables flash repay)
        if (data.length > 0) IWikshiRepayCallback(msg.sender).onWikshiRepay(assetsRepaid, data);

        // Interactions — balance check prevents under-repayment from fee-on-transfer tokens
        uint256 balBefore = IERC20(marketParams.loanToken).balanceOf(address(this));
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), assetsRepaid);
        if (IERC20(marketParams.loanToken).balanceOf(address(this)) < balBefore + assetsRepaid) {
            revert WikshiLend__TransferAmountMismatch();
        }

        emit Repay(id, msg.sender, onBehalf, assetsRepaid, sharesRepaid);
    }

    /// @inheritdoc IWikshiLend
    function liquidate(
        MarketParams calldata marketParams,
        address borrower,
        uint256 seizedAssets,
        uint256 repaidShares,
        bytes calldata data
    ) external nonReentrant returns (uint256 assetsSeized, uint256 assetsRepaid) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();

        _accrueInterest(marketParams, id);

        // Oracle must be live for liquidations — no cached price fallback. Stale cached
        // prices diverge from reality and create wrongful liquidation risk. During oracle
        // outages, owner pauses inflow via pause(). Same model as Morpho Blue, Aave V3, Compound V3.
        uint256 collateralPrice = IOracle(marketParams.oracle).price();

        if (seizedAssets != 0 && repaidShares != 0) revert WikshiLend__InconsistentInput();

        // Borrower must be unhealthy (liquidatable)
        if (_isHealthy(marketParams, id, borrower, collateralPrice)) {
            revert WikshiLend__HealthyPosition();
        }

        // Calculate Liquidation Incentive Factor using credit-adjusted LLTV
        uint256 lif = _liquidationIncentiveFactor(marketParams, borrower);

        uint256 repaidSharesFinal;

        if (seizedAssets > 0) {
            // seizedAssets provided → calculate repaidAssets
            // repaidAssets = seizedAssets * price / (ORACLE_PRICE_SCALE * lif)
            // rounded UP — liquidator pays more
            assetsSeized = seizedAssets;
            assetsRepaid = seizedAssets.mulDivUp(collateralPrice, ORACLE_PRICE_SCALE.wMulDown(lif));
            // Convert repaidAssets to shares (rounded UP)
            repaidSharesFinal = assetsRepaid.toSharesUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
        } else if (repaidShares > 0) {
            // repaidShares provided → calculate seizedAssets
            repaidSharesFinal = repaidShares;
            assetsRepaid = repaidShares.toAssetsUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            // seizedAssets = repaidAssets * ORACLE_PRICE_SCALE * lif / price
            // rounded DOWN — liquidator gets less
            assetsSeized = assetsRepaid.mulDivDown(ORACLE_PRICE_SCALE.wMulDown(lif), collateralPrice);
        } else {
            revert WikshiLend__ZeroAssets();
        }

        // Cap seized assets to borrower's collateral.
        // If capped, recalculate repaid amounts to avoid overcharging the liquidator.
        uint256 borrowerCollateral = position[id][borrower].collateral;
        if (assetsSeized > borrowerCollateral) {
            assetsSeized = borrowerCollateral;
            // Recalculate how much the liquidator must repay for the actual collateral received
            assetsRepaid = assetsSeized.mulDivUp(collateralPrice, ORACLE_PRICE_SCALE.wMulDown(lif));
            repaidSharesFinal = assetsRepaid.toSharesUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
        }

        // Cap repaid shares to borrower's actual debt (prevents underflow). After capping,
        // recompute assetsSeized from the capped assetsRepaid to prevent over-seizure —
        // without this, a liquidator could seize all collateral while only repaying the
        // (smaller) actual debt amount.
        uint256 borrowerBorrowShares = position[id][borrower].borrowShares;
        if (repaidSharesFinal > borrowerBorrowShares) {
            repaidSharesFinal = borrowerBorrowShares;
            assetsRepaid = repaidSharesFinal.toAssetsUp(market[id].totalBorrowAssets, market[id].totalBorrowShares);
            // Recompute seized collateral from capped repayment (rounded DOWN — liquidator gets less)
            assetsSeized = assetsRepaid.mulDivDown(ORACLE_PRICE_SCALE.wMulDown(lif), collateralPrice);
            if (assetsSeized > borrowerCollateral) {
                assetsSeized = borrowerCollateral;
            }
        }

        // Effects: update borrower position
        position[id][borrower].borrowShares -= repaidSharesFinal.toUint128();
        position[id][borrower].collateral -= assetsSeized.toUint128();
        market[id].totalBorrowAssets -= assetsRepaid.toUint128();
        market[id].totalBorrowShares -= repaidSharesFinal.toUint128();

        // Bad debt handling: if borrower has 0 collateral but remaining borrow
        uint256 badDebtAssets;
        uint256 badDebtShares;
        if (position[id][borrower].collateral == 0 && position[id][borrower].borrowShares > 0) {
            badDebtShares = position[id][borrower].borrowShares;
            // Cap to totalBorrowAssets (Morpho Blue exact pattern) — toAssetsUp rounding
            // can exceed totalBorrowAssets by 1 wei when borrower is last/only borrower
            badDebtAssets = UtilsLib.min(
                uint256(market[id].totalBorrowAssets),
                uint256(badDebtShares).toAssetsUp(market[id].totalBorrowAssets, market[id].totalBorrowShares)
            );

            // Socialize bad debt: reduce borrow then supply (suppliers absorb loss via share price drop)
            market[id].totalBorrowAssets -= badDebtAssets.toUint128();
            market[id].totalSupplyAssets -= badDebtAssets.toUint128();
            market[id].totalBorrowShares -= badDebtShares.toUint128();
            position[id][borrower].borrowShares = 0;
        }

        // Credit consequence: slash borrower's score on liquidation (3Jane pattern)
        try creditOracle.slashScore(borrower) {} catch {}

        // Interactions: collateral OUT first (enables flash liquidation)
        IERC20(marketParams.collateralToken).safeTransfer(msg.sender, assetsSeized);

        // Callback: liquidator can sell collateral in DEX here, use proceeds to repay
        if (data.length > 0) IWikshiLiquidateCallback(msg.sender).onWikshiLiquidate(assetsRepaid, data);

        // Then pull repaid loan tokens from liquidator — balance check prevents fee-on-transfer under-collection
        uint256 balBefore = IERC20(marketParams.loanToken).balanceOf(address(this));
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), assetsRepaid);
        if (IERC20(marketParams.loanToken).balanceOf(address(this)) < balBefore + assetsRepaid) {
            revert WikshiLend__TransferAmountMismatch();
        }

        emit Liquidate(id, msg.sender, borrower, assetsRepaid, repaidSharesFinal, assetsSeized, badDebtAssets, badDebtShares);
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiLend
    function effectiveLltv(MarketParams calldata marketParams, address borrower) external view returns (uint256) {
        return _effectiveLltv(marketParams, borrower);
    }

    /// @inheritdoc IWikshiLend
    function isHealthy(MarketParams calldata marketParams, address borrower) external view returns (bool) {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();
        uint256 collateralPrice = IOracle(marketParams.oracle).price();
        return _isHealthy(marketParams, id, borrower, collateralPrice);
    }

    /// @notice Returns the stored market params for a given ID.
    function getMarketParams(Id id) external view returns (MarketParams memory) {
        return idToMarketParams[id];
    }

    /// @notice Returns a comprehensive user position snapshot for frontend integration.
    /// @dev Single-call data fetch: collateral, debt, effective LLTV, health status, credit score.
    ///      Avoids multiple RPC calls from the frontend.
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
        )
    {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();

        Position memory pos = position[id][user];
        supplyShares = pos.supplyShares;
        borrowShares = pos.borrowShares;
        collateral = pos.collateral;

        // Convert borrow shares to assets
        if (borrowShares > 0) {
            borrowAssets = uint256(borrowShares).toAssetsUp(
                market[id].totalBorrowAssets,
                market[id].totalBorrowShares
            );
        }

        effectiveLltvValue = _effectiveLltv(marketParams, user);

        if (borrowShares > 0) {
            uint256 collateralPrice = IOracle(marketParams.oracle).price();
            healthy = _isHealthy(marketParams, id, user, collateralPrice);
        } else {
            healthy = true;
        }

        creditScore = creditOracle.getCreditScore(user);
    }

    /// @notice Returns aggregate market data for frontend dashboards.
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
        )
    {
        Id id = marketParams.id();
        if (!isMarketCreated[id]) revert WikshiLend__MarketNotCreated();

        Market memory m = market[id];
        totalSupplyAssets = m.totalSupplyAssets;
        totalSupplyShares = m.totalSupplyShares;
        totalBorrowAssets = m.totalBorrowAssets;
        totalBorrowShares = m.totalBorrowShares;
        lastUpdate = m.lastUpdate;
        fee = m.fee;
        supplyCapValue = supplyCap[id];
        borrowCapValue = borrowCap[id];

        if (totalSupplyAssets > 0) {
            utilization = uint256(totalBorrowAssets).wDivDown(uint256(totalSupplyAssets));
        }
    }

    /*//////////////////////////////////////////////////////////////
                    INTERNAL STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Accrues interest for a market. Called at start of every state-changing function.
    function _accrueInterest(MarketParams calldata marketParams, Id id) internal {
        uint256 elapsed = block.timestamp - market[id].lastUpdate;
        if (elapsed == 0) return;

        uint256 borrowRate;
        if (marketParams.irm != address(0) && market[id].totalBorrowAssets > 0) {
            borrowRate = IIrm(marketParams.irm).borrowRate(marketParams, market[id]);
            uint256 interest = uint256(market[id].totalBorrowAssets).wMulDown(borrowRate.wTaylorCompounded(elapsed));

            market[id].totalBorrowAssets += interest.toUint128();
            market[id].totalSupplyAssets += interest.toUint128();

            // Fee mechanism: mint supply shares to feeRecipient
            uint256 feeAmount;
            if (market[id].fee != 0 && feeRecipient != address(0)) {
                feeAmount = interest.wMulDown(market[id].fee);
                uint256 feeShares = feeAmount.toSharesDown(
                    uint256(market[id].totalSupplyAssets) - feeAmount,
                    market[id].totalSupplyShares
                );
                position[id][feeRecipient].supplyShares += feeShares;
                market[id].totalSupplyShares += feeShares.toUint128();

                emit AccrueInterest(id, borrowRate, interest, feeShares);
            } else {
                emit AccrueInterest(id, borrowRate, interest, 0);
            }
        }

        market[id].lastUpdate = uint128(block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                      INTERNAL READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns whether msg.sender is authorized to act on behalf of `onBehalf`.
    function _isSenderAuthorized(address onBehalf) internal view returns (bool) {
        return msg.sender == onBehalf || isAuthorized[onBehalf][msg.sender];
    }

    /// @dev Returns the credit-adjusted LLTV for a borrower.
    /// @dev OUR KEY DIFFERENTIATOR — not in Morpho Blue.
    ///      Progressive trust: Unverified borrowers get NO credit advantage.
    ///      Must have at least Basic tier to unlock score-based LLTV bonus.
    ///      Score 0 → base LLTV (no bonus)
    ///      Score 1000 → base LLTV + MAX_CREDIT_LLTV_BONUS (10%)
    ///      Linear interpolation between.
    function _effectiveLltv(MarketParams calldata marketParams, address borrower) internal view returns (uint256) {
        uint256 baseLltv = marketParams.lltv;

        // Progressive trust: require Established tier (score>=400, payments>=10) for LLTV bonus.
        // Basic tier alone is insufficient — a single cheap cross-chain event should not enable
        // near-uncollateralized borrowing. Established tier ensures meaningful credit history
        // before granting leverage benefits.
        IWikshiCreditOracle.TrustTier tier = creditOracle.getTrustTier(borrower);
        if (tier == IWikshiCreditOracle.TrustTier.Unverified || tier == IWikshiCreditOracle.TrustTier.Basic) {
            return baseLltv;
        }

        // Score-based bonus (only for Established/Trusted borrowers)
        uint256 score = creditOracle.getCreditScore(borrower);
        uint256 bonus = (score * MAX_CREDIT_LLTV_BONUS) / MAX_CREDIT_SCORE;
        uint256 effective = baseLltv + bonus;

        // Cap at MAX_LLTV (98%) for safety
        return effective > MAX_LLTV ? MAX_LLTV : effective;
    }

    /// @dev Returns whether a borrower's position is healthy (within LLTV).
    function _isHealthy(
        MarketParams calldata marketParams,
        Id id,
        address borrower,
        uint256 collateralPrice
    ) internal view returns (bool) {
        uint256 borrowShares = position[id][borrower].borrowShares;
        if (borrowShares == 0) return true;

        uint256 borrowed = uint256(borrowShares).toAssetsUp(
            market[id].totalBorrowAssets,
            market[id].totalBorrowShares
        );
        uint256 maxBorrow = uint256(position[id][borrower].collateral)
            .mulDivDown(collateralPrice, ORACLE_PRICE_SCALE)
            .wMulDown(_effectiveLltv(marketParams, borrower));

        return maxBorrow >= borrowed;
    }

    /// @dev Returns the liquidation incentive factor using Morpho Blue's formula,
    ///      but using credit-adjusted LLTV.
    ///      LIF = min(MAX_LIF, 1 / (1 - CURSOR * (1 - effectiveLltv)))
    function _liquidationIncentiveFactor(
        MarketParams calldata marketParams,
        address borrower
    ) internal view returns (uint256) {
        uint256 effLltv = _effectiveLltv(marketParams, borrower);
        return UtilsLib.min(
            MAX_LIQUIDATION_INCENTIVE_FACTOR,
            WAD.wDivDown(WAD - LIQUIDATION_CURSOR.wMulDown(WAD - effLltv))
        );
    }
}
