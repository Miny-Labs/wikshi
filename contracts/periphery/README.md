# Periphery Contracts

Non-core contracts that extend protocol functionality — oracles, interest rate models, routers, and utilities.

| Contract | Lines | Description |
|----------|-------|-------------|
| **WikshiIrm.sol** | 128 | Kink-based interest rate model. ~2% base, ~4% slope1, ~75% slope2, 80% kink. Credit-aware: up to 20% rate discount for high-score borrowers. |
| **WikshiOracle.sol** | 85 | Admin-settable price oracle for testnet deployment. 24-hour staleness check. |
| **WikshiMulticall.sol** | 97 | Typed batch operations — supplyCollateral+borrow and repay+withdrawCollateral in single transactions. |
| **WikshiLiquidationRouter.sol** | 157 | Handles receivable-backed liquidations by unwrapping ERC-721 receivables during the liquidation callback. |
| **PaymentTracker.sol** | 155 | Source-chain contract that emits `PaymentMade` events for USC cross-chain verification. Includes loan registry to prevent credit farming. |
| **WikshiReceivableWrapper.sol** | 252 | Wraps ERC-721 receivable NFTs into fungible ERC-20 tokens for use as lending collateral. Cherry-pick prevention via depositor tracking. |
| **WikshiReceivableOracle.sol** | 137 | Prices receivable collateral using on-chain NAV calculation from the receivable contract's valuation. |
