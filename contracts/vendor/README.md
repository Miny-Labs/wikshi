# Vendor Contracts

USC (Universal Settlement Chain) infrastructure contracts from Creditcoin. These are external dependencies — **do not modify**.

**Source**: [gluwa/usc-testnet-bridge-examples](https://github.com/gluwa/usc-testnet-bridge-examples)

| Contract | Lines | Description |
|----------|-------|-------------|
| **USCBase.sol** | 97 | Base contract for USC proof verification. Wraps the 0x0FD2 precompile. |
| **EvmV1Decoder.sol** | 580 | RLP decoder for EVM transactions and receipts. Used by WikshiCreditOracle to extract event logs from cross-chain proofs. |
| **ChainInfoPrecompile.sol** | 134 | Interface to precompile at `0x0FD3`. Queries chain attestation status and block heights. |
| **VerifierInterface.sol** | 39 | Interface to the USC verifier precompile at `0x0FD2`. `verify()` (view) and `verifyAndEmit()` (state-changing). |

## Precompile Addresses

| Precompile | Address | Purpose |
|------------|---------|---------|
| INativeQueryVerifier | `0x0FD2` | USC proof verification |
| ChainInfoPrecompile | `0x0FD3` | Chain attestation queries |
