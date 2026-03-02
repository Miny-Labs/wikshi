// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {MarketParams, Id, IWikshiLend} from "contracts/interfaces/IWikshiLend.sol";
import {MarketParamsLib} from "contracts/libraries/MarketParamsLib.sol";

/// @title WikshiVault
/// @notice ERC-4626 vault that deposits into WikshiLend markets on behalf of passive lenders.
/// @dev Depositors receive vault shares representing their claim on supplied assets + accrued interest.
///      The vault owner configures which WikshiLend markets to allocate to and with what weights.
///      Deposits are deployed to WikshiLend supply positions. Withdrawals pull from markets as needed.
///      Uses a decimals offset of 6 to create virtual shares, preventing share price
///      inflation attacks via direct token donations.
/// @custom:security-contact security@wikshi.xyz
contract WikshiVault is ERC4626, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MarketParamsLib for MarketParams;

    /*//////////////////////////////////////////////////////////////
                              TYPES
    //////////////////////////////////////////////////////////////*/

    struct MarketAllocation {
        MarketParams marketParams;
        uint256 weight; // WAD-scaled (e.g., 0.5e18 = 50% allocation)
    }

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The WikshiLend singleton contract.
    IWikshiLend public immutable WIKSHI_LEND;

    /// @notice Current market allocations.
    MarketAllocation[] public allocations;

    /// @notice Total weight of all allocations (must sum to WAD = 1e18).
    uint256 public totalWeight;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event AllocationUpdated(uint256 numMarkets, uint256 totalWeight);
    event Reallocated(uint256 totalAssets);

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiVault__ZeroAddress();
    error WikshiVault__InvalidWeights();
    error WikshiVault__NoAllocations();
    error WikshiVault__MarketNotCreated();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param initialOwner The initial owner.
    /// @param asset_ The underlying asset (loan token, e.g., USD-TCoin).
    /// @param name_ Vault share token name.
    /// @param symbol_ Vault share token symbol.
    /// @param wikshiLend_ The WikshiLend singleton contract.
    constructor(
        address initialOwner,
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        IWikshiLend wikshiLend_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(initialOwner) {
        if (address(wikshiLend_) == address(0)) revert WikshiVault__ZeroAddress();
        WIKSHI_LEND = wikshiLend_;
    }

    /*//////////////////////////////////////////////////////////////
                    ERC-4626 INFLATION PROTECTION
    //////////////////////////////////////////////////////////////*/

    /// @dev Returns a decimals offset of 6, which creates 1e6 virtual shares in OZ's ERC4626
    ///      share conversion math. This makes inflation attacks economically infeasible:
    ///      an attacker would need to donate ~1e6x more tokens than the victim deposits
    ///      to steal a meaningful fraction via share price manipulation.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /*//////////////////////////////////////////////////////////////
              INTEREST ACCRUAL BEFORE SHARE MATH
    //////////////////////////////////////////////////////////////*/

    /// @dev Accrues interest in all allocated WikshiLend markets so that totalAssets()
    ///      reflects current (not stale) values before ERC4626 share math runs.
    ///      Without this, an attacker can deposit when totalAssets() is stale (understated),
    ///      receive inflated shares, then withdraw after interest accrues to steal yield.
    function _accrueAllMarkets() internal {
        for (uint256 i; i < allocations.length; ++i) {
            Id id = allocations[i].marketParams.id();
            (uint256 supplyShares,,) = WIKSHI_LEND.position(id, address(this));
            if (supplyShares > 0) {
                WIKSHI_LEND.accrueInterest(allocations[i].marketParams);
            }
        }
    }

    /// @inheritdoc ERC4626
    /// @dev Accrues market interest before share calculation to ensure accurate pricing.
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        _accrueAllMarkets();
        return super.deposit(assets, receiver);
    }

    /// @inheritdoc ERC4626
    /// @dev Accrues market interest before share calculation to ensure accurate pricing.
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        _accrueAllMarkets();
        return super.mint(shares, receiver);
    }

    /// @inheritdoc ERC4626
    /// @dev Accrues market interest before share calculation to ensure accurate pricing.
    function withdraw(uint256 assets, address receiver, address owner_) public override returns (uint256) {
        _accrueAllMarkets();
        return super.withdraw(assets, receiver, owner_);
    }

    /// @inheritdoc ERC4626
    /// @dev Accrues market interest before share calculation to ensure accurate pricing.
    function redeem(uint256 shares, address receiver, address owner_) public override returns (uint256) {
        _accrueAllMarkets();
        return super.redeem(shares, receiver, owner_);
    }

    /*//////////////////////////////////////////////////////////////
                    USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Sets the market allocation weights.
    /// @param newAllocations Array of market params + weights.
    function setAllocations(MarketAllocation[] calldata newAllocations) external onlyOwner {
        if (newAllocations.length == 0) revert WikshiVault__NoAllocations();

        // Clear existing allocations
        delete allocations;
        uint256 weightSum;

        for (uint256 i; i < newAllocations.length; ++i) {
            if (newAllocations[i].weight == 0) revert WikshiVault__InvalidWeights();
            Id id = newAllocations[i].marketParams.id();
            if (!WIKSHI_LEND.isMarketCreated(id)) revert WikshiVault__MarketNotCreated();
            allocations.push(newAllocations[i]);
            weightSum += newAllocations[i].weight;
        }

        if (weightSum == 0) revert WikshiVault__InvalidWeights();
        totalWeight = weightSum;

        emit AllocationUpdated(newAllocations.length, weightSum);
    }

    /// @notice Rebalances vault assets across allocated markets.
    /// @dev Withdraws from all markets, then re-supplies according to current weights.
    function reallocate() external nonReentrant onlyOwner {
        _withdrawAllFromMarkets();
        _deployToMarkets();
        emit Reallocated(totalAssets());
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the total assets managed by this vault.
    /// @dev Sums the vault's idle balance + all assets supplied to WikshiLend markets.
    function totalAssets() public view override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));

        for (uint256 i; i < allocations.length; ++i) {
            Id id = allocations[i].marketParams.id();
            (uint256 supplyShares,,) = WIKSHI_LEND.position(id, address(this));
            if (supplyShares > 0) {
                (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = WIKSHI_LEND.market(id);
                // Convert shares to assets: shares * (totalAssets + 1) / (totalShares + VIRTUAL_SHARES)
                total += (supplyShares * (uint256(totalSupplyAssets) + 1)) / (uint256(totalSupplyShares) + 1e6);
            }
        }

        return total;
    }

    /// @notice Returns the number of market allocations.
    function allocationCount() external view returns (uint256) {
        return allocations.length;
    }

    /*//////////////////////////////////////////////////////////////
                      INTERNAL STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Override to deploy deposited assets to WikshiLend markets.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override nonReentrant {
        super._deposit(caller, receiver, assets, shares);
        _deployToMarkets();
    }

    /// @dev Override to pull assets from WikshiLend markets if idle balance insufficient.
    function _withdraw(
        address caller,
        address receiver,
        address owner_,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < assets) {
            _withdrawFromMarkets(assets - idle);
        }
        super._withdraw(caller, receiver, owner_, assets, shares);
    }

    /// @dev Deploys idle balance to WikshiLend markets proportionally by weight.
    function _deployToMarkets() internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle == 0 || allocations.length == 0 || totalWeight == 0) return;

        IERC20(asset()).forceApprove(address(WIKSHI_LEND), idle);

        uint256 deployed;
        for (uint256 i; i < allocations.length; ++i) {
            uint256 amount;
            if (i == allocations.length - 1) {
                // Last allocation gets remainder (avoids rounding dust)
                amount = idle - deployed;
            } else {
                amount = (idle * allocations[i].weight) / totalWeight;
            }

            if (amount > 0) {
                WIKSHI_LEND.supply(allocations[i].marketParams, amount, 0, address(this), "");
                deployed += amount;
            }
        }
    }

    /// @dev Withdraws assets from WikshiLend markets until `needed` amount is met.
    ///      Uses share-based withdrawals to avoid rounding traps.
    ///      When withdrawing by assets, WikshiLend rounds shares UP which can exceed
    ///      the vault's supplyShares. Withdrawing by shares avoids this mismatch.
    function _withdrawFromMarkets(uint256 needed) internal {
        uint256 withdrawn;

        for (uint256 i; i < allocations.length && withdrawn < needed; ++i) {
            Id id = allocations[i].marketParams.id();
            (uint256 supplyShares,,) = WIKSHI_LEND.position(id, address(this));
            if (supplyShares == 0) continue;

            // Calculate how much this position is worth (rounding down is fine for estimation)
            (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = WIKSHI_LEND.market(id);
            uint256 positionValue = (supplyShares * (uint256(totalSupplyAssets) + 1)) / (uint256(totalSupplyShares) + 1e6);

            uint256 remaining = needed - withdrawn;

            uint256 sharesToWithdraw;
            if (positionValue <= remaining) {
                // Withdraw entire position by shares — avoids rounding trap entirely
                sharesToWithdraw = supplyShares;
            } else {
                // Partial withdrawal: compute shares needed for `remaining` assets.
                // Round UP to ensure we get at least `remaining` assets out.
                sharesToWithdraw = (remaining * (uint256(totalSupplyShares) + 1e6) + uint256(totalSupplyAssets)) / (uint256(totalSupplyAssets) + 1);
                // Clamp to available shares
                if (sharesToWithdraw > supplyShares) sharesToWithdraw = supplyShares;
            }

            if (sharesToWithdraw > 0) {
                // Withdraw by shares (assets=0, shares=sharesToWithdraw) — no rounding mismatch
                (uint256 assetsWithdrawn,) = WIKSHI_LEND.withdraw(
                    allocations[i].marketParams,
                    0,
                    sharesToWithdraw,
                    address(this),
                    address(this)
                );
                withdrawn += assetsWithdrawn;
            }
        }
    }

    /// @dev Withdraws all assets from all WikshiLend markets.
    function _withdrawAllFromMarkets() internal {
        for (uint256 i; i < allocations.length; ++i) {
            Id id = allocations[i].marketParams.id();
            (uint256 supplyShares,,) = WIKSHI_LEND.position(id, address(this));
            if (supplyShares == 0) continue;

            // Withdraw by shares to get everything (avoids rounding issues)
            WIKSHI_LEND.withdraw(
                allocations[i].marketParams,
                0,
                supplyShares,
                address(this),
                address(this)
            );
        }
    }
}
