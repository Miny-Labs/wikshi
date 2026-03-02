const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WikshiVault", function () {
  const WAD = ethers.parseEther("1");
  const CTC_PRICE_2USD = 2n * 10n ** 24n;

  const BASE_RATE = 634195839n;
  const SLOPE_1 = 1268391679n;
  const SLOPE_2 = 23782344234n;
  const OPTIMAL_UTILIZATION = ethers.parseEther("0.8");

  let vault, wikshiLend, creditOracle, priceOracle, irm, loanToken, collateralToken;
  let owner, depositor, depositor2, borrower, operator;
  let marketParams;

  beforeEach(async function () {
    [owner, depositor, depositor2, borrower, operator] = await ethers.getSigners();

    // Deploy tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    loanToken = await TestToken.deploy("USD-TCoin", "USDT", 6);
    collateralToken = await TestToken.deploy("Wrapped CTC", "WCTC", 18);
    await loanToken.waitForDeployment();
    await collateralToken.waitForDeployment();

    // Deploy EvmV1Decoder + CreditOracle
    const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
    const evmDecoder = await EvmV1Decoder.deploy();
    await evmDecoder.waitForDeployment();

    const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
      libraries: { EvmV1Decoder: await evmDecoder.getAddress() },
    });
    creditOracle = await WikshiCreditOracle.deploy(owner.address, operator.address);
    await creditOracle.waitForDeployment();

    // Deploy PriceOracle
    const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
    priceOracle = await WikshiOracle.deploy(owner.address, CTC_PRICE_2USD, "WCTC/USDT");
    await priceOracle.waitForDeployment();

    // Deploy IRM
    const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
    irm = await WikshiIrm.deploy(BASE_RATE, SLOPE_1, SLOPE_2, OPTIMAL_UTILIZATION);
    await irm.waitForDeployment();

    // Deploy WikshiLend
    const WikshiLend = await ethers.getContractFactory("WikshiLend");
    wikshiLend = await WikshiLend.deploy(owner.address, await creditOracle.getAddress());
    await wikshiLend.waitForDeployment();

    // Build market params
    marketParams = {
      loanToken: await loanToken.getAddress(),
      collateralToken: await collateralToken.getAddress(),
      oracle: await priceOracle.getAddress(),
      irm: await irm.getAddress(),
      lltv: ethers.parseEther("0.8"),
    };

    // Whitelist IRM, LLTV, and oracle, then create market
    await wikshiLend.enableIrm(await irm.getAddress());
    await wikshiLend.enableLltv(ethers.parseEther("0.8"));
    await wikshiLend.enableOracle(await priceOracle.getAddress());
    await wikshiLend.createMarket(marketParams);

    // Deploy Vault
    const WikshiVault = await ethers.getContractFactory("WikshiVault");
    vault = await WikshiVault.deploy(
      owner.address,
      await loanToken.getAddress(),
      "Wikshi USDT Vault",
      "wUSDT",
      await wikshiLend.getAddress()
    );
    await vault.waitForDeployment();

    // Set allocations
    const allocations = [
      { marketParams, weight: ethers.parseEther("1") },
    ];
    await vault.connect(owner).setAllocations(allocations);

    // Mint tokens
    await loanToken.mint(depositor.address, 1000000n * 10n ** 6n);
    await loanToken.mint(depositor2.address, 1000000n * 10n ** 6n);
    await loanToken.mint(borrower.address, 500000n * 10n ** 6n);
    await collateralToken.mint(borrower.address, ethers.parseEther("10000"));

    // Approve vault for depositors
    const vaultAddr = await vault.getAddress();
    await loanToken.connect(depositor).approve(vaultAddr, ethers.MaxUint256);
    await loanToken.connect(depositor2).approve(vaultAddr, ethers.MaxUint256);

    // Approve WikshiLend for borrower
    const wikshiLendAddr = await wikshiLend.getAddress();
    await loanToken.connect(borrower).approve(wikshiLendAddr, ethers.MaxUint256);
    await collateralToken.connect(borrower).approve(wikshiLendAddr, ethers.MaxUint256);
  });

  describe("Constructor", function () {
    it("should set asset, name, symbol, WIKSHI_LEND", async function () {
      expect(await vault.asset()).to.equal(await loanToken.getAddress());
      expect(await vault.name()).to.equal("Wikshi USDT Vault");
      expect(await vault.symbol()).to.equal("wUSDT");
      expect(await vault.WIKSHI_LEND()).to.equal(await wikshiLend.getAddress());
    });

    it("should revert with zero wikshiLend address", async function () {
      const WikshiVault = await ethers.getContractFactory("WikshiVault");
      await expect(
        WikshiVault.deploy(
          owner.address,
          await loanToken.getAddress(),
          "Wikshi USDT Vault",
          "wUSDT",
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(WikshiVault, "WikshiVault__ZeroAddress");
    });
  });

  describe("Deposit deploys to WikshiLend", function () {
    it("should deploy deposited assets to WikshiLend market", async function () {
      const depositAmount = 10000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      // Vault shares minted
      expect(await vault.balanceOf(depositor.address)).to.be.gt(0);

      // Check WikshiLend position — vault should have supply shares
      const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "address", "address", "uint256"],
        [marketParams.loanToken, marketParams.collateralToken, marketParams.oracle, marketParams.irm, marketParams.lltv]
      );
      const marketId = ethers.keccak256(encodedParams);

      const pos = await wikshiLend.position(marketId, await vault.getAddress());
      expect(pos.supplyShares).to.be.gt(0);
    });

    it("should report totalAssets including deployed positions", async function () {
      const depositAmount = 10000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      const totalAssets = await vault.totalAssets();
      // Should be approximately the deposit amount (may differ slightly due to rounding)
      expect(totalAssets).to.be.closeTo(depositAmount, 10);
    });
  });

  describe("Withdraw pulls from WikshiLend", function () {
    it("should withdraw full amount by pulling from WikshiLend", async function () {
      const depositAmount = 10000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      const shares = await vault.balanceOf(depositor.address);
      const balanceBefore = await loanToken.balanceOf(depositor.address);

      await vault.connect(depositor).redeem(shares, depositor.address, depositor.address);

      const balanceAfter = await loanToken.balanceOf(depositor.address);
      // Should get back approximately the deposit amount
      expect(balanceAfter - balanceBefore).to.be.closeTo(depositAmount, 10);
    });

    it("should withdraw partial amount", async function () {
      const depositAmount = 10000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      const halfShares = (await vault.balanceOf(depositor.address)) / 2n;
      const balanceBefore = await loanToken.balanceOf(depositor.address);

      await vault.connect(depositor).redeem(halfShares, depositor.address, depositor.address);

      const balanceAfter = await loanToken.balanceOf(depositor.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(depositAmount / 2n, 10);
    });
  });

  describe("Interest accrual via WikshiLend", function () {
    it("should increase totalAssets after interest accrual", async function () {
      const depositAmount = 100000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      // Borrower creates a position (generates interest)
      // 1000 CTC * $2/CTC * 80% LLTV = $1600 max borrow. Borrow $1000.
      await wikshiLend.connect(borrower).supplyCollateral(
        marketParams, ethers.parseEther("1000"), borrower.address, "0x"
      );
      await wikshiLend.connect(borrower).borrow(
        marketParams, 1000n * 10n ** 6n, 0, borrower.address, borrower.address
      );

      const totalBefore = await vault.totalAssets();

      // Advance time to accrue interest
      await time.increase(90 * 24 * 60 * 60); // 90 days

      // Trigger interest accrual by doing a tiny supply
      await loanToken.mint(owner.address, 1n);
      await loanToken.connect(owner).approve(await wikshiLend.getAddress(), 1n);
      await wikshiLend.connect(owner).supply(marketParams, 1n, 0, owner.address, "0x");

      const totalAfter = await vault.totalAssets();
      expect(totalAfter).to.be.gt(totalBefore);
    });
  });

  describe("Allocations", function () {
    it("should set allocations as owner", async function () {
      const newAllocations = [
        { marketParams, weight: ethers.parseEther("0.6") },
      ];
      await vault.connect(owner).setAllocations(newAllocations);
      expect(await vault.allocationCount()).to.equal(1);
      expect(await vault.totalWeight()).to.equal(ethers.parseEther("0.6"));
    });

    it("should revert with empty allocations", async function () {
      await expect(
        vault.connect(owner).setAllocations([])
      ).to.be.revertedWithCustomError(vault, "WikshiVault__NoAllocations");
    });

    it("should revert with zero weight", async function () {
      const allocations = [
        { marketParams, weight: 0 },
      ];
      await expect(
        vault.connect(owner).setAllocations(allocations)
      ).to.be.revertedWithCustomError(vault, "WikshiVault__InvalidWeights");
    });

    it("should revert if non-owner sets allocations", async function () {
      await expect(
        vault.connect(depositor).setAllocations([])
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Reallocate", function () {
    it("should withdraw all and re-deploy", async function () {
      const depositAmount = 10000n * 10n ** 6n;
      await vault.connect(depositor).deposit(depositAmount, depositor.address);

      const totalBefore = await vault.totalAssets();
      await vault.connect(owner).reallocate();
      const totalAfter = await vault.totalAssets();

      // totalAssets should be approximately the same (minor rounding)
      expect(totalAfter).to.be.closeTo(totalBefore, 10);
    });
  });

  describe("Inflation Attack Protection", function () {
    it("should have decimals offset of 6", async function () {
      // The vault uses 6-decimal USDT as asset. With a 6-decimal offset,
      // vault shares have 12 decimals total (6 + 6), creating 1e6 virtual shares.
      expect(await vault.decimals()).to.equal(12); // 6 (asset) + 6 (offset)
    });

    it("should resist share price inflation via donation", async function () {
      // Classic ERC-4626 inflation attack:
      // 1. Attacker deposits 1 wei to get initial shares
      // 2. Attacker donates large amount directly to vault
      // 3. Victim deposits and gets too few shares due to inflated price

      const attacker = depositor;
      const victim = depositor2;

      // Step 1: Attacker deposits 1 unit ($0.000001)
      await vault.connect(attacker).deposit(1n, attacker.address);
      const attackerShares = await vault.balanceOf(attacker.address);

      // Step 2: Attacker donates $10,000 directly to vault (bypassing deposit)
      const donationAmount = 10000n * 10n ** 6n;
      await loanToken.connect(attacker).transfer(await vault.getAddress(), donationAmount);

      // Step 3: Victim deposits $10,000
      const victimDeposit = 10000n * 10n ** 6n;
      await vault.connect(victim).deposit(victimDeposit, victim.address);
      const victimShares = await vault.balanceOf(victim.address);

      // With decimals offset (1e6 virtual shares), victim should receive meaningful shares
      // Without offset: victim might get 0 shares (all value stolen)
      // With offset: victim gets shares proportional to their deposit
      expect(victimShares).to.be.gt(0);

      // Victim should be able to redeem close to their deposit value
      // (attacker's donation is shared proportionally, not stolen)
      const victimRedeemable = await vault.previewRedeem(victimShares);
      // Victim should recover most of their deposit (at least 90%)
      expect(victimRedeemable).to.be.gt(victimDeposit * 90n / 100n);
    });
  });

  describe("Multi-depositor accounting", function () {
    it("should correctly account shares for two depositors", async function () {
      const amount1 = 10000n * 10n ** 6n;
      const amount2 = 20000n * 10n ** 6n;

      await vault.connect(depositor).deposit(amount1, depositor.address);
      await vault.connect(depositor2).deposit(amount2, depositor2.address);

      const shares1 = await vault.balanceOf(depositor.address);
      const shares2 = await vault.balanceOf(depositor2.address);

      // Depositor2 deposited 2x, should have ~2x shares
      expect(shares2).to.be.closeTo(shares1 * 2n, shares1 / 100n);

      // Total assets should be sum of both deposits
      expect(await vault.totalAssets()).to.be.closeTo(amount1 + amount2, 20);
    });
  });
});
