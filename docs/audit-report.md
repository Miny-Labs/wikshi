# Wikshi Comprehensive Protocol Audit & Ecosystem Research

Date: 2026-03-02
Scope: Full local contract sanity/security pass + Gluwa/Creditcoin USC parity check + competitor contract/feature benchmarking.

## 1) Executive Summary

- Local build health is good: compile succeeds and tests pass (`263 passing, 0 failing`).
- Your recent high-priority fixes (V-001/V-002, V-003, V-004) are present and covered by tests.
- Two high-risk correctness issues still remain in `WikshiCreditOracle` around cross-chain event decoding (Aave/Compound topic handling and Gluwa `LoanExpired` selector mismatch risk).
- One medium design-risk remains in `WikshiVault`: `totalAssets()` reads potentially stale market totals because interest accrual is lazy in `WikshiLend`.
- USC v2 is integrated and functional in architecture, but not yet used to full potential (batch verification, robust worker pipeline, chain-aware source allowlisting model, and production-grade proof fallback/retry strategy).

## 2) What Was Verified

### Local code & tests

- `npx hardhat compile` -> success (`Nothing to compile`)
- `npx hardhat test` -> success (`263 passing`)

### Contracts reviewed

- `contracts/core/WikshiCreditOracle.sol`
- `contracts/core/WikshiLend.sol`
- `contracts/core/WikshiVault.sol`
- `contracts/core/WikshiCreditSBT.sol`
- `contracts/periphery/PaymentTracker.sol`
- `contracts/periphery/WikshiMulticall.sol`

### USC scripts reviewed

- `scripts/integration-test.js`
- `scripts/debug-usc-proof.js`

### Upstream/vendor parity checks

- `contracts/vendor/USCBase.sol`
- `contracts/vendor/EvmV1Decoder.sol`
- `contracts/vendor/VerifierInterface.sol`

Compared against upstream source (gluwa/usc-testnet-bridge-examples):

- `USCBase.sol`
- `EvmV1Decoder.sol`
- `VerifierInterface.sol`

Result:

- `diff -u` line deltas are `0` for all three files.
- SHA256 hashes are identical for all three pairs.

Conclusion: these three USC vendor contracts are exact duplicates of upstream in your workspace.

## 3) Gluwa Contract Reuse / Duplication Check

## 3.1 What is already reused directly

- USC v2 example primitives are reused directly via vendored contracts:
  - `USCBase`
  - `EvmV1Decoder`
  - `VerifierInterface`

## 3.2 What is intentionally custom (not expected to be 100% upstream match)

- `WikshiLend` is Morpho-Blue-inspired but introduces credit-adjusted LLTV and custom governance/caps/pausing patterns.
- `WikshiCreditOracle` combines:
  - off-chain operator scoring,
  - USC v2 proof validation flow,
  - cross-protocol event decoding,
  - liquidation-triggered score slashing.

These are product-specific and cannot be 1:1 replaced by Gluwa templates without losing your protocol behavior.

## 3.3 Where repeated code can be reduced

- Current vendoring is exact and valid, but maintaining local copies means manual update burden.
- You can reduce code repetition/risk drift by pinning upstream with:
  - git submodule subtree for USC contracts, or
  - npm package import if Gluwa publishes stable package artifacts for these contracts.

## 4) Creditcoin & USC Latest Docs (as of 2026-03-02)

## 4.1 USC v2 architecture highlights

- USC v2 uses native precompile verification at `0x0FD2` (Native Query Verifier).
- Chain info/attestation state precompile at `0x0FD3`.
- V2 removed v1 prover-contract + STARK/escrow workflow and simplifies to direct proof verification calls.
- DApp contract must still validate transaction success semantics (`receiptStatus`) itself.

## 4.2 Creditcoin release baseline

From Creditcoin release docs:

- Latest mainnet listed: `3.61.0-mainnet` (2026-02-03)
- Latest testnet listed: `3.61.0-testnet` (2026-01-30)

Notable recent chain-level features include:

- `signature-verifier` precompile
- `bn128` precompile
- pallet migrations and dependency updates

## 4.3 Core network references

- Mainnet chain ID: `102030`
- Testnet chain ID: `102031`
- USC testnet v2 chain ID (per USC quickstart): `102036`

## 5) Are You Using USC v2 Testnet to Full Potential?

Short answer: **not yet**. You are using USC v2 correctly, but still at an intermediate maturity level.

## 5.1 What you already use well

