# Contracts

Wikshi Protocol smart contracts — Solidity 0.8.26, optimized with viaIR (200 runs, Cancun EVM).

## Structure

```
contracts/
├── core/           # Protocol core (5 contracts, ~2,350 LoC)
├── interfaces/     # Protocol interfaces (6 files, ~515 LoC)
├── libraries/      # Math and utility libraries (4 files, ~150 LoC)
├── periphery/      # Non-core contracts (7 files, ~800 LoC)
├── vendor/         # USC precompile wrappers (4 files, ~850 LoC)
└── mocks/          # Test-only contracts (3 files, ~165 LoC)
```

## Dependency Graph

```mermaid
graph TD
    WL[WikshiLend] --> ICO[IWikshiCreditOracle]
    WL --> IOracle[IOracle]
    WL --> IIrm[IIrm]
    WL --> ML[MathLib]
    WL --> SML[SharesMathLib]
    WL --> UL[UtilsLib]
    WL --> MPL[MarketParamsLib]

    CO[WikshiCreditOracle] --> UB[USCBase]
    CO --> ED[EvmV1Decoder]
    CO --> CI[ChainInfoPrecompile]
    UB --> VI[VerifierInterface]

    WV[WikshiVault] --> WL
    WV --> SML

    SBT[WikshiCreditSBT] --> ICO

    IRM[WikshiIrm] --> IIrm
    OR[WikshiOracle] --> IOracle
    MC[WikshiMulticall] --> WL

    LR[WikshiLiquidationRouter] --> WL
    LR --> RW[WikshiReceivableWrapper]

    RW --> WR[WikshiReceivable]
    RO[WikshiReceivableOracle] --> WR
    RO --> IOracle
```

## Compilation

```bash
npx hardhat compile
```

All contracts compile with zero errors and zero warnings.
