# Libraries

Pure math and utility libraries used throughout the Wikshi protocol. All functions are `internal` and get inlined by the compiler.

| Library | Description |
|---------|-------------|
| `MathLib.sol` | WAD-scaled math (`wMulDown`, `wDivDown`, `wDivUp`, `mulDivDown`, `mulDivUp`) for fixed-point arithmetic at 1e18 precision |
| `SharesMathLib.sol` | Share-based accounting for supply/borrow positions — converts between assets and shares with configurable rounding direction. Includes `VIRTUAL_SHARES` and `VIRTUAL_ASSETS` constants for Morpho-style inflation attack protection |
| `MarketParamsLib.sol` | Market parameter hashing — computes deterministic `Id` from `(loanToken, collateralToken, oracle, irm, lltv)` tuple using `keccak256` |
| `UtilsLib.sol` | Minimal helpers — `exactlyOneZero(a, b)` for input validation, safe casting, and bounds checking |

These follow the same patterns used in Morpho Blue's library contracts, adapted for Wikshi's credit-adjusted lending model.
