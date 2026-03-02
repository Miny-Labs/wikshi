const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WikshiOracle", function () {
  const ORACLE_PRICE_SCALE = 10n ** 36n;
  const INITIAL_PRICE = ORACLE_PRICE_SCALE; // 1:1 price

  let oracle;
  let owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
    oracle = await WikshiOracle.deploy(owner.address, INITIAL_PRICE, "CTC/USDT");
    await oracle.waitForDeployment();
  });

  describe("Constructor", function () {
    it("should set initial price and description", async function () {
      expect(await oracle.currentPrice()).to.equal(INITIAL_PRICE);
      expect(await oracle.description()).to.equal("CTC/USDT");
    });

    it("should revert with zero price", async function () {
      const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
      await expect(
        WikshiOracle.deploy(owner.address, 0, "CTC/USDT")
      ).to.be.revertedWithCustomError(WikshiOracle, "WikshiOracle__ZeroPrice");
    });

    it("should set initialOwner as owner", async function () {
      const WikshiOracle = await ethers.getContractFactory("WikshiOracle");
      const o = await WikshiOracle.deploy(other.address, INITIAL_PRICE, "TEST/USD");
      await o.waitForDeployment();
      expect(await o.owner()).to.equal(other.address);
    });
  });

  describe("price()", function () {
    it("should return current price when fresh", async function () {
      expect(await oracle.price()).to.equal(INITIAL_PRICE);
    });

    it("should revert if price is stale (>24h)", async function () {
      await time.increase(24 * 60 * 60 + 1); // 24 hours + 1 second
      await expect(oracle.price()).to.be.revertedWithCustomError(oracle, "WikshiOracle__StalePrice");
    });
  });

  describe("setPrice()", function () {
    it("should update price as owner", async function () {
      const newPrice = ORACLE_PRICE_SCALE * 2n; // 2:1
      await oracle.setPrice(newPrice);
      expect(await oracle.currentPrice()).to.equal(newPrice);
    });

    it("should emit PriceUpdated event", async function () {
      const newPrice = ORACLE_PRICE_SCALE * 2n;
      await expect(oracle.setPrice(newPrice))
        .to.emit(oracle, "PriceUpdated");
    });

    it("should revert with zero price", async function () {
      await expect(oracle.setPrice(0))
        .to.be.revertedWithCustomError(oracle, "WikshiOracle__ZeroPrice");
    });

    it("should revert if not owner", async function () {
      await expect(oracle.connect(other).setPrice(ORACLE_PRICE_SCALE))
        .to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("should refresh staleness after update", async function () {
      await time.increase(24 * 60 * 60 + 1);
      await expect(oracle.price()).to.be.revertedWithCustomError(oracle, "WikshiOracle__StalePrice");

      // Update price → resets lastUpdated
      await oracle.setPrice(ORACLE_PRICE_SCALE);
      expect(await oracle.price()).to.equal(ORACLE_PRICE_SCALE);
    });

    it("should allow multiple sequential price updates", async function () {
      const prices = [ORACLE_PRICE_SCALE * 2n, ORACLE_PRICE_SCALE * 3n, ORACLE_PRICE_SCALE / 2n];
      for (const p of prices) {
        await oracle.setPrice(p);
        expect(await oracle.currentPrice()).to.equal(p);
        expect(await oracle.price()).to.equal(p);
      }
    });
  });

  describe("Staleness boundaries", function () {
    it("should pass at exactly 24h (boundary: > not >=)", async function () {
      await time.increase(24 * 60 * 60); // exactly 24h
      // Should still be valid — staleness check is > not >=
      expect(await oracle.price()).to.equal(INITIAL_PRICE);
    });

    it("should revert at 24h + 1s", async function () {
      await time.increase(24 * 60 * 60 + 1);
      await expect(oracle.price()).to.be.revertedWithCustomError(oracle, "WikshiOracle__StalePrice");
    });
  });

});
