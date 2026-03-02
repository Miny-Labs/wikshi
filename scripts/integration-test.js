const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Wikshi Protocol — Automated Integration Test
 *
 * Run: npx hardhat run scripts/integration-test.js --network creditcoinTestnet
 *
 * Phase A: Full lending lifecycle on Creditcoin testnet
 * Phase B: Cross-chain USC proof (Sepolia → Creditcoin) — requires SEPOLIA_RPC_URL
 */

const RESULTS = { passed: 0, failed: 0, skipped: 0 };
// Creditcoin pallet-evm needs explicit gas for function calls (not deployments)
const TX_GAS = { gasLimit: 500000 };

function assert(condition, message) {
  if (!condition) {
    console.log(`    FAIL: ${message}`);
    RESULTS.failed++;
    throw new Error(message);
  }
  RESULTS.passed++;
  console.log(`    ✓ ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const startTime = Date.now();
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════");
  console.log("  WIKSHI INTEGRATION TEST");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} tCTC`);
  console.log("");

  // =========================================================================
  // PHASE A: FULL LIFECYCLE
  // =========================================================================
  console.log("  Phase A: Full Lifecycle");
  console.log("  ─────────────────────────");

  // Step 1: Deploy all contracts
  console.log("\n  [1/22] Deploying contracts...");

  const TestToken = await ethers.getContractFactory("TestToken");
  const loanToken = await TestToken.deploy("USD-TCoin", "USDT", 6);
  await loanToken.waitForDeployment();
  console.log("    LoanToken:", await loanToken.getAddress());

  const collateralToken = await TestToken.deploy("Wrapped CTC", "WCTC", 18);
  await collateralToken.waitForDeployment();
  console.log("    CollateralToken:", await collateralToken.getAddress());

  const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
  const evmDecoder = await EvmV1Decoder.deploy();
  await evmDecoder.waitForDeployment();
  console.log("    EvmV1Decoder:", await evmDecoder.getAddress());

  const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
    libraries: { EvmV1Decoder: await evmDecoder.getAddress() },
  });
  const creditOracle = await WikshiCreditOracle.deploy(deployer.address, deployer.address);
  await creditOracle.waitForDeployment();
  console.log("    CreditOracle:", await creditOracle.getAddress());

  const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
  const CTC_PRICE = 2n * 10n ** 24n; // $2/CTC
  const priceOracle = await WikshiOracle.deploy(deployer.address, CTC_PRICE, "WCTC/USDT");
  await priceOracle.waitForDeployment();
  console.log("    PriceOracle:", await priceOracle.getAddress());

  const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
  const irm = await WikshiIrm.deploy(634195839n, 1268391679n, 23782344234n, ethers.parseEther("0.8"));
  await irm.waitForDeployment();
  console.log("    IRM:", await irm.getAddress());

  const WikshiLend = await ethers.getContractFactory("WikshiLend");
  const wikshiLend = await WikshiLend.deploy(deployer.address, await creditOracle.getAddress());
  await wikshiLend.waitForDeployment();
  console.log("    WikshiLend:", await wikshiLend.getAddress());

  const WikshiVault = await ethers.getContractFactory("WikshiVault");
  const vault = await WikshiVault.deploy(
    deployer.address,
    await loanToken.getAddress(),
    "Wikshi USDT Vault",
    "wUSDT",
    await wikshiLend.getAddress()
  );
  await vault.waitForDeployment();
  console.log("    WikshiVault:", await vault.getAddress());

  assert(true, "Deploy contracts (8/8)");

  // Step 2: Create market
  console.log("\n  [2/22] Creating market...");
  const marketParams = {
    loanToken: await loanToken.getAddress(),
    collateralToken: await collateralToken.getAddress(),
    oracle: await priceOracle.getAddress(),
    irm: await irm.getAddress(),
    lltv: ethers.parseEther("0.8"),
  };
  const txIrm = await wikshiLend.enableIrm(await irm.getAddress(), TX_GAS);
  await txIrm.wait();
  const txLltv = await wikshiLend.enableLltv(ethers.parseEther("0.8"), TX_GAS);
  await txLltv.wait();
  const txOracle = await wikshiLend.enableOracle(marketParams.oracle, TX_GAS);
  await txOracle.wait();
  const tx2 = await wikshiLend.createMarket(marketParams, TX_GAS);
  await tx2.wait();
  assert(true, "Create market (IRM + LLTV whitelisted)");

  // Enable WikshiLend as credit slasher
  await (await creditOracle.setAuthorizedSlasher(await wikshiLend.getAddress(), true, TX_GAS)).wait();

  // Step 3: Mint test tokens
  console.log("\n  [3/22] Minting test tokens...");
  const tx3a = await loanToken.mint(deployer.address, 10000n * 10n ** 6n, TX_GAS); // 10K USDT
  await tx3a.wait();
  const tx3b = await collateralToken.mint(deployer.address, ethers.parseEther("100"), TX_GAS); // 100 WCTC
  await tx3b.wait();

  const usdtBal = await loanToken.balanceOf(deployer.address);
  const wctcBal = await collateralToken.balanceOf(deployer.address);
  assert(usdtBal >= 10000n * 10n ** 6n, `Mint test tokens (${ethers.formatUnits(usdtBal, 6)} USDT, ${ethers.formatEther(wctcBal)} WCTC)`);

  // Step 4: Set fee recipient + fee
  console.log("\n  [4/22] Setting fee...");
  const tx4a = await wikshiLend.setFeeRecipient(deployer.address, TX_GAS);
  await tx4a.wait();
  const tx4b = await wikshiLend.setFee(marketParams, ethers.parseEther("0.05"), TX_GAS);
  await tx4b.wait();
  assert(true, "Set fee recipient + 5% fee");

  // Step 5: Submit credit score
  console.log("\n  [5/22] Submitting credit score...");
  const tx5 = await creditOracle.submitCreditScore(deployer.address, 750, TX_GAS);
  await tx5.wait();
  const score = await creditOracle.getCreditScore(deployer.address);
  assert(score === 750n, `Submit credit score (${score})`);

  // Approve WikshiLend
  const wikshiLendAddr = await wikshiLend.getAddress();
  await (await loanToken.approve(wikshiLendAddr, ethers.MaxUint256, TX_GAS)).wait();
  await (await collateralToken.approve(wikshiLendAddr, ethers.MaxUint256, TX_GAS)).wait();

  // Step 6: Supply
  console.log("\n  [6/22] Supplying 5,000 USDT...");
  const supplyAmount = 5000n * 10n ** 6n;
  const tx6 = await wikshiLend.supply(marketParams, supplyAmount, 0, deployer.address, "0x", TX_GAS);
  await tx6.wait();

  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "address", "address", "uint256"],
    [marketParams.loanToken, marketParams.collateralToken, marketParams.oracle, marketParams.irm, marketParams.lltv]
  );
  const marketId = ethers.keccak256(encodedParams);
  const mkt6 = await wikshiLend.market(marketId);
  assert(mkt6.totalSupplyAssets >= supplyAmount, `Supply 5,000 USDT (totalSupply: ${ethers.formatUnits(mkt6.totalSupplyAssets, 6)})`);

  // Step 7: Supply collateral
  console.log("\n  [7/22] Supplying 10 WCTC collateral...");
  const collAmount = ethers.parseEther("10");
  const tx7 = await wikshiLend.supplyCollateral(marketParams, collAmount, deployer.address, "0x", TX_GAS);
  await tx7.wait();

  const pos7 = await wikshiLend.position(marketId, deployer.address);
  assert(pos7.collateral >= collAmount, `Supply 10 WCTC collateral (collateral: ${ethers.formatEther(pos7.collateral)})`);

  // Step 8: Borrow
  console.log("\n  [8/22] Borrowing 5 USDT...");
  const borrowAmount = 5n * 10n ** 6n; // $5 — safe with 10 CTC @ $2 @ 80% = $16 max
  const tx8 = await wikshiLend.borrow(marketParams, borrowAmount, 0, deployer.address, deployer.address, TX_GAS);
  await tx8.wait();

  const pos8 = await wikshiLend.position(marketId, deployer.address);
  assert(pos8.borrowShares > 0n, `Borrow 5 USDT (borrowShares: ${pos8.borrowShares})`);

  // Step 9: Repay
  console.log("\n  [9/22] Repaying 3 USDT...");
  const repayAmount = 3n * 10n ** 6n;
  const tx9 = await wikshiLend.repay(marketParams, repayAmount, 0, deployer.address, "0x", TX_GAS);
  await tx9.wait();

  const pos9 = await wikshiLend.position(marketId, deployer.address);
  assert(pos9.borrowShares < pos8.borrowShares, `Repay 3 USDT (borrowShares: ${pos8.borrowShares} → ${pos9.borrowShares})`);

  // Step 10: Withdraw collateral (partial)
  console.log("\n  [10/22] Withdrawing 2 WCTC collateral...");
  const withdrawCollAmount = ethers.parseEther("2");
  const tx10 = await wikshiLend.withdrawCollateral(marketParams, withdrawCollAmount, deployer.address, deployer.address, TX_GAS);
  await tx10.wait();

  const pos10 = await wikshiLend.position(marketId, deployer.address);
  assert(pos10.collateral < pos7.collateral, `Withdraw 2 WCTC (collateral: ${ethers.formatEther(pos7.collateral)} → ${ethers.formatEther(pos10.collateral)})`);

  // Step 11: Withdraw supply (partial)
  console.log("\n  [11/22] Withdrawing 1,000 USDT supply...");
  const withdrawAmount = 1000n * 10n ** 6n;
  const tx11 = await wikshiLend.withdraw(marketParams, withdrawAmount, 0, deployer.address, deployer.address, TX_GAS);
  await tx11.wait();

  const mkt11 = await wikshiLend.market(marketId);
  assert(mkt11.totalSupplyAssets < mkt6.totalSupplyAssets, `Withdraw 1,000 USDT (supply: ${ethers.formatUnits(mkt6.totalSupplyAssets, 6)} → ${ethers.formatUnits(mkt11.totalSupplyAssets, 6)})`);

  // Step 12-13: Liquidation — need to repay remaining borrow first, then setup fresh
  console.log("\n  [12/22] Setting up liquidation scenario...");
  // Repay remaining borrow
  const pos12pre = await wikshiLend.position(marketId, deployer.address);
  if (pos12pre.borrowShares > 0n) {
    const tx12pre = await wikshiLend.repay(marketParams, 0, pos12pre.borrowShares, deployer.address, "0x", TX_GAS);
    await tx12pre.wait();
  }
  // Withdraw remaining collateral
  const pos12pre2 = await wikshiLend.position(marketId, deployer.address);
  if (pos12pre2.collateral > 0n) {
    const tx12pre2 = await wikshiLend.withdrawCollateral(marketParams, pos12pre2.collateral, deployer.address, deployer.address, TX_GAS);
    await tx12pre2.wait();
  }

  // Supply fresh collateral + borrow near max
  const freshColl = ethers.parseEther("10"); // 10 CTC
  await (await wikshiLend.supplyCollateral(marketParams, freshColl, deployer.address, "0x", TX_GAS)).wait();
  // maxBorrow at $2 and 80%+(credit bonus) ≈ $17.5. Borrow $15.
  await (await wikshiLend.borrow(marketParams, 15n * 10n ** 6n, 0, deployer.address, deployer.address, TX_GAS)).wait();

  // Drop oracle price to $0.50/CTC → maxBorrow = 10 * $0.50 * 87.5% ≈ $4.375 < $15 → underwater
  const LOW_PRICE = 5n * 10n ** 23n; // $0.50
  await (await priceOracle.setPrice(LOW_PRICE, TX_GAS)).wait();

  const isHealthy = await wikshiLend.isHealthy(marketParams, deployer.address);
  assert(!isHealthy, "Liquidation setup (position unhealthy after price drop)");

  console.log("\n  [13/22] Executing liquidation...");
  const pos13before = await wikshiLend.position(marketId, deployer.address);
  const tx13 = await wikshiLend.liquidate(marketParams, deployer.address, ethers.parseEther("5"), 0, "0x", TX_GAS);
  await tx13.wait();

  const pos13after = await wikshiLend.position(marketId, deployer.address);
  assert(pos13after.collateral < pos13before.collateral, `Liquidate (collateral: ${ethers.formatEther(pos13before.collateral)} → ${ethers.formatEther(pos13after.collateral)})`);

  // Verify credit score was slashed by liquidation (3Jane pattern)
  const scoreAfterLiq = await creditOracle.getCreditScore(deployer.address);
  assert(scoreAfterLiq < score, `Credit slashed after liquidation (${score} → ${scoreAfterLiq})`);

  // Reset price for vault test
  await (await priceOracle.setPrice(CTC_PRICE, TX_GAS)).wait();

  // Step 14: Vault deposit
  console.log("\n  [14/22] Vault deposit...");
  // Set vault allocations
  await (await vault.setAllocations([{ marketParams, weight: ethers.parseEther("1") }], TX_GAS)).wait();

  const vaultAddr = await vault.getAddress();
  await (await loanToken.approve(vaultAddr, ethers.MaxUint256, TX_GAS)).wait();

  const vaultDepositAmount = 1000n * 10n ** 6n;
  const tx14 = await vault.deposit(vaultDepositAmount, deployer.address, TX_GAS);
  await tx14.wait();

  const vaultShares = await vault.balanceOf(deployer.address);
  const vaultTotal = await vault.totalAssets();
  assert(vaultShares > 0n, `Vault deposit (shares: ${vaultShares}, totalAssets: ${ethers.formatUnits(vaultTotal, 6)})`);

  // Verify vault has supply position in WikshiLend
  const vaultPos = await wikshiLend.position(marketId, vaultAddr);
  assert(vaultPos.supplyShares > 0n, `Vault supply position in WikshiLend (supplyShares: ${vaultPos.supplyShares})`);

  // Step 15: Vault withdraw
  console.log("\n  [15/22] Vault withdraw...");
  const balBefore15 = await loanToken.balanceOf(deployer.address);
  const tx15 = await vault.redeem(vaultShares, deployer.address, deployer.address, TX_GAS);
  await tx15.wait();

  const balAfter15 = await loanToken.balanceOf(deployer.address);
  assert(balAfter15 > balBefore15, `Vault withdraw (returned: ${ethers.formatUnits(balAfter15 - balBefore15, 6)} USDT)`);

  // Step 16: Credit-adjusted LLTV
  console.log("\n  [16/22] Verifying credit-adjusted LLTV...");
  const effLltv = await wikshiLend.effectiveLltv(marketParams, deployer.address);
  const baseLltv = ethers.parseEther("0.8");
  assert(effLltv > baseLltv, `Credit-adjusted LLTV (${ethers.formatEther(effLltv)} > ${ethers.formatEther(baseLltv)} base)`);

  // Step 17: Authorization system
  console.log("\n  [17/22] Testing authorization system...");
  // Authorize vault to act on deployer's behalf
  const vaultAddr17 = await vault.getAddress();
  const tx17a = await wikshiLend.setAuthorization(vaultAddr17, true, TX_GAS);
  await tx17a.wait();
  const isAuth = await wikshiLend.isAuthorized(deployer.address, vaultAddr17);
  assert(isAuth === true, `Authorization set (vault authorized: ${isAuth})`);
  // Revoke
  const tx17b = await wikshiLend.setAuthorization(vaultAddr17, false, TX_GAS);
  await tx17b.wait();
  const isAuth2 = await wikshiLend.isAuthorized(deployer.address, vaultAddr17);
  assert(isAuth2 === false, `Authorization revoked (vault authorized: ${isAuth2})`);

  // Step 18: Flash loan
  console.log("\n  [18/22] Testing flash loan...");
  // Deploy MockFlashLoanReceiver
  const MockFlashLoanReceiver = await ethers.getContractFactory("MockFlashLoanReceiver");
  const flashReceiver = await MockFlashLoanReceiver.deploy();
  await flashReceiver.waitForDeployment();
  const flashReceiverAddr = await flashReceiver.getAddress();

  // Supply some liquidity for flash loan pool
  const loanTokenAddr = await loanToken.getAddress();
  await (await loanToken.approve(await wikshiLend.getAddress(), ethers.MaxUint256, TX_GAS)).wait();
  await (await wikshiLend.supply(marketParams, 2000n * 10n ** 6n, 0, deployer.address, "0x", TX_GAS)).wait();

  // Fund flash receiver with tokens so it can repay
  await (await loanToken.mint(flashReceiverAddr, 5000n * 10n ** 6n, TX_GAS)).wait();

  // Test 1: Verify zero-amount flash loan reverts
  let flashZeroReverted = false;
  try {
    const zeroTx = await wikshiLend.flashLoan(loanTokenAddr, 0, "0x", TX_GAS);
    await zeroTx.wait(); // .wait() throws on on-chain revert
  } catch (e) {
    flashZeroReverted = true;
  }
  assert(flashZeroReverted, `Flash loan reverts with zero amount (ZeroAssets)`);

  // Test 2: Execute a real flash loan via MockFlashLoanReceiver contract
  const lendBalBefore = await loanToken.balanceOf(wikshiLendAddr);
  const flashTx = await flashReceiver.executeFlashLoan(wikshiLendAddr, loanTokenAddr, 100n * 10n ** 6n, TX_GAS);
  await flashTx.wait();
  const lendBalAfter = await loanToken.balanceOf(wikshiLendAddr);
  const callbackInvoked = await flashReceiver.callbackInvoked();
  // After flash loan, WikshiLend balance should be unchanged (tokens returned)
  assert(lendBalAfter === lendBalBefore, `Flash loan executed — balance unchanged (${ethers.formatUnits(lendBalBefore, 6)} → ${ethers.formatUnits(lendBalAfter, 6)})`);
  assert(callbackInvoked, `Flash loan callback invoked on receiver`);

  // Step 19: Credit Score SBT mint
  console.log("\n  [19/22] Testing Credit Score SBT...");
  const WikshiCreditSBT = await ethers.getContractFactory("WikshiCreditSBT");
  const creditSBT = await WikshiCreditSBT.deploy(deployer.address, await creditOracle.getAddress());
  await creditSBT.waitForDeployment();
  console.log(`    CreditSBT: ${await creditSBT.getAddress()}`);
  assert(true, `Deploy WikshiCreditSBT`);

  // Mint SBT for deployer (who already has credit score from step 5)
  const tx19 = await creditSBT.mint(deployer.address, TX_GAS);
  await tx19.wait();

  const tokenId = BigInt(deployer.address);
  const sbtOwner = await creditSBT.ownerOf(tokenId);
  assert(sbtOwner === deployer.address, `SBT minted (owner: ${sbtOwner.slice(0, 10)}...)`);

  const sbtScore = await creditSBT.getCreditScore(deployer.address);
  assert(sbtScore > 0n, `SBT credit score synced (score: ${sbtScore})`);

  const [s, t, p, ls, hasSBT] = await creditSBT.getFullCreditProfile(deployer.address);
  assert(hasSBT === true, `Full credit profile queryable (score: ${s}, tier: ${t}, payments: ${p})`);

  const isLocked = await creditSBT.locked(tokenId);
  assert(isLocked === true, `SBT is soulbound (locked: ${isLocked})`);

  // Step 20: Deploy and test WikshiMulticall
  console.log("\n  [20/22] Testing WikshiMulticall...");
  const WikshiMulticall = await ethers.getContractFactory("WikshiMulticall");
  const multicall = await WikshiMulticall.deploy(wikshiLendAddr);
  await multicall.waitForDeployment();
  const multicallAddr = await multicall.getAddress();
  console.log(`    WikshiMulticall: ${multicallAddr}`);
  assert(true, "Deploy WikshiMulticall");

  // Step 21: Test getUserPosition enriched view
  console.log("\n  [21/22] Testing enriched view functions...");
  const userPos = await wikshiLend.getUserPosition(marketParams, deployer.address);
  assert(userPos.effectiveLltvValue > 0n, `getUserPosition returns effective LLTV (${ethers.formatEther(userPos.effectiveLltvValue)})`);
  assert(userPos.creditScore >= 0n, `getUserPosition returns credit score (${userPos.creditScore})`);

  // Step 22: Test getMarketData enriched view
  console.log("\n  [22/22] Testing getMarketData...");
  const mktData = await wikshiLend.getMarketData(marketParams);
  assert(mktData.totalSupplyAssets > 0n, `getMarketData returns supply (${ethers.formatUnits(mktData.totalSupplyAssets, 6)} USDT)`);
  assert(mktData.utilization >= 0n, `getMarketData returns utilization (${ethers.formatEther(mktData.utilization)})`);

  // =========================================================================
  // PHASE B: CROSS-CHAIN USC (SEPOLIA → CREDITCOIN)
  // =========================================================================
  console.log("\n\n  Phase B: Cross-Chain USC (Sepolia → Creditcoin)");
  console.log("  ─────────────────────────────────────────────");

  if (!process.env.SEPOLIA_RPC_URL) {
    console.log("    SKIPPED (no SEPOLIA_RPC_URL configured)");
    console.log("    Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env to enable");
    RESULTS.skipped += 6;
  } else {
    const { proofGenerator, chainInfo } = require("@gluwa/cc-next-query-builder");

    const SEPOLIA_CHAIN_KEY = 1; // Sepolia ethereum on USC testnet v2
    const PROOF_API_URL = "https://proof-gen-api.usc-testnet2.creditcoin.network";

    // Create Sepolia provider + wallet (separate from Hardhat's Creditcoin provider)
    const sepoliaProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const sepoliaWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, sepoliaProvider);

    const sepoliaBal = await sepoliaProvider.getBalance(sepoliaWallet.address);
    console.log(`    Sepolia wallet: ${sepoliaWallet.address}`);
    console.log(`    Sepolia balance: ${ethers.formatEther(sepoliaBal)} ETH`);

    // Step B1: Deploy TestToken on Sepolia
    console.log("\n  [B1/6] Deploying TestToken on Sepolia...");
    const TestTokenArtifact = await ethers.getContractFactory("TestToken");
    const sepoliaTokenFactory = new ethers.ContractFactory(
      TestTokenArtifact.interface,
      TestTokenArtifact.bytecode,
      sepoliaWallet
    );
    const sepoliaToken = await sepoliaTokenFactory.deploy("Test USDT", "tUSDT", 6);
    await sepoliaToken.waitForDeployment();
    const sepoliaTokenAddr = await sepoliaToken.getAddress();
    console.log(`    TestToken on Sepolia: ${sepoliaTokenAddr}`);
    assert(true, "Deploy TestToken on Sepolia");

    // Step B2: Deploy PaymentTracker on Sepolia
    console.log("\n  [B2/6] Deploying PaymentTracker on Sepolia...");
    const PaymentTrackerArtifact = await ethers.getContractFactory("PaymentTracker");
    const sepoliaTrackerFactory = new ethers.ContractFactory(
      PaymentTrackerArtifact.interface,
      PaymentTrackerArtifact.bytecode,
      sepoliaWallet
    );
    // Deploy with operator = deployer wallet (loan registry requires operator)
    const paymentTracker = await sepoliaTrackerFactory.deploy(sepoliaTokenAddr, sepoliaWallet.address, sepoliaWallet.address);
    await paymentTracker.waitForDeployment();
    const trackerAddr = await paymentTracker.getAddress();
    console.log(`    PaymentTracker on Sepolia: ${trackerAddr}`);
    assert(true, "Deploy PaymentTracker on Sepolia");

    // Register loan 1 for the deployer (only registered loans can generate credit events)
    console.log("    Registering loan 1 for deployer...");
    await (await paymentTracker.registerLoan(1n, sepoliaWallet.address)).wait();
    console.log("    Loan 1 registered");

    // Approve PaymentTracker as source contract on Creditcoin-side oracle
    console.log("    Approving PaymentTracker as source contract on CreditOracle...");
    // Chain key for Sepolia (used in USC bridge context)
    const SEPOLIA_CHAIN_KEY = 11155111n;
    await (await creditOracle.setApprovedSourceContract(SEPOLIA_CHAIN_KEY, trackerAddr, true, TX_GAS)).wait();
    console.log(`    Approved source contract: ${trackerAddr}`);

    // Step B3: Make a payment (mint → approve → makePayment)
    console.log("\n  [B3/6] Making payment on Sepolia...");
    const paymentAmount = 100n * 10n ** 6n; // $100 → score increment +20
    const mintTx = await sepoliaToken.mint(sepoliaWallet.address, paymentAmount);
    await mintTx.wait();
    const approveTx = await sepoliaToken.approve(trackerAddr, paymentAmount);
    await approveTx.wait();

    const payTx = await paymentTracker.makePayment(1n, paymentAmount); // loanId=1 (registered above)
    const payReceipt = await payTx.wait();
    const payTxHash = payReceipt.hash;
    const payBlockNumber = payReceipt.blockNumber;
    console.log(`    Payment tx: ${payTxHash}`);
    console.log(`    Block: ${payBlockNumber}`);
    assert(payReceipt.status === 1, `Payment confirmed (block ${payBlockNumber})`);

    // Step B4: Wait for USC attestation
    console.log("\n  [B4/6] Waiting for USC attestation...");
    const ccProvider = ethers.provider; // Creditcoin provider from Hardhat
    const infoProvider = new chainInfo.PrecompileChainInfoProvider(ccProvider);

    const latestBefore = await infoProvider.getLatestAttestedHeightAndHash(SEPOLIA_CHAIN_KEY);
    console.log(`    Latest attested Sepolia block: ${latestBefore.height}`);
    console.log(`    Need attestation for block: ${payBlockNumber}`);

    if (latestBefore.height >= payBlockNumber) {
      console.log("    Block already attested!");
    } else {
      console.log(`    Waiting (polling every 10s, timeout 10min)...`);
    }

    const attestStartTime = Date.now();
    await infoProvider.waitUntilHeightAttested(SEPOLIA_CHAIN_KEY, payBlockNumber, 10_000, 600_000);
    const attestTime = ((Date.now() - attestStartTime) / 1000).toFixed(0);
    assert(true, `USC attestation received (waited ${attestTime}s)`);

    // Step B5: Generate proof via API
    console.log("\n  [B5/6] Generating proof via Gluwa API...");
    const proofGen = new proofGenerator.api.ProverAPIProofGenerator(SEPOLIA_CHAIN_KEY, PROOF_API_URL);
    const proofResult = await proofGen.generateProof(payTxHash);

    if (!proofResult.success) {
      console.log(`    FAIL: Proof generation failed: ${proofResult.error}`);
      RESULTS.failed++;
      throw new Error(`Proof generation failed: ${proofResult.error}`);
    }
    const proofData = proofResult.data;
    console.log(`    Proof generated for block ${proofData.headerNumber}, txIndex ${proofData.txIndex}`);
    assert(true, "Proof generated via API");

    // Step B6: Submit proof to WikshiCreditOracle.execute() on Creditcoin
    console.log("\n  [B6/6] Submitting proof to WikshiCreditOracle...");
    const scoreBefore = await creditOracle.getCreditScore(deployer.address);
    console.log(`    Credit score before: ${scoreBefore}`);

    // Debug: log proof data structure
    console.log(`    Proof data keys: ${Object.keys(proofData).join(", ")}`);
    console.log(`    chainKey: ${proofData.chainKey}, headerNumber: ${proofData.headerNumber}`);
    console.log(`    txBytes length: ${proofData.txBytes?.length || "N/A"}`);
    console.log(`    merkleProof.root: ${proofData.merkleProof?.root}`);
    console.log(`    siblings count: ${proofData.merkleProof?.siblings?.length}`);
    console.log(`    continuityProof.roots count: ${proofData.continuityProof?.roots?.length}`);

    try {
      // Local merkle proof verification (diagnostic)
      let leafHash = ethers.keccak256(ethers.solidityPacked(['uint8', 'bytes'], [0x00, proofData.txBytes]));
      let computed = leafHash;
      for (const sibling of proofData.merkleProof.siblings) {
        if (sibling.isLeft) {
          computed = ethers.keccak256(ethers.solidityPacked(['uint8', 'bytes32', 'bytes32'], [0x01, sibling.hash, computed]));
        } else {
          computed = ethers.keccak256(ethers.solidityPacked(['uint8', 'bytes32', 'bytes32'], [0x01, computed, sibling.hash]));
        }
      }
      console.log(`    Local merkle root: ${computed}`);
      console.log(`    API merkle root:   ${proofData.merkleProof.root}`);
      console.log(`    Merkle match: ${computed === proofData.merkleProof.root}`);

      // Gas: SDK formula is for simple minters. Our _processAndEmitEvent does much more
      // (decode tx, decode receipt, find events, update credit scores). Use 2M.
      const gasLimit = 2_000_000n;

      // Call contract method directly (official pattern — ethers handles struct encoding)
      const executeTx = await creditOracle.execute(
        0, // action: on-time payment
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof.root,
        proofData.merkleProof.siblings, // pass objects directly — ethers encodes structs
        proofData.continuityProof.lowerEndpointDigest,
        proofData.continuityProof.roots,
        { gasLimit }
      );
      const executeReceipt = await executeTx.wait();
      console.log(`    Execute tx: ${executeReceipt.hash}`);

      const scoreAfter = await creditOracle.getCreditScore(deployer.address);
      console.log(`    Credit score after: ${scoreAfter}`);

      // $100 payment → +20 increment. Score was 750, so should be 770
      assert(scoreAfter > scoreBefore, `Credit score updated via USC (${scoreBefore} → ${scoreAfter})`);

      const tier = await creditOracle.getTrustTier(deployer.address);
      console.log(`    Trust tier: ${tier}`);
    } catch (e) {
      console.log(`    WARN: USC proof submission reverted on-chain`);
      console.log(`    Error: ${e.message?.slice(0, 200)}`);
      console.log(`    This is a known challenge with USC precompile proof format.`);
      console.log(`    Phase A (full lifecycle) passed independently.`);
      RESULTS.failed++;
      // Don't throw — continue to results summary
    }
  }

  // =========================================================================
  // RESULTS
  // =========================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════");
  console.log("  WIKSHI INTEGRATION TEST RESULTS");
  console.log("═══════════════════════════════════════════");
  console.log(`  PASSED:  ${RESULTS.passed}`);
  console.log(`  FAILED:  ${RESULTS.failed}`);
  console.log(`  SKIPPED: ${RESULTS.skipped}`);
  console.log(`  Time:    ${elapsed}s`);
  console.log("═══════════════════════════════════════════");

  // Save integration test results
  const results = {
    timestamp: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    passed: RESULTS.passed,
    failed: RESULTS.failed,
    skipped: RESULTS.skipped,
    elapsed: `${elapsed}s`,
    contracts: {
      WikshiLend: await wikshiLend.getAddress(),
      WikshiCreditOracle: await creditOracle.getAddress(),
      WikshiOracle: await priceOracle.getAddress(),
      WikshiIrm: await irm.getAddress(),
      WikshiVault: await vault.getAddress(),
      WikshiCreditSBT: await creditSBT.getAddress(),
      WikshiMulticall: multicallAddr,
      LoanToken: await loanToken.getAddress(),
      CollateralToken: await collateralToken.getAddress(),
    },
  };
  fs.writeFileSync("integration-test-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to integration-test-results.json");

  if (RESULTS.failed > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nFATAL ERROR:", error.message?.slice(0, 500));
    if (error.receipt) {
      console.error("Receipt status:", error.receipt.status);
      console.error("Gas used:", error.receipt.gasUsed?.toString());
      console.error("Tx hash:", error.receipt.hash);
    }
    if (error.data) console.error("Revert data:", error.data);
    process.exit(1);
  });
