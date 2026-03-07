# Wikshi Protocol — Frontend

**Live at [wikshi.xyz](https://wikshi.xyz)**

The web application for Wikshi Protocol, the first credit-native lending protocol on Creditcoin.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Wallet**: wagmi v2 + viem (MetaMask injected connector)
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Chain**: Creditcoin USC Testnet v2 (Chain ID 102036)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## App Screens

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | Landing | Protocol overview and connect wallet |
| `/app` | Dashboard | Portfolio overview, positions, credit score |
| `/app/credit` | Credit Passport | Soulbound credit identity, score gauge, tier badge |
| `/app/lend` | Lend | Supply USDT liquidity, earn interest |
| `/app/borrow` | Borrow | Credit-adjusted borrowing with collateral comparison |
| `/app/markets` | Markets | Pool stats, utilization, rates for both markets |
| `/app/rwa` | RWA Pipeline | Mint receivable NFTs, wrap to wREC, supply as collateral |
| `/app/vault` | Vault | ERC-4626 passive lending vault |
| `/app/admin` | Admin | Oracle controls, token minting (deployer wallet only) |

## Deployed Contracts

16 contracts on Creditcoin USC Testnet v2. See the [main README](../README.md) for full contract addresses and architecture.

**Two active lending markets:**
1. **WCTC / USDT** — Standard collateral lending (80% LLTV)
2. **wREC / USDT-RWA** — RWA receivable-backed lending (70% LLTV)

## Product Tour

The app includes a built-in 11-step product tour accessible via the "Product Tour" button (bottom-left). It walks through every feature:

- **Dashboard** — Portfolio overview and protocol stats
- **Credit Identity** — Soulbound SBT, scoring mechanics, progressive tiers
- **Lending** — Liquidity provision and ERC-4626 vault
- **Borrowing** — Credit-adjusted LLTV, collateral comparison, health monitoring
- **RWA Pipeline** — Receivable tokenization, wrapping, DeFi collateral
- **Markets** — WCTC/USDT and wREC/USDT market overview
- **Architecture** — 16 deployed contracts with Blockscout links

Each step includes SVG animations and live on-chain data visualization.

## Key Configuration

- Contract addresses: `src/lib/constants.ts`
- ABIs: `src/lib/abis.ts`
- Chain config: `src/lib/wagmi.ts`
- Market utilities: `src/lib/market.ts`