- `USCBase.execute(...)` flow with precompile verification.
- `PrecompileChainInfoProvider.waitUntilHeightAttested(...)` in integration script.
- `@gluwa/cc-next-query-builder` proof generation path.
- Source contract allowlist (`setApprovedSourceContract`) before USC event processing.
- Replay protection (`processedQueries`) inherited via USC base pattern.

## 5.2 Missing for “full potential”

1. No production off-chain worker service (durable queue/idempotency/retries/reorg handling).
2. No batch verification path for multi-event or high-throughput ingestion.
3. No chain-scoped source contract allowlist (current model is global by address).
4. No operational dashboard/alerting around proof failures and attestation lag.
5. No automated fallback proof retrieval strategy (txHash path + blockHeight/txIndex fallback).
6. No explicit supported-chain governance gate in oracle execution path beyond precompile validity.

## 6) Competitor Research (Contracts + Features)

## 6.1 Aave V3

Positioning:

- Pool-based, highly liquid, overcollateralized lending market.

Key protocol features:

- eMode for correlated-asset capital efficiency.
- Isolation mode, supply/borrow caps, collateral toggles.
- Mature liquidation and flash-loan primitives.

Contract architecture:

- `Pool` as core user entrypoint.
- `PoolConfigurator` + role-based ACL for listing/config changes.

Implication for Wikshi:

- Aave is the benchmark for operational robustness and risk controls in pooled lending UX.

## 6.2 Morpho Blue / Morpho Market V1

Positioning:

- Permissionless, immutable, isolated market primitive.

Key protocol features:

- Each market defined by 5 immutable params: loan token, collateral token, oracle, IRM, LLTV.
- Permissionless market creation with governance-approved LLTV/IRM sets.
- Strong emphasis on simplicity + formal methods + immutable core.

Contract architecture:

- Minimal core market primitive.
- Separate vault layers and allocator tooling for productized experiences.

Implication for Wikshi:

- Your architecture direction already aligns with Morpho-style isolated market design.
- You should adopt equivalent rigor on edge-case decoding and production controls.

## 6.3 Euler V2 (EVK)

Positioning:

- Modular credit vault stack with strong customization.

Key protocol features:

- ERC-4626-based credit vaults, EVC-mediated account model, sub-accounts.
- Hooks system for policy controls.
- Explicit upgradeability vs immutability governance matrix.

Implication for Wikshi:

- EVK is a strong model for policy extensibility (hooks) without compromising accounting core.

## 6.4 Maple (Institutional Credit)

Positioning:

- Institutional credit markets with delegated underwriting.

Key protocol features:

- ERC-4626 pool architecture with `Pool`, `PoolManager`, first-loss cover components.
- Heavy operational controls, governance, and lifecycle tooling.

Implication for Wikshi:

- Maple’s production readiness bar is operational discipline + role/process hardening, not only math correctness.

## 6.5 Goldfinch

Positioning:

- Credit protocol centered on real-world borrower pools and tranching.

Key protocol features:

- `TranchedPool` + `CreditLine` core lifecycle.
- Senior/junior capital structure and permissioned onboarding layers.

Implication for Wikshi:

- Goldfinch demonstrates how credit products require strong repayment/default lifecycle mechanics beyond core lending ops.

## 6.6 3Jane

Positioning:

- Unsecured credit-focused money market design on Ethereum.

Key protocol features:

- Credit underwriting model using onchain + offchain proofs.
- Credit-slasher/default handling and collections-auction concepts.

Implication for Wikshi:

- Your score slashing and credit-sensitive borrowing model are directionally aligned, but current oracle decoding correctness must be hardened before parity claims.

## 7) Detailed Contract Findings

Severity legend: HIGH / MEDIUM / LOW

## [HIGH] F-01: Aave/Compound borrower attribution bug in USC payment processing

Location:

- `contracts/core/WikshiCreditOracle.sol` lines ~460-465

Issue:

- `_processPaymentEvent` always extracts borrower from `log.topics[1]`.
- This is not correct for all supported signatures:
  - Aave V3 `Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)` -> borrower-like address is `user` at `topics[2]`, not `topics[1]`.
  - Compound V3 `Supply(address indexed from, address indexed dst, uint256 amount)` attribution may depend on intended model (`from` vs `dst`), but current code hardcodes `topics[1]`.

Impact:

- Credit may be assigned to wrong address, enabling score distortion and incorrect trust-tier effects.

Recommendation:

- Derive borrower topic index per signature, not a global assumption.
- Add signature-specific decoders and tests for each supported protocol event schema.

## [HIGH] F-02: Gluwa `LoanExpired` selector/event-shape mismatch risk

