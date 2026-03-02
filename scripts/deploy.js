const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "tCTC");

  // 1. Deploy EvmV1Decoder library
  console.log("\n--- Deploying EvmV1Decoder library ---");
  const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
  const evmDecoder = await EvmV1Decoder.deploy();
  await evmDecoder.waitForDeployment();
  const evmDecoderAddr = await evmDecoder.getAddress();
  console.log("EvmV1Decoder:", evmDecoderAddr);

  // 2. Deploy WikshiCreditOracle (linked with EvmV1Decoder)
  console.log("\n--- Deploying WikshiCreditOracle ---");
  const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
    libraries: { EvmV1Decoder: evmDecoderAddr },
  });
  const creditOracle = await WikshiCreditOracle.deploy(deployer.address, deployer.address);
  await creditOracle.waitForDeployment();
  const creditOracleAddr = await creditOracle.getAddress();
  console.log("WikshiCreditOracle:", creditOracleAddr);

  // 3. Deploy WikshiLend (singleton lending core)
  console.log("\n--- Deploying WikshiLend ---");
  const WikshiLend = await ethers.getContractFactory("WikshiLend");
  const wikshiLend = await WikshiLend.deploy(deployer.address, creditOracleAddr);
  await wikshiLend.waitForDeployment();
  const wikshiLendAddr = await wikshiLend.getAddress();
  console.log("WikshiLend:", wikshiLendAddr);

  // 4. Deploy WikshiIrm (kink-based interest rate model)
  // ~2% APR base, ~4% slope1, ~75% slope2, 80% kink
  console.log("\n--- Deploying WikshiIrm ---");
  const BASE_RATE = 634195839n;
  const SLOPE_1 = 1268391679n;
  const SLOPE_2 = 23782344234n;
  const OPTIMAL_UTILIZATION = ethers.parseEther("0.8");
  const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
  const irm = await WikshiIrm.deploy(BASE_RATE, SLOPE_1, SLOPE_2, OPTIMAL_UTILIZATION);
  await irm.waitForDeployment();
  const irmAddr = await irm.getAddress();
  console.log("WikshiIrm:", irmAddr);

  // 5. Deploy TestToken for collateral (WCTC — wrapped CTC for testing)
  console.log("\n--- Deploying TestToken (WCTC collateral) ---");
  const TestToken = await ethers.getContractFactory("TestToken");
  const wctc = await TestToken.deploy("Wrapped CTC", "WCTC", 18);
  await wctc.waitForDeployment();
  const wctcAddr = await wctc.getAddress();
  console.log("TestToken (WCTC):", wctcAddr);

  // 6. Deploy WikshiOracle (CTC/USDT price oracle)
  // Use real testnet price approximation: 1 CTC ≈ $0.16
  // price = 0.16 * 10^(36 + 6 - 18) = 0.16e24 = 1.6e23
  console.log("\n--- Deploying WikshiOracle ---");
  const CTC_PRICE = 16n * 10n ** 22n; // $0.16 per CTC
  const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
  const priceOracle = await WikshiOracle.deploy(deployer.address, CTC_PRICE, "WCTC/USD-TCoin");
  await priceOracle.waitForDeployment();
  const priceOracleAddr = await priceOracle.getAddress();
  console.log("WikshiOracle:", priceOracleAddr);

  // 7. Deploy WikshiVault
  // Use real USD-TCoin as the underlying asset
  const USD_TCOIN = "0xa1Cc4d7aa040eA903fd00c13E7b43f8e26cbB7F8";
  console.log("\n--- Deploying WikshiVault ---");
  const WikshiVault = await ethers.getContractFactory("WikshiVault");
  const vault = await WikshiVault.deploy(deployer.address, USD_TCOIN, "Wikshi USD-TCoin Vault", "wUSDT", wikshiLendAddr);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("WikshiVault:", vaultAddr);

  // 8. Whitelist IRM + LLTV, then create market
  console.log("\n--- Whitelisting IRM + LLTV ---");
  // Creditcoin pallet-evm requires explicit gasLimit for function calls (not deployments)
  const TX_GAS = { gasLimit: 500000 };

  const enableIrmTx = await wikshiLend.enableIrm(irmAddr, TX_GAS);
  await enableIrmTx.wait();
  console.log("IRM whitelisted:", irmAddr);
  const enableLltvTx = await wikshiLend.enableLltv(ethers.parseEther("0.8"), TX_GAS);
  await enableLltvTx.wait();
  console.log("LLTV whitelisted: 80%");
  const enableOracleTx = await wikshiLend.enableOracle(priceOracleAddr, TX_GAS);
  await enableOracleTx.wait();
  console.log("Oracle whitelisted:", priceOracleAddr);

  console.log("\n--- Creating Market: WCTC / USD-TCoin ---");
  const marketParams = {
    loanToken: USD_TCOIN,
    collateralToken: wctcAddr,
    oracle: priceOracleAddr,
    irm: irmAddr,
    lltv: ethers.parseEther("0.8"), // 80% base LLTV
  };
  const createTx = await wikshiLend.createMarket(marketParams, TX_GAS);
  await createTx.wait();
  console.log("Market created! Tx:", createTx.hash);

  // Enable WikshiLend as authorized credit slasher (liquidation → score penalty)
  console.log("\n--- Enabling credit slasher ---");
  const setSlasherTx = await creditOracle.setAuthorizedSlasher(wikshiLendAddr, true, TX_GAS);
  await setSlasherTx.wait();
  console.log("WikshiLend authorized as credit slasher");

  // 9. Deploy WikshiCreditSBT (soulbound credit identity token)
  console.log("\n--- Deploying WikshiCreditSBT ---");
  const WikshiCreditSBT = await ethers.getContractFactory("WikshiCreditSBT");
  const creditSBT = await WikshiCreditSBT.deploy(deployer.address, creditOracleAddr);
  await creditSBT.waitForDeployment();
  const creditSBTAddr = await creditSBT.getAddress();
  console.log("WikshiCreditSBT:", creditSBTAddr);

  // 10. Deploy WikshiMulticall (batch operations)
  console.log("\n--- Deploying WikshiMulticall ---");
  const WikshiMulticall = await ethers.getContractFactory("WikshiMulticall");
  const multicall = await WikshiMulticall.deploy(wikshiLendAddr);
  await multicall.waitForDeployment();
  const multicallAddr = await multicall.getAddress();
  console.log("WikshiMulticall:", multicallAddr);

  // Set fee recipient and 5% protocol fee
  console.log("\n--- Setting protocol fee (5%) ---");
  try {
    const setRecipientTx = await wikshiLend.setFeeRecipient(deployer.address, { gasLimit: 500000 });
    await setRecipientTx.wait();
    console.log("Fee recipient set:", deployer.address);

    const setFeeTx = await wikshiLend.setFee(marketParams, ethers.parseEther("0.05"), { gasLimit: 500000 });
    await setFeeTx.wait();
    console.log("Fee set to 5%");
  } catch (e) {
    console.log("Warning: Fee setup failed (non-critical):", e.message?.slice(0, 100));
    console.log("Fee can be set later via setFee() and setFeeRecipient()");
  }

  // Print summary
  console.log("\n========================================");
  console.log("  WIKSHI DEPLOYMENT SUMMARY");
  console.log("  Network: Creditcoin USC Testnet v2");
  console.log("  Chain ID: 102036");
  console.log("========================================");
  console.log("EvmV1Decoder:        ", evmDecoderAddr);
  console.log("WikshiCreditOracle:  ", creditOracleAddr);
  console.log("WikshiLend:          ", wikshiLendAddr);
  console.log("WikshiIrm:           ", irmAddr);
  console.log("WikshiOracle:        ", priceOracleAddr);
  console.log("WikshiVault:         ", vaultAddr);
  console.log("WikshiCreditSBT:     ", creditSBTAddr);
  console.log("WikshiMulticall:     ", multicallAddr);
  console.log("TestToken (WCTC):    ", wctcAddr);
  console.log("USD-TCoin (existing):", USD_TCOIN);
  console.log("========================================");
  console.log("Market: WCTC / USD-TCoin");
  console.log("  Base LLTV: 80% (collateral ratio: 125%)");
  console.log("  Max Credit LLTV: 90% (collateral ratio: 111%)");
  console.log("  IRM: ~2% base, ~4% slope1, ~75% slope2, 80% kink");
  console.log("  Credit Rate Discount: up to 20% off pool rate (score 1000)");
  console.log("  Protocol Fee: 5%");
  console.log("========================================");
  console.log("Credit System:");
  console.log("  Score Range: 0-1000 (initial: 300)");
  console.log("  LLTV Bonus: up to +10% (score 1000, requires tier >= Established)");
  console.log("  Slasher: WikshiLend (liquidation → -100 score)");
  console.log("  Decay: 1 pt/day after 30-day grace period");
  console.log("  Trust Tiers: Unverified → Basic → Established → Trusted");
  console.log("  SBT: Soulbound credit identity (ERC-5192)");
  console.log("========================================");
  console.log("Credit Event Sources:");
  console.log("  USC Cross-Chain: PaymentMade, Gluwa Loan.sol events");
  console.log("  Creditcoin Native: LoanFundInitiated, LoanRepaid, LoanLateRepayment, LoanExpired");
  console.log("  Off-Chain: Credal operator (pluggable scoring model)");
  console.log("========================================");
  console.log("Infrastructure:");
  console.log("  Pause: Owner can pause inflows (withdraw/repay/liquidate always work)");
  console.log("  Caps: Supply + borrow caps per market");
  console.log("  EIP-712: setAuthorizationWithSig (gasless ops, bundler-compatible)");
  console.log("  Multicall: Batch operations (supplyCollateral+borrow in 1 tx)");
  console.log("  Vault: ERC-4626 passive lending vault");
  console.log("========================================");

  // Save deployment addresses to file
  const fs = require("fs");
  const deployment = {
    network: "creditcoin-usc-testnet-v2",
    chainId: 102036,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      EvmV1Decoder: evmDecoderAddr,
      WikshiCreditOracle: creditOracleAddr,
      WikshiLend: wikshiLendAddr,
      WikshiIrm: irmAddr,
      WikshiOracle: priceOracleAddr,
      WikshiVault: vaultAddr,
      WikshiCreditSBT: creditSBTAddr,
      WikshiMulticall: multicallAddr,
      TestTokenWCTC: wctcAddr,
      USDTCoin: USD_TCOIN,
    },
    marketParams: {
      loanToken: USD_TCOIN,
      collateralToken: wctcAddr,
      oracle: priceOracleAddr,
      irm: irmAddr,
      lltv: "0.8e18",
    },
  };
  fs.writeFileSync("deployment.json", JSON.stringify(deployment, null, 2));
  console.log("\nDeployment saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
