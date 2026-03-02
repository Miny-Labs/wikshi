# Security Policy

## Scope

All contracts in `contracts/core/` and `contracts/periphery/` are in scope for security reports.

**Out of scope**:
- `contracts/vendor/` — Third-party USC infrastructure contracts (maintained by Creditcoin/Gluwa)
- `contracts/mocks/` — Test-only mock contracts

## Reporting

If you discover a vulnerability, please report it responsibly:

**Email**: thatspacebiker@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Known Limitations

- **Testnet deployment**: The protocol is currently deployed on Creditcoin USC Testnet v2 only
- **Oracle**: `WikshiOracle` is an admin-settable price feed designed for testnet — production would use decentralized oracles
- **USC dependency**: Cross-chain proof verification depends on Creditcoin's USC precompile infrastructure

## Audit

An internal security audit has been completed. See [`docs/audit-report.md`](docs/audit-report.md) for findings and mitigations.

## Security Measures

- Checks-Effects-Interactions pattern enforced throughout
- `ReentrancyGuard` on all state-changing external functions
- Fee-on-transfer token defense via balance-before/after checks
- Per-chain source contract allowlisting (prevents CREATE2 address collision attacks)
- Pause mechanism protects against inflow during emergencies — outflows always work
- EIP-712 nonce-based replay protection
- Supply and borrow caps per market
