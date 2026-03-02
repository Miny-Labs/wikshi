# Core Contracts

The protocol core — these contracts handle lending, credit scoring, vaults, receivables, and soulbound identity.

| Contract | Lines | Description |
|----------|-------|-------------|
| **WikshiLend.sol** | 900 | Singleton lending pool — market creation, supply, borrow, repay, liquidate. Credit-adjusted LLTV via `_effectiveLltv()`. EIP-712 signature authorization. Supply/borrow caps. Pause mechanism. |
| **WikshiCreditOracle.sol** | 652 | Dual-source credit oracle. Source A: off-chain operator (Credal). Source B: USC-verified cross-chain payments. Score decay (VIEW-only), credit slashing on liquidation, progressive trust tiers. |
| **WikshiVault.sol** | 315 | ERC-4626 passive lending vault. 6-decimal share offset for inflation attack protection. Multi-market allocation via weighted strategies. |
| **WikshiReceivable.sol** | 299 | RWA receivable NFTs. Tokenized invoices with DCF-style valuation incorporating credit multiplier and time discount. |
| **WikshiCreditSBT.sol** | 184 | ERC-5192 soulbound credit identity token. Caches credit data from the oracle for composable cross-protocol queries on Creditcoin. |
