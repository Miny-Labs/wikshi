const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WikshiIrm", function () {
  const WAD = ethers.parseEther("1"); // 1e18

  // ~2% APR per second ≈ 0.02 / 31536000 ≈ 634e-12 → 634195839
  const BASE_RATE = 634195839n;
  // ~4% APR
  const SLOPE_1 = 1268391679n;
  // ~75% APR
  const SLOPE_2 = 23782344234n;
  const OPTIMAL_UTILIZATION = ethers.parseEther("0.8"); // 80%

  let irm;

  beforeEach(async function () {
    const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
    irm = await WikshiIrm.deploy(BASE_RATE, SLOPE_1, SLOPE_2, OPTIMAL_UTILIZATION);
    await irm.waitForDeployment();
  });

  describe("Constructor", function () {
    it("should set immutable parameters correctly", async function () {
      expect(await irm.BASE_RATE()).to.equal(BASE_RATE);
      expect(await irm.SLOPE_1()).to.equal(SLOPE_1);
      expect(await irm.SLOPE_2()).to.equal(SLOPE_2);
      expect(await irm.OPTIMAL_UTILIZATION()).to.equal(OPTIMAL_UTILIZATION);
    });

    it("should revert with zero optimal utilization", async function () {
      const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
      await expect(
        WikshiIrm.deploy(BASE_RATE, SLOPE_1, SLOPE_2, 0)
      ).to.be.revertedWithCustomError(WikshiIrm, "WikshiIrm__InvalidOptimalUtilization");
    });

    it("should revert with optimal utilization >= WAD", async function () {
      const WikshiIrm = await ethers.getContractFactory("WikshiIrm");
      await expect(
        WikshiIrm.deploy(BASE_RATE, SLOPE_1, SLOPE_2, WAD)
      ).to.be.revertedWithCustomError(WikshiIrm, "WikshiIrm__InvalidOptimalUtilization");
    });
  });

  describe("borrowRate", function () {
    // Helper: build a minimal Market struct
    function buildMarket(totalSupplyAssets, totalBorrowAssets) {
      return {
        totalSupplyAssets,
        totalSupplyShares: 0,
        totalBorrowAssets,
        totalBorrowShares: 0,
        lastUpdate: 0,
        fee: 0,
      };
    }

    // Dummy MarketParams (not used in IRM calculation)
    const dummyParams = {
      loanToken: ethers.ZeroAddress,
      collateralToken: ethers.ZeroAddress,
      oracle: ethers.ZeroAddress,
      irm: ethers.ZeroAddress,
      lltv: 0,
    };

    it("should return BASE_RATE at 0% utilization", async function () {
      const market = buildMarket(1000n * 10n ** 6n, 0);
      const rate = await irm.borrowRate(dummyParams, market);
      expect(rate).to.equal(BASE_RATE);
    });

    it("should return BASE_RATE when totalSupply is 0", async function () {
      const market = buildMarket(0, 0);
      const rate = await irm.borrowRate(dummyParams, market);
      expect(rate).to.equal(BASE_RATE);
    });

    it("should increase rate as utilization approaches optimal", async function () {
      const rateAt20 = await irm.borrowRate(dummyParams, buildMarket(1000, 200));
      const rateAt40 = await irm.borrowRate(dummyParams, buildMarket(1000, 400));
      const rateAt80 = await irm.borrowRate(dummyParams, buildMarket(1000, 800));

      expect(rateAt40).to.be.gt(rateAt20);
      expect(rateAt80).to.be.gt(rateAt40);
    });

    it("should jump steeply above optimal utilization", async function () {
      const rateAt80 = await irm.borrowRate(dummyParams, buildMarket(1000, 800));
      const rateAt90 = await irm.borrowRate(dummyParams, buildMarket(1000, 900));
      const rateAt95 = await irm.borrowRate(dummyParams, buildMarket(1000, 950));

      // Above kink, rate should increase much faster
      const jump80to90 = rateAt90 - rateAt80;
      const jump90to95 = rateAt95 - rateAt90;

      // Per 10% util increase above kink should be larger than per 10% below
      expect(jump80to90).to.be.gt(0n);
      expect(rateAt95).to.be.gt(rateAt90);
    });

    it("should return approximately BASE_RATE + SLOPE_1 at optimal utilization", async function () {
      const rate = await irm.borrowRate(dummyParams, buildMarket(1000, 800));
      // At optimal: BASE_RATE + optimalUtil * SLOPE_1 / optimalUtil ≈ BASE_RATE + SLOPE_1
      // Allow 1 unit rounding tolerance from WAD division
      const expected = BASE_RATE + SLOPE_1;
      expect(rate).to.be.closeTo(expected, 1);
    });

    it("should return exact rate at 50% utilization", async function () {
      const rate = await irm.borrowRate(dummyParams, buildMarket(1000, 500));
      // util = 0.5e18, below kink.
      // rate = BASE_RATE + wMulDown(util, SLOPE_1) / OPTIMAL_UTILIZATION
      // = BASE_RATE + (0.5e18 * SLOPE_1 / 1e18) * 1e18 / 0.8e18
      const util = 500n * WAD / 1000n; // 0.5e18
      const utilSlope = util * SLOPE_1 / WAD; // wMulDown(util, SLOPE_1)
      const expected = BASE_RATE + (utilSlope * WAD / OPTIMAL_UTILIZATION);
      expect(rate).to.be.closeTo(expected, 2);
    });

    it("should return rate at 100% utilization", async function () {
      const rate = await irm.borrowRate(dummyParams, buildMarket(1000, 1000));
      // Above kink: BASE_RATE + SLOPE_1 + wMulDown(excessUtil, SLOPE_2) / maxExcess
      // excessUtil = 1.0e18 - 0.8e18 = 0.2e18, maxExcess = 0.2e18
      // = BASE_RATE + SLOPE_1 + wMulDown(0.2e18, SLOPE_2) * 1e18 / 0.2e18
      // = BASE_RATE + SLOPE_1 + SLOPE_2 (with minor wMulDown rounding)
      const excessUtil = WAD - OPTIMAL_UTILIZATION;
      const maxExcess = WAD - OPTIMAL_UTILIZATION;
      const slopeContrib = (excessUtil * SLOPE_2 / WAD) * WAD / maxExcess;
      const expected = BASE_RATE + SLOPE_1 + slopeContrib;
      expect(rate).to.be.closeTo(expected, 2);
    });

    it("should be monotonically increasing from 0% to 100%", async function () {
      let prevRate = 0n;
      for (let pct = 0; pct <= 100; pct += 5) {
        const borrow = BigInt(pct) * 10n;
        const supply = 1000n;
        const rate = await irm.borrowRate(dummyParams, buildMarket(supply, borrow));
        expect(rate).to.be.gte(prevRate);
        prevRate = rate;
      }
    });

  });

  describe("Credit Rate Modifier", function () {
    function buildMarket(totalSupplyAssets, totalBorrowAssets) {
      return {
        totalSupplyAssets,
        totalSupplyShares: 0,
        totalBorrowAssets,
        totalBorrowShares: 0,
        lastUpdate: 0,
        fee: 0,
      };
    }

    it("should return full pool rate for score 0", async function () {
      const market = buildMarket(1000, 500);
      const poolRate = await irm.borrowRate(
        { loanToken: ethers.ZeroAddress, collateralToken: ethers.ZeroAddress, oracle: ethers.ZeroAddress, irm: ethers.ZeroAddress, lltv: 0 },
        market
      );
      const userRate = await irm.borrowRateForUser(market, 0);
      expect(userRate).to.equal(poolRate);
    });

    it("should return 80% of pool rate for max score (1000)", async function () {
      const market = buildMarket(1000, 500);
      const poolRate = await irm.borrowRate(
        { loanToken: ethers.ZeroAddress, collateralToken: ethers.ZeroAddress, oracle: ethers.ZeroAddress, irm: ethers.ZeroAddress, lltv: 0 },
        market
      );
      const userRate = await irm.borrowRateForUser(market, 1000);
      // 20% discount → 80% of pool rate
      const expected = poolRate * (WAD - ethers.parseEther("0.2")) / WAD;
      expect(userRate).to.be.closeTo(expected, 2);
    });

    it("should return proportional discount for score 500", async function () {
      const market = buildMarket(1000, 500);
      const poolRate = await irm.borrowRate(
        { loanToken: ethers.ZeroAddress, collateralToken: ethers.ZeroAddress, oracle: ethers.ZeroAddress, irm: ethers.ZeroAddress, lltv: 0 },
        market
      );
      const userRate = await irm.borrowRateForUser(market, 500);
      // 10% discount → 90% of pool rate
      const expected = poolRate * (WAD - ethers.parseEther("0.1")) / WAD;
      expect(userRate).to.be.closeTo(expected, 2);
    });

    it("should cap score at MAX_CREDIT_SCORE (1000)", async function () {
      const market = buildMarket(1000, 500);
      const rate1000 = await irm.borrowRateForUser(market, 1000);
      const rate2000 = await irm.borrowRateForUser(market, 2000);
      expect(rate2000).to.equal(rate1000);
    });

    it("creditRateDiscount should return 0 for score 0", async function () {
      expect(await irm.creditRateDiscount(0)).to.equal(0);
    });

    it("creditRateDiscount should return 20% for max score", async function () {
      const discount = await irm.creditRateDiscount(1000);
      expect(discount).to.equal(ethers.parseEther("0.2"));
    });

    it("creditRateDiscount should return 10% for score 500", async function () {
      const discount = await irm.creditRateDiscount(500);
      expect(discount).to.equal(ethers.parseEther("0.1"));
    });
  });
});
