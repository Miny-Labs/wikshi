# Scripts

Deployment and integration test scripts for Creditcoin USC Testnet v2.

## Scripts

| Script | Description |
|--------|-------------|
| **deploy.js** | Full protocol deployment — deploys all core contracts, creates WCTC/USD-TCoin market, configures oracle, IRM, and credit system |
| **deploy-rwa.js** | RWA receivables pipeline deployment — deploys WikshiReceivable, WikshiReceivableWrapper, WikshiReceivableOracle, WikshiLiquidationRouter, PaymentTracker, and creates the wREC/USDT market. Requires core protocol to be deployed first. |
| **integration-test.js** | USC cross-chain proof verification tests (33 tests) — validates proof submission, event decoding, and credit score updates via USC precompiles |
| **onchain-test.js** | Comprehensive on-chain protocol test (51 tests) — full lending lifecycle, credit scoring, vault operations, liquidations, and pause mechanism on live testnet |

## Usage

```bash
# Deploy core protocol to Creditcoin testnet
npx hardhat run scripts/deploy.js --network creditcoinTestnet

# Deploy RWA receivables pipeline (after core)
npx hardhat run scripts/deploy-rwa.js --network creditcoinTestnet

# Run on-chain integration tests
npx hardhat run scripts/onchain-test.js --network creditcoinTestnet

# Run USC cross-chain proof tests
npx hardhat run scripts/integration-test.js --network creditcoinTestnet
```

## Prerequisites

- `DEPLOYER_PRIVATE_KEY` set in `.env` with sufficient tCTC balance
- `CREDITCOIN_TESTNET_RPC` pointing to USC Testnet v2 (`https://rpc.usc-testnet2.creditcoin.network`)
- For integration tests: Sepolia source chain transactions and USC attestation completion
