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

  const USDT = deployment.contracts.USDT; // 0x2BA65253Fc2c20fdfaa1FA5EE13bDA57cfDBC30F
  const WIKSHI_LEND = deployment.contracts.WikshiLend;

  console.log("\nUsing USDT:", USDT);
  console.log("Using WikshiLend:", WIKSHI_LEND);

  // 1. Deploy new WikshiVault with correct USDT
  console.log("\n--- Deploying new WikshiVault with USDT ---");
  const WikshiVault = await ethers.getContractFactory("WikshiVault");
  const vault = await WikshiVault.deploy(
    deployer.address,
    USDT,
    "Wikshi USDT Vault",
    "wUSDT",
    WIKSHI_LEND
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("New WikshiVault:", vaultAddr);

  // 2. Set allocations to the WCTC/USDT market
  console.log("\n--- Setting vault allocations ---");
  const marketParams = {
    loanToken: USDT,
    collateralToken: deployment.contracts.TestTokenWCTC,
    oracle: deployment.contracts.WikshiOracle,
    irm: deployment.contracts.WikshiIrm,
    lltv: ethers.parseEther("0.8"),
  };

  const allocations = [
    {
      marketParams: marketParams,
      weight: ethers.parseEther("1"), // 100% to WCTC/USDT market
    },
  ];

  const setAllocTx = await vault.setAllocations(allocations, TX_GAS);
  await setAllocTx.wait();
  console.log("Allocations set! Tx:", setAllocTx.hash);

  // 3. Update deployment JSON
  deployment.contracts.WikshiVault_OLD = deployment.contracts.WikshiVault;
  deployment.contracts.WikshiVault = vaultAddr;
  deployment.vaultRedeployTimestamp = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(deployment, null, 2));
  console.log("\n--- Updated deployments/creditcoin-testnet.json ---");

  console.log("\n=== Summary ===");
  console.log("Old WikshiVault:", deployment.contracts.WikshiVault_OLD);
  console.log("New WikshiVault:", vaultAddr);
  console.log("Underlying asset: USDT", USDT);
  console.log("Allocation: 100% WCTC/USDT market");
  console.log("\n>>> Update frontend DEPLOYED_CONTRACTS.WikshiVault to:", vaultAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
