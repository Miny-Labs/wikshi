# Deployments

Deployment records for the Wikshi Protocol.

## Creditcoin USC Testnet v2

**Network**: Creditcoin USC Testnet v2
**Chain ID**: `102036`
**RPC**: `https://rpc.usc-testnet2.creditcoin.network`
**Explorer**: [https://explorer.usc-testnet2.creditcoin.network](https://explorer.usc-testnet2.creditcoin.network)

### Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| WikshiLend | `0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73) |
| WikshiCreditOracle | `0x7002a4528B957Aa16F1a3187031b35DA08E81ECa` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x7002a4528B957Aa16F1a3187031b35DA08E81ECa) |
| WikshiVault | `0x84A7992798ac855185742E014E0488831FbEBce2` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x84A7992798ac855185742E014E0488831FbEBce2) |
| WikshiCreditSBT | `0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1) |
| WikshiIrm | `0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa) |
| WikshiOracle | `0xa5f8E4e9a07F3Ca8f32e16E526810C8E7FBcdff6` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0xa5f8E4e9a07F3Ca8f32e16E526810C8E7FBcdff6) |
| WikshiMulticall | `0x404a45a33E7bDf066D7DF7d8e56Ec9b0eEad5005` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x404a45a33E7bDf066D7DF7d8e56Ec9b0eEad5005) |
| EvmV1Decoder | `0xc742BCFF7CcCea0dF52369591BD8473A840866f8` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0xc742BCFF7CcCea0dF52369591BD8473A840866f8) |
| TestToken (WCTC) | `0x9A1F674108286906cDB25CfbF7Bd538131492435` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0x9A1F674108286906cDB25CfbF7Bd538131492435) |
| USD-TCoin | `0xa1Cc4d7aa040eA903fd00c13E7b43f8e26cbB7F8` | [View](https://explorer.usc-testnet2.creditcoin.network/address/0xa1Cc4d7aa040eA903fd00c13E7b43f8e26cbB7F8) |

### Market: WCTC / USD-TCoin

| Parameter | Value |
|-----------|-------|
| Base LLTV | 80% (125% collateral ratio) |
| Max Credit LLTV | 90% (111% collateral ratio) |
| IRM | ~2% base, ~4% slope1, ~75% slope2, 80% kink |
| Protocol Fee | 5% |

See `creditcoin-testnet.json` for the full deployment record.