Locations:

- `contracts/core/WikshiCreditOracle.sol` line ~90 constant `GLUWA_EXPIRED_LOAN_SELECTOR`
- Creditcoin CC-Next `Loan.sol` line ~166 event shape (upstream reference)
- Creditcoin CC-Next `CreditScore.sol` selector constants (upstream reference)

Issue:

- Oracle currently trusts selector `LoanExpired(bytes32,uint256,uint256)` from CreditScore constants.
- Vendored `Loan.sol` emits `LoanExpired(bytes32 indexed loanHash, address indexed borrower)`.

Impact:

- Potential false negatives (no event recognized) or incorrect borrower extraction path for expired loans.

Recommendation:

- Align to emitted event ABI from source contract used in production.
- If supporting both historical variants, register both selectors and decode each explicitly.

## [MEDIUM] F-03: Vault NAV uses potentially stale market totals

Location:

- `contracts/core/WikshiVault.sol` lines ~138-149 (`totalAssets`)

Issue:

- `totalAssets()` reads `WIKSHI_LEND.market(id)` which reflects last accrued state only.
- `WikshiLend` accrues lazily on state-changing paths.

Impact:

- ERC4626 share pricing can be stale between accrual-triggering transactions.
- Can create fairness drift between different deposit/withdraw timings.

Recommendation:

- Add an explicit view-side expected-accrual computation path (Morpho-style expected balances) or enforce accrual touch before sensitive vault operations.

## [MEDIUM] F-04: Source allowlist is global address-only, not chain-scoped

Location:

- `contracts/core/WikshiCreditOracle.sol` mapping `approvedSourceContracts`

Issue:

- Allowlist is address-only and chain-agnostic.
- If the same contract address appears on multiple chains with different trust assumptions, policy granularity is limited.

Impact:

- Operational misconfiguration risk in multi-chain expansion.

Recommendation:

- Future upgrade path: chainKey + source contract allowlist (requires USC wrapper that forwards chain context into processing stage).

## [LOW] F-05: Insufficient integration tests for signature-specific decoding paths

Issue:

- Existing oracle tests focus heavily on generic payment logs and selector registration.
- Missing explicit tests for:
  - Aave V3 `Repay` topic indexing,
  - Compound V3 `Supply` attribution policy,
  - both possible Gluwa `LoanExpired` event variants.

Recommendation:

- Add dedicated test vectors for each supported event ABI and ensure borrower/amount extraction correctness.

## 8) Fix Verification of Reported High Issues

## V-001 / V-002 (USC spoofing / action manipulation / cooldown)

Status: **Implemented**

Observed in code:

- Source contract validation via `approvedSourceContracts` + `_validateSourceContract`.
- `execute(action,...)` input action ignored; action derived from event type.
- USC cooldown enforced in USC processing functions.

## V-003 (oracle allowlist in market creation)

Status: **Implemented**

Observed in code:

- `isOracleEnabled` mapping.
- `enableOracle()` owner-only.
- `createMarket()` enforces oracle allowlist.

## V-004 (vault withdrawal rounding mismatch)

Status: **Implemented**

Observed in code:

- Full withdrawals by shares (`assets=0, shares=supplyShares`).
- Partial withdrawals compute shares with up-rounding then clamp.
- Withdraw path now share-driven, removing prior asset/share mismatch class.

## 9) Launch Readiness Assessment (Creditcoin Standards)

Current posture (from this snapshot):

- Core protocol mechanics: **Strong**
- USC integration: **Intermediate**
- Cross-chain event decoding correctness: **Needs remediation before production**
- Operational maturity (worker + monitoring + incident handling): **Needs work**

Verdict:

- **Do not claim production-grade readiness yet** until F-01 and F-02 are fixed and regression-tested.

## 10) Priority Remediation Plan

1. Fix signature-specific borrower decoding (Aave/Compound) and add ABI-accurate tests.
2. Resolve Gluwa `LoanExpired` selector compatibility (one canonical variant or dual-support with strict decoder branches).
3. Add view-safe expected accrual math for vault pricing or enforce accrual-touch strategy for NAV-sensitive paths.
4. Strengthen USC worker architecture for production (durable queue, retries, idempotency, attestation lag alarms, proof fallback strategies).
5. Add chain-scoped source trust model in next oracle version.

## 11) Sources

Gluwa / Creditcoin / USC:

