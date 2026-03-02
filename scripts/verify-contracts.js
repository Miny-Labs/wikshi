const hre = require("hardhat");

const DEPLOYER = "0x761Ef96c559932Ba9443A25CA59a4F33Dd6Fb27c";

const contracts = [
  {
    name: "EvmV1Decoder",
    address: "0xc742BCFF7CcCea0dF52369591BD8473A840866f8",
    args: [],
  },
  {
    name: "WikshiCreditOracle",
    address: "0x7002a4528B957Aa16F1a3187031b35DA08E81ECa",
    args: [DEPLOYER, DEPLOYER],
    libraries: {
      EvmV1Decoder: "0xc742BCFF7CcCea0dF52369591BD8473A840866f8",
    },
  },
  {
    name: "WikshiLend",
    address: "0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73",
    args: [DEPLOYER, "0x7002a4528B957Aa16F1a3187031b35DA08E81ECa"],
  },
  {
    name: "WikshiIrm",
    address: "0xAbC2933B07C94bd4e3BB265B70Cea4f62B408fCa",
    args: [
      "634195839",               // BASE_RATE
      "1268391679",              // SLOPE_1
      "23782344234",             // SLOPE_2
      "800000000000000000",      // OPTIMAL_UTILIZATION (0.8e18)
    ],
  },
  {
    name: "WikshiOracle",
    address: "0xa5f8E4e9a07F3Ca8f32e16E526810C8E7FBcdff6",
    args: [
      DEPLOYER,
      "160000000000000000000000", // 16n * 10n**22n = 1.6e23
      "WCTC/USD-TCoin",
    ],
  },
  {
    name: "WikshiVault",
    address: "0x84A7992798ac855185742E014E0488831FbEBce2",
    args: [
      DEPLOYER,
      "0xa1Cc4d7aa040eA903fd00c13E7b43f8e26cbB7F8", // USD-TCoin
      "Wikshi USD-TCoin Vault",
      "wUSDT",
      "0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73", // WikshiLend
    ],
  },
  {
    name: "WikshiCreditSBT",
    address: "0x5d232BE0b2c4E8fc120C2D545F7b7bDdfF577aB1",
    args: [DEPLOYER, "0x7002a4528B957Aa16F1a3187031b35DA08E81ECa"],
  },
  {
    name: "WikshiMulticall",
    address: "0x404a45a33E7bDf066D7DF7d8e56Ec9b0eEad5005",
    args: ["0x186b3Fc15a3404e043D0eb8ecfe0773b82018a73"],
  },
  {
    name: "TestToken (WCTC)",
    address: "0x9A1F674108286906cDB25CfbF7Bd538131492435",
    contract: "contracts/mocks/TestToken.sol:TestToken",
    args: ["Wrapped CTC", "WCTC", 18],
  },
];

async function main() {
  console.log("=== Wikshi Contract Verification ===\n");

  let passed = 0;
  let failed = 0;

  for (const c of contracts) {
    console.log(`Verifying ${c.name} at ${c.address}...`);
    try {
      const verifyArgs = {
        address: c.address,
        constructorArguments: c.args,
      };
      if (c.libraries) verifyArgs.libraries = c.libraries;
      if (c.contract) verifyArgs.contract = c.contract;

      await hre.run("verify:verify", verifyArgs);
      console.log(`  OK: ${c.name} verified\n`);
      passed++;
    } catch (e) {
      if (e.message?.includes("Already Verified") || e.message?.includes("already verified")) {
        console.log(`  SKIP: ${c.name} already verified\n`);
        passed++;
      } else {
        console.log(`  FAIL: ${c.name} — ${e.message?.slice(0, 200)}\n`);
        failed++;
      }
    }
  }

  console.log("====================================");
  console.log(`Results: ${passed} verified, ${failed} failed (of ${contracts.length} total)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
