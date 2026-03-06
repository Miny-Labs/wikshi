const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "tCTC");

  const TX_GAS = { gasLimit: 500000 };

  // Load existing deployment
  const deployPath = path.join(__dirname, "../deployments/creditcoin-testnet.json");
  const deployment = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // 1. Deploy new USDT test token (the old USDTCoin has no code on-chain)
  console.log("\n--- Deploying new USDT TestToken ---");
  const TestToken = await ethers.getContractFactory("TestToken");
  const usdt = await TestToken.deploy("USD Tether (Test)", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("New USDT:", usdtAddr);

  // 2. Whitelist oracle for new market (already whitelisted, but safe to call)
  const wikshiLend = await ethers.getContractAt("WikshiLend", deployment.contracts.WikshiLend);

  // 3. Create new WCTC/USDT market with the new USDT
  console.log("\n--- Creating new WCTC/USDT market ---");
  const marketParams = {
    loanToken: usdtAddr,
    collateralToken: deployment.contracts.TestTokenWCTC,
    oracle: deployment.contracts.WikshiOracle,
    irm: deployment.contracts.WikshiIrm,
    lltv: ethers.parseEther("0.8"),
  };

  const createTx = await wikshiLend.createMarket(marketParams, TX_GAS);
  await createTx.wait();
  console.log("Market created! Tx:", createTx.hash);

  // 4. Update wREC market to also use new USDT
  console.log("\n--- Deploying RWA USDT (separate token for RWA market) ---");
  // Keep RWA USDT separate — it already exists and has its own market
  // Just update the main USDT reference

  // 5. Update deployment JSON
  deployment.contracts.USDT = usdtAddr;
  // Keep old USDTCoin reference for history
  deployment.contracts.USDTCoin_OLD = deployment.contracts.USDTCoin;
  delete deployment.contracts.USDTCoin;
  deployment.marketParams = {
    loanToken: usdtAddr,
    collateralToken: deployment.contracts.TestTokenWCTC,
    oracle: deployment.contracts.WikshiOracle,
    irm: deployment.contracts.WikshiIrm,
    lltv: "0.8e18",
  };
  deployment.fixTimestamp = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
  console.log("\n--- Updated deployments/creditcoin-testnet.json ---");

  console.log("\n=== Summary ===");
  console.log("New USDT:", usdtAddr);
  console.log("WCTC/USDT market: CREATED");
  console.log("RWA market: UNCHANGED (uses", deployment.wrecMarketParams.loanToken, ")");
  console.log("\nUpdate frontend constants.ts USDT to:", usdtAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
