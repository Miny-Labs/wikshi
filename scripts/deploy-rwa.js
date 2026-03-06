const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying RWA pipeline with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "tCTC");

  // Load existing deployment
  const deploymentPath = path.join(__dirname, "../deployments/creditcoin-testnet.json");
  const existing = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { WikshiCreditOracle, WikshiLend, WikshiIrm, USDTCoin } = existing.contracts;

  console.log("\nExisting contracts:");
  console.log("  WikshiCreditOracle:", WikshiCreditOracle);
  console.log("  WikshiLend:        ", WikshiLend);
  console.log("  WikshiIrm:         ", WikshiIrm);
  console.log("  USDTCoin:          ", USDTCoin);

  const TX_GAS = { gasLimit: 500000 };
  // Creditcoin pallet-evm gas estimation can fail — use explicit gasLimit for deployments too
  const DEPLOY_GAS = { gasLimit: 5000000 };

  // 0. Deploy proper USDT TestToken (the existing USDTCoin lacks ERC20Metadata — no decimals())
  // WikshiReceivableWrapper constructor needs IERC20Metadata.decimals() on the loan token
  console.log("\n--- Deploying USDT TestToken (ERC20 with proper metadata) ---");
  const TestToken = await ethers.getContractFactory("TestToken");
  const usdt = await TestToken.deploy("USD Tether", "USDT", 6, DEPLOY_GAS);
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("USDT TestToken:", usdtAddr);

  // 1. Deploy WikshiReceivable (ERC-721 tokenized loan receivables)
  console.log("\n--- Deploying WikshiReceivable ---");
  const WikshiReceivable = await ethers.getContractFactory("WikshiReceivable");
  const receivable = await WikshiReceivable.deploy(deployer.address, WikshiCreditOracle, DEPLOY_GAS);
  await receivable.waitForDeployment();
  const receivableAddr = await receivable.getAddress();
  console.log("WikshiReceivable:", receivableAddr);

  // 2. Deploy WikshiReceivableWrapper (ERC-20 wREC fungible wrapper)
  console.log("\n--- Deploying WikshiReceivableWrapper ---");
  const WikshiReceivableWrapper = await ethers.getContractFactory("WikshiReceivableWrapper");
  const wrapper = await WikshiReceivableWrapper.deploy(receivableAddr, usdtAddr, deployer.address, DEPLOY_GAS);
  await wrapper.waitForDeployment();
  const wrapperAddr = await wrapper.getAddress();
  console.log("WikshiReceivableWrapper:", wrapperAddr);

  // 3. Deploy WikshiReceivableOracle (prices wREC collateral)
  console.log("\n--- Deploying WikshiReceivableOracle ---");
  const INITIAL_PRICE = 10n ** 36n; // 1:1 peg — 1 wREC = 1 USDT (in 1e36 scale)
  const WikshiReceivableOracle = await ethers.getContractFactory("WikshiReceivableOracle");
  const recOracle = await WikshiReceivableOracle.deploy(
    deployer.address,
    receivableAddr,
    INITIAL_PRICE,
    "wREC/USD-TCoin",
    DEPLOY_GAS
  );
  await recOracle.waitForDeployment();
  const recOracleAddr = await recOracle.getAddress();
  console.log("WikshiReceivableOracle:", recOracleAddr);

  // 4. Deploy WikshiLiquidationRouter (atomic liquidation + NFT unwrap)
  console.log("\n--- Deploying WikshiLiquidationRouter ---");
  const WikshiLiquidationRouter = await ethers.getContractFactory("WikshiLiquidationRouter");
  const liquidationRouter = await WikshiLiquidationRouter.deploy(WikshiLend, DEPLOY_GAS);
  await liquidationRouter.waitForDeployment();
  const liquidationRouterAddr = await liquidationRouter.getAddress();
  console.log("WikshiLiquidationRouter:", liquidationRouterAddr);

  // 5. Deploy PaymentTracker (source chain payment events for USC)
  console.log("\n--- Deploying PaymentTracker ---");
  const PaymentTracker = await ethers.getContractFactory("PaymentTracker");
  const paymentTracker = await PaymentTracker.deploy(usdtAddr, deployer.address, deployer.address, DEPLOY_GAS);
  await paymentTracker.waitForDeployment();
  const paymentTrackerAddr = await paymentTracker.getAddress();
  console.log("PaymentTracker:", paymentTrackerAddr);

  // --- Post-deployment wiring ---
  console.log("\n--- Post-deployment wiring ---");

  // Authorize deployer as minter + updater on WikshiReceivable
  const setMinterTx = await receivable.setAuthorizedMinter(deployer.address, true, TX_GAS);
  await setMinterTx.wait();
  console.log("Receivable: deployer authorized as minter");

  const setUpdaterTx = await receivable.setAuthorizedUpdater(deployer.address, true, TX_GAS);
  await setUpdaterTx.wait();
  console.log("Receivable: deployer authorized as updater");

  // Authorize liquidation router as unwrapper on wrapper
  const setUnwrapperTx = await wrapper.setAuthorizedUnwrapper(liquidationRouterAddr, true, TX_GAS);
  await setUnwrapperTx.wait();
  console.log("Wrapper: liquidation router authorized as unwrapper");

  // Whitelist new oracle on WikshiLend
  const wikshiLend = await ethers.getContractAt("WikshiLend", WikshiLend);
  const enableOracleTx = await wikshiLend.enableOracle(recOracleAddr, TX_GAS);
  await enableOracleTx.wait();
  console.log("WikshiLend: receivable oracle whitelisted");

  // Whitelist 70% LLTV for wREC market (more conservative for RWA collateral)
  const WREC_LLTV = ethers.parseEther("0.7");
  const enableLltvTx = await wikshiLend.enableLltv(WREC_LLTV, TX_GAS);
  await enableLltvTx.wait();
  console.log("WikshiLend: 70% LLTV whitelisted");

  // Create wREC/USDT lending market
  console.log("\n--- Creating Market: wREC / USD-TCoin ---");
  const wrecMarketParams = {
    loanToken: usdtAddr,
    collateralToken: wrapperAddr,
    oracle: recOracleAddr,
    irm: WikshiIrm,
    lltv: WREC_LLTV,
  };
  const createMarketTx = await wikshiLend.createMarket(wrecMarketParams, TX_GAS);
  await createMarketTx.wait();
  console.log("wREC/USDT market created! Tx:", createMarketTx.hash);

  // Print summary
  console.log("\n========================================");
  console.log("  RWA PIPELINE DEPLOYMENT SUMMARY");
  console.log("  Network: Creditcoin USC Testnet v2");
  console.log("  Chain ID: 102036");
  console.log("========================================");
  console.log("WikshiReceivable:       ", receivableAddr);
  console.log("WikshiReceivableWrapper:", wrapperAddr);
  console.log("WikshiReceivableOracle: ", recOracleAddr);
  console.log("WikshiLiquidationRouter:", liquidationRouterAddr);
  console.log("PaymentTracker:         ", paymentTrackerAddr);
  console.log("========================================");
  console.log("wREC Market:");
  console.log("  Loan Token:       USDT", usdtAddr);
  console.log("  Collateral Token: wREC", wrapperAddr);
  console.log("  Oracle:          ", recOracleAddr);
  console.log("  IRM:             ", WikshiIrm, "(shared)");
  console.log("  LLTV:            70% (collateral ratio: 143%)");
  console.log("========================================");
  console.log("Authorization:");
  console.log("  Receivable minter:  ", deployer.address);
  console.log("  Receivable updater: ", deployer.address);
  console.log("  Wrapper unwrapper:  ", liquidationRouterAddr);
  console.log("========================================");

  // Update deployment JSON
  existing.contracts.USDT = usdtAddr;
  existing.contracts.WikshiReceivable = receivableAddr;
  existing.contracts.WikshiReceivableWrapper = wrapperAddr;
  existing.contracts.WikshiReceivableOracle = recOracleAddr;
  existing.contracts.WikshiLiquidationRouter = liquidationRouterAddr;
  existing.contracts.PaymentTracker = paymentTrackerAddr;
  existing.wrecMarketParams = {
    loanToken: usdtAddr,
    collateralToken: wrapperAddr,
    oracle: recOracleAddr,
    irm: WikshiIrm,
    lltv: "0.7e18",
  };
  existing.rwaDeployTimestamp = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(existing, null, 2));
  console.log("\nDeployment JSON updated:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
