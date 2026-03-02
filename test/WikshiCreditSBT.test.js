const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WikshiCreditSBT", function () {
  let creditOracle, creditSBT;
  let owner, operator, borrower1, borrower2;

  beforeEach(async function () {
    [owner, operator, borrower1, borrower2] = await ethers.getSigners();

    // Deploy EvmV1Decoder library
    const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
    const evmDecoder = await EvmV1Decoder.deploy();
    await evmDecoder.waitForDeployment();

    // Deploy credit oracle
    const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
      libraries: {
        EvmV1Decoder: await evmDecoder.getAddress(),
      },
    });
    creditOracle = await WikshiCreditOracle.deploy(owner.address, operator.address);
    await creditOracle.waitForDeployment();

    // Deploy Credit SBT
    const WikshiCreditSBT = await ethers.getContractFactory("WikshiCreditSBT");
    creditSBT = await WikshiCreditSBT.deploy(owner.address, await creditOracle.getAddress());
    await creditSBT.waitForDeployment();
  });

  describe("Constructor", function () {
    it("should set name and symbol", async function () {
      expect(await creditSBT.name()).to.equal("Wikshi Credit Score");
      expect(await creditSBT.symbol()).to.equal("wCREDIT");
    });

    it("should set credit oracle", async function () {
      expect(await creditSBT.creditOracle()).to.equal(await creditOracle.getAddress());
    });

    it("should revert with zero oracle address", async function () {
      const WikshiCreditSBT = await ethers.getContractFactory("WikshiCreditSBT");
      await expect(
        WikshiCreditSBT.deploy(owner.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(creditSBT, "WikshiSBT__ZeroAddress");
    });
  });

  describe("Minting", function () {
    it("should mint an SBT for a borrower", async function () {
      await creditSBT.mint(borrower1.address);
      const tokenId = BigInt(borrower1.address);
      expect(await creditSBT.ownerOf(tokenId)).to.equal(borrower1.address);
    });

    it("should emit Locked (ERC-5192) and CreditDataSynced on mint", async function () {
      const tokenId = BigInt(borrower1.address);
      await expect(creditSBT.mint(borrower1.address))
        .to.emit(creditSBT, "Locked")
        .withArgs(tokenId)
        .and.to.emit(creditSBT, "CreditDataSynced");
    });

    it("should revert minting for zero address", async function () {
      await expect(creditSBT.mint(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(creditSBT, "WikshiSBT__ZeroAddress");
    });

    it("should revert minting twice for same address", async function () {
      await creditSBT.mint(borrower1.address);
      await expect(creditSBT.mint(borrower1.address)).to.be.reverted;
    });
  });

  describe("Soulbound (Non-Transferable)", function () {
    it("should revert on transfer", async function () {
      await creditSBT.mint(borrower1.address);
      const tokenId = BigInt(borrower1.address);

      await expect(
        creditSBT.connect(borrower1).transferFrom(borrower1.address, borrower2.address, tokenId)
      ).to.be.revertedWithCustomError(creditSBT, "WikshiSBT__NonTransferable");
    });

    it("should revert on safeTransferFrom", async function () {
      await creditSBT.mint(borrower1.address);
      const tokenId = BigInt(borrower1.address);

      await expect(
        creditSBT.connect(borrower1)["safeTransferFrom(address,address,uint256)"](
          borrower1.address, borrower2.address, tokenId
        )
      ).to.be.revertedWithCustomError(creditSBT, "WikshiSBT__NonTransferable");
    });

    it("locked() should return true for minted tokens", async function () {
      await creditSBT.mint(borrower1.address);
      const tokenId = BigInt(borrower1.address);
      expect(await creditSBT.locked(tokenId)).to.be.true;
    });

    it("should support ERC-5192 interface", async function () {
      // ERC-5192 interface ID = 0xb45a3c0e
      expect(await creditSBT.supportsInterface("0xb45a3c0e")).to.be.true;
    });

    it("should support ERC-721 interface", async function () {
      // ERC-721 interface ID = 0x80ac58cd
      expect(await creditSBT.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });

  describe("Credit Data Sync", function () {
    it("should sync credit data from oracle", async function () {
      // Set a credit score first
      await creditOracle.connect(operator).submitCreditScore(borrower1.address, 750);

      // Mint SBT (auto-syncs)
      await creditSBT.mint(borrower1.address);

      // Check cached data
      expect(await creditSBT.getCreditScore(borrower1.address)).to.equal(750);
    });

    it("should sync trust tier", async function () {
      // Set score and make some payments to reach Established tier
      await creditOracle.connect(operator).submitCreditScore(borrower1.address, 500);

      await creditSBT.mint(borrower1.address);

      // Tier depends on score AND payment count. Score 500 but 0 payments = Basic
      const tier = await creditSBT.getTrustTier(borrower1.address);
      expect(tier).to.equal(1n); // Basic (score > 0 but payments < 10)
    });

    it("should allow re-syncing after score update", async function () {
      await creditOracle.connect(operator).submitCreditScore(borrower1.address, 400);
      await creditSBT.mint(borrower1.address);
      expect(await creditSBT.getCreditScore(borrower1.address)).to.equal(400);

      // Update score (need to wait for cooldown)
      await time.increase(86401);
      await creditOracle.connect(operator).submitCreditScore(borrower1.address, 800);

      // Re-sync
      await creditSBT.syncCreditData(borrower1.address);
      expect(await creditSBT.getCreditScore(borrower1.address)).to.equal(800);
    });

    it("should revert sync for non-minted address", async function () {
      await expect(creditSBT.syncCreditData(borrower1.address)).to.be.reverted;
    });
  });

  describe("Composable Credit Queries", function () {
    it("getFullCreditProfile should return all data", async function () {
      await creditOracle.connect(operator).submitCreditScore(borrower1.address, 650);
      await creditSBT.mint(borrower1.address);

      const [score, tier, paymentCount, lastSynced, hasSBT] =
        await creditSBT.getFullCreditProfile(borrower1.address);

      expect(score).to.equal(650);
      expect(hasSBT).to.be.true;
      expect(lastSynced).to.be.gt(0);
    });

    it("getFullCreditProfile should return hasSBT=false for non-minted", async function () {
      const [score, tier, paymentCount, lastSynced, hasSBT] =
        await creditSBT.getFullCreditProfile(borrower2.address);

      expect(hasSBT).to.be.false;
      expect(score).to.equal(0);
    });

    it("should return zero score for borrower without SBT", async function () {
      expect(await creditSBT.getCreditScore(borrower1.address)).to.equal(0);
    });
  });

  describe("Admin", function () {
    it("should allow owner to update credit oracle and emit event", async function () {
      const oldOracle = await creditOracle.getAddress();
      await expect(creditSBT.connect(owner).setCreditOracle(borrower1.address))
        .to.emit(creditSBT, "SetCreditOracle")
        .withArgs(oldOracle, borrower1.address);
      expect(await creditSBT.creditOracle()).to.equal(borrower1.address);
    });

    it("should revert non-owner updating oracle", async function () {
      await expect(
        creditSBT.connect(borrower1).setCreditOracle(borrower2.address)
      ).to.be.reverted;
    });

    it("should revert setting zero address oracle", async function () {
      await expect(
        creditSBT.connect(owner).setCreditOracle(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(creditSBT, "WikshiSBT__ZeroAddress");
    });
  });
});