- https://github.com/gluwa
- https://github.com/orgs/gluwa/repositories
- https://github.com/gluwa/CCNext-smart-contracts
- https://github.com/gluwa/usc-testnet-bridge-examples
- https://github.com/gluwa/cc-next-query-builder
- https://docs.creditcoin.org/usc/overview/usc-architecture-overview
- https://docs.creditcoin.org/usc/migration-guide
- https://docs.creditcoin.org/usc/quickstart
- https://docs.creditcoin.org/usc/creditcoin-oracle-subsystems/query-proof-and-verification
- https://docs.creditcoin.org/usc/creditcoin-oracle-subsystems/attestation
- https://docs.creditcoin.org/usc/dapp-builder-infrastructure/universal-smart-contracts
- https://docs.creditcoin.org/usc/dapp-builder-infrastructure/offchain-oracle-workers
- https://creditcoin.org/blog/usc-testnet-v2/
- https://docs.creditcoin.org/releases
- https://docs.creditcoin.org/smart-contract-guides/creditcoin-endpoints
- https://docs.creditcoin.org/evm-compatibility

Competitors:

- Aave: https://aave.com/docs/aave-v3/smart-contracts/pool , https://aave.com/docs/aave-v3/smart-contracts/pool-configurator , https://aave.com/docs/developers/aave-v3/markets/advanced
- Morpho: https://docs.morpho.org/learn/concepts/market/ , https://docs.morpho.org/get-started/resources/contracts/morpho , https://docs.morpho.org/learn/resources/risks/
- Euler: https://docs.euler.finance/developers/evk/ , https://docs.euler.finance/developers/evk/hooks-custom-logic
- Maple: https://maplefinance.gitbook.io/maple/technical-resources/protocol-overview , https://github.com/maple-labs/pool-v2
- Goldfinch: https://dev.goldfinch.finance/docs/reference/how-the-protocol-works , https://dev.goldfinch.finance/docs/reference/contracts/core/TranchedPool
- 3Jane: https://docs.3jane.xyz/introduction , https://www.3jane.xyz/pdf/whitepaper.pdf

## 12) Parallel Deep Research Addendum (Run `trun_e135ad9f408846ec83d4d1876fc93360`)

This section merges additional findings from the Parallel deep research run completed on 2026-03-02.

### 12.1 Additional confirmed USC v2 operational constraints

- USC v2 documentation/examples indicate proof generation is not instant, with expected waiting windows on testnet flows (roughly 16 to 30 minutes in official example guidance).
- This confirms Wikshi should treat USC ingestion as asynchronous by default:
  - request accepted -> job queued,
  - attestation readiness polled,
  - proof generated/retried,
  - on-chain execution finalized.
- This reinforces section 5.2 and remediation item #4: production worker architecture is mandatory for reliable UX.

### 12.2 Additional ecosystem references (canonical reuse target)

- `gluwa/cc-next-query-builder` should remain the primary SDK for:
  - chain support and continuity checks,
  - proof generation API integration,
  - deterministic query composition.
- `gluwa/CCNext-smart-contracts` should be treated as canonical contract-pattern reference for USC/CCNext bridge consumers.
- `gluwa/usc-testnet-bridge-examples` should be used as E2E regression reference for bridge lifecycle behavior.

### 12.3 Competitor risk-control deltas to emulate

- Aave V3:
  - maintain explicit supply/borrow caps per asset,
  - preserve partial liquidation behavior (close factor) to avoid forced full unwinds in single liquidation calls.
- Maple:
  - keep strict role/process traceability and full admin event coverage,
  - continue standard vault/accounting discipline compatible with ERC-4626 expectations.

These points are additive to the existing competitor sections, not replacements.

### 12.4 Inference vs confirmed code facts

- Confirmed from local code review and tests:
  - Findings F-01 to F-05,
  - V-001..V-004 remediation presence,
  - compile/test status.
- Inference/prescriptive from external research:
  - exact queue design and ops topology,
  - specific risk-parameter tuning targets copied from competitor defaults.

Treat prescriptive items as design guidance; validate against Wikshi business model and Creditcoin deployment constraints before implementation.

### 12.5 Extra sources from deep research run

- https://github.com/gluwa/ccnext-testnet-bridge-examples/blob/main/hello-bridge/README.md
- https://aave.com/docs/aave-v3/overview
- https://aave.com/help/supplying/isolation-mode
- https://github.com/aave/risk-v3/blob/main/asset-risk/risk-parameters.md
- https://governance.aave.com/t/aave-v3-borrow-caps-methodology/10925
- https://maplefinance.gitbook.io/maple/technical-resources/security/security
- https://resources.cryptocompare.com/asset-management/17878/1749209866979.pdf
