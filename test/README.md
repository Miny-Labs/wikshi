# Tests

Unit test suite for all Wikshi Protocol contracts. Built with Hardhat + Chai + ethers.js v6.

## Running Tests

```bash
# Run all unit tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run a specific test file
npx hardhat test test/WikshiLend.test.js
```

## Test Files

| File | Tests | Coverage |
|------|-------|----------|
| **WikshiLend.test.js** | Core lending pool — market creation, supply, borrow, repay, liquidate, flash loans, EIP-712 auth, caps, pause |
| **WikshiCreditOracle.test.js** | Dual-source credit scoring — operator submissions, USC proofs, score decay, slashing, trust tiers, cooldowns |
| **WikshiVault.test.js** | ERC-4626 vault — deposit, withdraw, multi-market allocation, share price, inflation protection |
| **WikshiCreditSBT.test.js** | Soulbound tokens — mint, lock, credit data sync, transfer restrictions |
| **WikshiIrm.test.js** | Interest rate model — kink curve, credit discount, edge cases |
| **WikshiOracle.test.js** | Price oracle — setPrice, staleness checks, access control |
| **WikshiReceivable.test.js** | Receivable NFTs + wrapper — mint, valuation, ERC-721 to ERC-20 wrapping, cherry-pick prevention |
| **PaymentTracker.test.js** | Payment tracking — event emission, loan registry, access control |

## Patterns

- **Fixture deployment**: Each test file uses `beforeEach` with fresh contract deployments
- **ethers.js v6**: Uses `BigInt` literals (`1000n`), `ethers.parseUnits()`, `ethers.ZeroAddress`
- **Time manipulation**: `helpers.time.increase()` for testing decay and staleness
- **Snapshot/restore**: Hardhat network snapshots for test isolation
