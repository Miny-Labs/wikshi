# Mocks

Test-only contracts used in the Hardhat unit test suite. Not deployed to any network.

| Contract | Purpose |
|----------|---------|
| `TestToken.sol` | Configurable ERC-20 token with public `mint()` — used to simulate loan tokens (USDT, 6 decimals) and collateral tokens (WCTC, 18 decimals) in tests |
| `TestWikshiCreditOracle.sol` | Extends `WikshiCreditOracle` to expose internal functions (`_calculateIncrement`, `_processPaymentEvent`) for direct unit testing of scoring logic |
| `MockCallback.sol` | Implements `IWikshiFlashLoanCallback` and bad-receiver variants for testing flash loan callback execution and failure paths |

These contracts are excluded from production builds and audits. See `SECURITY.md` for scope details.
