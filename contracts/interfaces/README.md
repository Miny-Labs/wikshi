# Interfaces

Solidity interfaces defining the public API surface for all Wikshi protocol contracts.

| Interface | For Contract | Description |
|-----------|-------------|-------------|
| `IWikshiLend.sol` | WikshiLend | Core lending operations — supply, borrow, repay, withdraw, liquidate, flash loans |
| `IWikshiCreditOracle.sol` | WikshiCreditOracle | Credit score queries, trust tier resolution, USC proof submission |
| `IWikshiReceivable.sol` | WikshiReceivable | RWA receivable lifecycle — mint, repayment tracking, default, redemption, DCF valuation |
| `IWikshiCallbacks.sol` | Multiple | Callback interfaces for flash loans (`IWikshiFlashLoanCallback`), supply (`IWikshiSupplyCallback`), supply collateral (`IWikshiSupplyCollateralCallback`), repay (`IWikshiRepayCallback`), and liquidation (`IWikshiLiquidateCallback`) |
| `IIrm.sol` | WikshiIrm | Interest rate model — `borrowRate(MarketParams, Market)` returns per-second rate |
| `IOracle.sol` | WikshiOracle | Price oracle — `price()` returns collateral/loan price scaled to 1e36 (Morpho convention) |

These interfaces are used by periphery contracts, vaults, and external integrators to interact with the protocol without depending on concrete implementations.
