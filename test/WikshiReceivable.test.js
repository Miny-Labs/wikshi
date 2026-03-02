const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WikshiReceivable (RWA)", function () {
  let receivable, creditOracle, wrapper, receivableOracle, loanToken;
  let owner, operator, lender, borrower, other;

  const PRINCIPAL = 10000n * 10n ** 6n; // 10,000 USDT (6 decimals)
  const INTEREST_RATE = 1500n; // 15% APR in basis points
  const SOURCE_LOAN_HASH = ethers.keccak256(ethers.toUtf8Bytes("loan-001"));
  const SOURCE_CHAIN_KEY = 1n; // Ethereum

  beforeEach(async function () {
    [owner, operator, lender, borrower, other] = await ethers.getSigners();

    // Deploy EvmV1Decoder library (required by WikshiCreditOracle)
    const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
    const evmDecoder = await EvmV1Decoder.deploy();

    // Deploy a test token for loanToken references
    const TestToken = await ethers.getContractFactory("TestToken");
    loanToken = await TestToken.deploy("USD-TCoin", "USDT", 6);

    // Deploy credit oracle with linked library
    const CreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
      libraries: { EvmV1Decoder: await evmDecoder.getAddress() },
    });
    creditOracle = await CreditOracle.deploy(owner.address, operator.address);

    // Deploy receivable
    const Receivable = await ethers.getContractFactory("WikshiReceivable");
    receivable = await Receivable.deploy(owner.address, await creditOracle.getAddress());

    // Authorize owner as minter and updater
    await receivable.setAuthorizedMinter(owner.address, true);
    await receivable.setAuthorizedUpdater(owner.address, true);

    // Deploy wrapper scoped to loanToken denomination
    const Wrapper = await ethers.getContractFactory("WikshiReceivableWrapper");
    wrapper = await Wrapper.deploy(await receivable.getAddress(), await loanToken.getAddress(), owner.address);

    // Deploy receivable oracle
    const Oracle = await ethers.getContractFactory("WikshiReceivableOracle");
    const initialPrice = 10n ** 36n; // 1:1 price
    receivableOracle = await Oracle.deploy(
      owner.address,
      await receivable.getAddress(),
      initialPrice,
      "wREC/USDT"
    );

    // Give borrower a credit score
    await creditOracle.connect(operator).submitCreditScore(borrower.address, 700);
  });

  async function mintDefaultReceivable() {
    const loanTokenAddr = await loanToken.getAddress();
    const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60; // 1 year
    const tx = await receivable.mintReceivable(
      lender.address,
      borrower.address,
      loanTokenAddr,
      PRINCIPAL,
      INTEREST_RATE,
      maturityAt,
      SOURCE_LOAN_HASH,
      SOURCE_CHAIN_KEY
    );
    return { tx, maturityAt };
  }

  describe("WikshiReceivable — Minting", function () {
    it("should mint a receivable NFT with correct loan data", async function () {
      const { maturityAt } = await mintDefaultReceivable();

      expect(await receivable.ownerOf(1)).to.equal(lender.address);
      expect(await receivable.totalReceivables()).to.equal(1);

      const loan = await receivable.getLoanData(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.principal).to.equal(PRINCIPAL);
      expect(loan.interestRate).to.equal(INTEREST_RATE);
      expect(loan.status).to.equal(0); // Active
      expect(loan.repaidAmount).to.equal(0);
      expect(loan.sourceLoanHash).to.equal(SOURCE_LOAN_HASH);
    });

    it("should calculate expectedRepayment correctly (principal + interest)", async function () {
      const { maturityAt } = await mintDefaultReceivable();
      const loan = await receivable.getLoanData(1);

      // expectedRepayment = principal + (principal * rate * duration) / (BPS * 365 days)
      // For ~1 year at 15% APR: ~10000 + 1500 = ~11500 USDT
      expect(loan.expectedRepayment).to.be.gt(PRINCIPAL);
      expect(loan.expectedRepayment).to.be.lt(PRINCIPAL + PRINCIPAL * 2000n / 10000n); // < 20%
    });

    it("should emit ReceivableMinted event", async function () {
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await expect(
        receivable.mintReceivable(
          lender.address, borrower.address, await loanToken.getAddress(),
          PRINCIPAL, INTEREST_RATE, maturityAt, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
        )
      ).to.emit(receivable, "ReceivableMinted");
    });

    it("should revert on duplicate source loan hash", async function () {
      await mintDefaultReceivable();
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await expect(
        receivable.mintReceivable(
          lender.address, borrower.address, await loanToken.getAddress(),
          PRINCIPAL, INTEREST_RATE, maturityAt, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
        )
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__DuplicateLoan");
    });

    it("should revert from unauthorized minter", async function () {
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await expect(
        receivable.connect(other).mintReceivable(
          lender.address, borrower.address, await loanToken.getAddress(),
          PRINCIPAL, INTEREST_RATE, maturityAt, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
        )
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__Unauthorized");
    });

    it("should revert with zero principal", async function () {
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await expect(
        receivable.mintReceivable(
          lender.address, borrower.address, await loanToken.getAddress(),
          0, INTEREST_RATE, maturityAt, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
        )
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__ZeroPrincipal");
    });

    it("should revert with past maturity date", async function () {
      const pastMaturity = (await time.latest()) - 100;
      await expect(
        receivable.mintReceivable(
          lender.address, borrower.address, await loanToken.getAddress(),
          PRINCIPAL, INTEREST_RATE, pastMaturity, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
        )
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__InvalidMaturity");
    });

    it("should increment token IDs sequentially", async function () {
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await receivable.mintReceivable(
        lender.address, borrower.address, await loanToken.getAddress(),
        PRINCIPAL, INTEREST_RATE, maturityAt, SOURCE_LOAN_HASH, SOURCE_CHAIN_KEY
      );

      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("loan-002"));
      await receivable.mintReceivable(
        lender.address, borrower.address, await loanToken.getAddress(),
        PRINCIPAL, INTEREST_RATE, maturityAt, hash2, SOURCE_CHAIN_KEY
      );

      expect(await receivable.totalReceivables()).to.equal(2);
      expect(await receivable.ownerOf(1)).to.equal(lender.address);
      expect(await receivable.ownerOf(2)).to.equal(lender.address);
    });
  });

  describe("WikshiReceivable — Repayment & Default", function () {
    beforeEach(async function () {
      await mintDefaultReceivable();
    });

    it("should record partial repayment", async function () {
      const repayAmount = 5000n * 10n ** 6n;
      await receivable.recordRepayment(1, repayAmount);

      const loan = await receivable.getLoanData(1);
      expect(loan.repaidAmount).to.equal(repayAmount);
      expect(loan.status).to.equal(2); // PartiallyRepaid (enum index 2)
    });

    it("should mark as Repaid when fully repaid", async function () {
      const loan = await receivable.getLoanData(1);
      await receivable.recordRepayment(1, loan.expectedRepayment);

      const updated = await receivable.getLoanData(1);
      expect(updated.status).to.equal(1); // Repaid (enum index 1)
      expect(updated.repaidAmount).to.equal(loan.expectedRepayment);
    });

    it("should emit RepaymentRecorded event", async function () {
      await expect(receivable.recordRepayment(1, 1000n * 10n ** 6n))
        .to.emit(receivable, "RepaymentRecorded");
    });

    it("should revert on excess repayment", async function () {
      const loan = await receivable.getLoanData(1);
      await expect(
        receivable.recordRepayment(1, loan.expectedRepayment + 1n)
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__ExcessRepayment");
    });

    it("should revert repayment from unauthorized updater", async function () {
      await expect(
        receivable.connect(other).recordRepayment(1, 1000n * 10n ** 6n)
      ).to.be.revertedWithCustomError(receivable, "WikshiReceivable__Unauthorized");
    });

    it("should mark as defaulted", async function () {
      await receivable.markDefaulted(1);
      const loan = await receivable.getLoanData(1);
      expect(loan.status).to.equal(3); // Defaulted (enum index 3)
    });

    it("should emit ReceivableStatusUpdated on default", async function () {
      await expect(receivable.markDefaulted(1))
        .to.emit(receivable, "ReceivableStatusUpdated");
    });

    it("should revert marking already defaulted as defaulted", async function () {
      await receivable.markDefaulted(1);
      await expect(receivable.markDefaulted(1))
        .to.be.revertedWithCustomError(receivable, "WikshiReceivable__InvalidStatus");
    });
  });

  describe("WikshiReceivable — Redemption", function () {
    beforeEach(async function () {
      await mintDefaultReceivable();
    });

    it("should allow holder to redeem fully repaid receivable", async function () {
      const loan = await receivable.getLoanData(1);
      await receivable.recordRepayment(1, loan.expectedRepayment);

      await receivable.connect(lender).redeem(1);

      // NFT should be burned
      await expect(receivable.ownerOf(1)).to.be.reverted;
    });

    it("should emit ReceivableRedeemed on redemption", async function () {
      const loan = await receivable.getLoanData(1);
      await receivable.recordRepayment(1, loan.expectedRepayment);

      await expect(receivable.connect(lender).redeem(1))
        .to.emit(receivable, "ReceivableRedeemed");
    });

    it("should revert redemption of non-repaid receivable", async function () {
      await expect(receivable.connect(lender).redeem(1))
        .to.be.revertedWithCustomError(receivable, "WikshiReceivable__NotRepaid");
    });

    it("should revert redemption by non-holder", async function () {
      const loan = await receivable.getLoanData(1);
      await receivable.recordRepayment(1, loan.expectedRepayment);

      await expect(receivable.connect(other).redeem(1))
        .to.be.revertedWithCustomError(receivable, "WikshiReceivable__Unauthorized");
    });
  });

  describe("WikshiReceivable — Valuation (Credit-Adjusted DCF)", function () {
    beforeEach(async function () {
      await mintDefaultReceivable();
    });

    it("should return higher value for higher credit score", async function () {
      // Borrower has score 700 (set in beforeEach)
      const valueHigh = await receivable.getReceivableValue(1);

      // Create another receivable with a different borrower (score 0)
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("loan-002"));
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await receivable.mintReceivable(
        lender.address, other.address, await loanToken.getAddress(),
        PRINCIPAL, INTEREST_RATE, maturityAt, hash2, SOURCE_CHAIN_KEY
      );
      const valueLow = await receivable.getReceivableValue(2);

      // Higher credit score → higher value
      expect(valueHigh).to.be.gt(valueLow);
    });

    it("should return face value for fully repaid receivable", async function () {
      const loan = await receivable.getLoanData(1);
      await receivable.recordRepayment(1, loan.expectedRepayment);

      const value = await receivable.getReceivableValue(1);
      expect(value).to.equal(loan.expectedRepayment);
    });

    it("should return repaidAmount only for defaulted receivable", async function () {
      const partialRepay = 3000n * 10n ** 6n;
      await receivable.recordRepayment(1, partialRepay);
      await receivable.markDefaulted(1);

      const value = await receivable.getReceivableValue(1);
      expect(value).to.equal(partialRepay);
    });

    it("should increase value as maturity approaches (time discount)", async function () {
      const valueNow = await receivable.getReceivableValue(1);

      // Advance 6 months — also refresh credit score to prevent decay from interfering
      await time.increase(182 * 24 * 60 * 60);
      await creditOracle.connect(operator).submitCreditScore(borrower.address, 700);
      const valueLater = await receivable.getReceivableValue(1);

      // Value should increase as we approach maturity (time discount reduces)
      expect(valueLater).to.be.gt(valueNow);
    });
  });

  describe("WikshiReceivableOracle", function () {
    it("should return the set price", async function () {
      const p = await receivableOracle.price();
      expect(p).to.equal(10n ** 36n);
    });

    it("should allow owner to update price", async function () {
      const newPrice = 95n * 10n ** 34n; // 0.95
      await receivableOracle.setPrice(newPrice);
      expect(await receivableOracle.price()).to.equal(newPrice);
    });

    it("should revert on zero price", async function () {
      await expect(receivableOracle.setPrice(0))
        .to.be.revertedWithCustomError(receivableOracle, "WikshiReceivableOracle__ZeroPrice");
    });

    it("should revert on stale price", async function () {
      await time.increase(49 * 60 * 60); // 49 hours > 48 hours staleness
      await expect(receivableOracle.price())
        .to.be.revertedWithCustomError(receivableOracle, "WikshiReceivableOracle__StalePrice");
    });

    it("should refresh price from receivable on-chain valuation", async function () {
      await mintDefaultReceivable();
      await receivableOracle.refreshPriceFromReceivable(1, 6); // USDT = 6 decimals
      const p = await receivableOracle.price();
      expect(p).to.be.gt(0);
    });

    it("should emit PriceUpdated event", async function () {
      await expect(receivableOracle.setPrice(10n ** 35n))
        .to.emit(receivableOracle, "PriceUpdated");
    });
  });

  describe("WikshiReceivableWrapper", function () {
    beforeEach(async function () {
      await mintDefaultReceivable();
    });

    it("should have correct name, symbol, and decimals", async function () {
      expect(await wrapper.name()).to.equal("Wrapped Wikshi Receivable");
      expect(await wrapper.symbol()).to.equal("wREC");
      expect(await wrapper.decimals()).to.equal(6);
    });

    it("should expose expectedLoanToken and loanTokenDecimals", async function () {
      expect(await wrapper.expectedLoanToken()).to.equal(await loanToken.getAddress());
      expect(await wrapper.loanTokenDecimals()).to.equal(6);
    });

    it("should wrap a receivable NFT and mint ERC-20 tokens", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      // Check ERC-20 balance equals principal (same decimals, no normalization needed)
      expect(await wrapper.balanceOf(lender.address)).to.equal(PRINCIPAL);

      // Check NFT is held by wrapper
      expect(await receivable.ownerOf(1)).to.equal(await wrapper.getAddress());

      // Check wrapper state
      expect(await wrapper.mintedAmount(1)).to.equal(PRINCIPAL);
      expect(await wrapper.wrappedCount()).to.equal(1);
    });

    it("should unwrap and return NFT to depositor", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      // Unwrap
      await wrapper.connect(lender).unwrap(1);

      // NFT back to lender
      expect(await receivable.ownerOf(1)).to.equal(lender.address);

      // ERC-20 burned
      expect(await wrapper.balanceOf(lender.address)).to.equal(0);
      expect(await wrapper.wrappedCount()).to.equal(0);
    });

    it("should block unwrap by non-depositor even after token transfer", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      // Transfer ALL wREC to 'other' (simulates collateral supply or sale)
      await wrapper.connect(lender).transfer(other.address, PRINCIPAL);

      // 'other' holds enough wREC but is NOT depositor or authorized — must be blocked
      // Cherry-pick attack: attacker acquires wREC and tries to steal the specific NFT
      await expect(wrapper.connect(other).unwrap(1))
        .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__NotAuthorizedToUnwrap");
    });

    it("should allow authorized unwrapper to unwrap for liquidation", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      // Transfer wREC to authorized unwrapper (simulates liquidation flow)
      await wrapper.connect(lender).transfer(other.address, PRINCIPAL);
      await wrapper.setAuthorizedUnwrapper(other.address, true);

      // Authorized unwrapper CAN unwrap — this is the correct liquidation path
      await wrapper.connect(other).unwrap(1);
      expect(await receivable.ownerOf(1)).to.equal(other.address);
    });

    it("should revert unwrap when depositor still holds tokens — cherry-pick prevention", async function () {
      // Mint a SECOND receivable so there's a pool of 2 NFTs
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("loan-002"));
      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      await receivable.mintReceivable(
        other.address, borrower.address, await loanToken.getAddress(),
        PRINCIPAL, INTEREST_RATE, maturityAt, hash2, SOURCE_CHAIN_KEY
      );

      // lender wraps tokenId 1, other wraps tokenId 2
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);
      await receivable.connect(other).approve(await wrapper.getAddress(), 2);
      await wrapper.connect(other).wrap(2);

      // 'other' tries to cherry-pick lender's tokenId 1
      // lender still holds their wREC → cherry-pick blocked
      await expect(wrapper.connect(other).unwrap(1))
        .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__NotAuthorizedToUnwrap");
    });

    it("should track depositorOf correctly", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      expect(await wrapper.depositorOf(1)).to.equal(lender.address);
    });

    it("should emit AuthorizedUnwrapperUpdated event", async function () {
      await expect(wrapper.setAuthorizedUnwrapper(other.address, true))
        .to.emit(wrapper, "AuthorizedUnwrapperUpdated")
        .withArgs(other.address, true);
    });

    it("should revert setAuthorizedUnwrapper from non-owner", async function () {
      await expect(wrapper.connect(other).setAuthorizedUnwrapper(other.address, true))
        .to.be.revertedWithCustomError(wrapper, "OwnableUnauthorizedAccount");
    });

    it("should revert unwrap with insufficient ERC-20 balance", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      // Transfer some wREC away so lender can't unwrap
      await wrapper.connect(lender).transfer(other.address, 1000n * 10n ** 6n);

      await expect(wrapper.connect(lender).unwrap(1))
        .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__InsufficientBalance");
    });

    it("should reject unsolicited ERC-721 transfers", async function () {
      // Try to safeTransferFrom directly to wrapper — should revert
      await expect(
        receivable.connect(lender)["safeTransferFrom(address,address,uint256)"](
          lender.address, await wrapper.getAddress(), 1
        )
      ).to.be.revertedWithCustomError(wrapper, "WikshiWrapper__UnsolicitedTransfer");
    });

    it("should revert wrapping receivable with wrong loan token", async function () {
      // Mint a receivable with a DIFFERENT loan token
      const TestToken2 = await ethers.getContractFactory("TestToken");
      const otherToken = await TestToken2.deploy("Wrapped BTC", "WBTC", 8);

      const maturityAt = (await time.latest()) + 365 * 24 * 60 * 60;
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("loan-btc-001"));
      await receivable.mintReceivable(
        lender.address, borrower.address, await otherToken.getAddress(),
        PRINCIPAL, INTEREST_RATE, maturityAt, hash2, SOURCE_CHAIN_KEY
      );

      await receivable.connect(lender).approve(await wrapper.getAddress(), 2);
      await expect(wrapper.connect(lender).wrap(2))
        .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__LoanTokenMismatch");
    });

    it("should revert wrapping defaulted receivable", async function () {
      await receivable.markDefaulted(1);
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);

      await expect(wrapper.connect(lender).wrap(1))
        .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__InvalidReceivable");
    });

    it("should emit Wrapped and Unwrapped events", async function () {
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);

      await expect(wrapper.connect(lender).wrap(1))
        .to.emit(wrapper, "Wrapped")
        .withArgs(1, lender.address, PRINCIPAL);

      await expect(wrapper.connect(lender).unwrap(1))
        .to.emit(wrapper, "Unwrapped")
        .withArgs(1, lender.address, PRINCIPAL);
    });

    describe("unwrapTo (liquidation NFT routing)", function () {
      it("should allow authorized unwrapper to unwrap to a different recipient", async function () {
        await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
        await wrapper.connect(lender).wrap(1);

        // Transfer wREC to the authorized unwrapper (simulates router receiving seized collateral)
        await wrapper.connect(lender).transfer(other.address, PRINCIPAL);
        await wrapper.setAuthorizedUnwrapper(other.address, true);

        // unwrapTo sends NFT to borrower (the specified recipient), not to 'other' (caller)
        await wrapper.connect(other).unwrapTo(1, borrower.address);
        expect(await receivable.ownerOf(1)).to.equal(borrower.address);
        expect(await wrapper.balanceOf(other.address)).to.equal(0);
      });

      it("should revert unwrapTo from non-authorized caller", async function () {
        await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
        await wrapper.connect(lender).wrap(1);

        // Even the depositor cannot use unwrapTo — it's reserved for authorized unwrappers
        await expect(wrapper.connect(lender).unwrapTo(1, other.address))
          .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__NotAuthorizedToUnwrap");
      });

      it("should revert unwrapTo with zero address recipient", async function () {
        await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
        await wrapper.connect(lender).wrap(1);
        await wrapper.connect(lender).transfer(other.address, PRINCIPAL);
        await wrapper.setAuthorizedUnwrapper(other.address, true);

        await expect(wrapper.connect(other).unwrapTo(1, ethers.ZeroAddress))
          .to.be.revertedWithCustomError(wrapper, "WikshiWrapper__ZeroAddress");
      });

      it("should emit Unwrapped with recipient address (not caller)", async function () {
        await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
        await wrapper.connect(lender).wrap(1);
        await wrapper.connect(lender).transfer(other.address, PRINCIPAL);
        await wrapper.setAuthorizedUnwrapper(other.address, true);

        await expect(wrapper.connect(other).unwrapTo(1, borrower.address))
          .to.emit(wrapper, "Unwrapped")
          .withArgs(1, borrower.address, PRINCIPAL);
      });
    });
  });

  describe("WikshiLiquidationRouter", function () {
    let router;

    beforeEach(async function () {
      const Router = await ethers.getContractFactory("WikshiLiquidationRouter");
      router = await Router.deploy(owner.address); // using owner as placeholder for wikshiLend
    });

    it("should deploy with correct WikshiLend reference", async function () {
      expect(await router.wikshiLend()).to.equal(owner.address);
    });

    it("should revert deployment with zero address", async function () {
      const Router = await ethers.getContractFactory("WikshiLiquidationRouter");
      await expect(Router.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Router, "WikshiRouter__ZeroAddress");
    });

    it("should revert liquidateAndUnwrap when wrapper != collateralToken", async function () {
      // Wrap a receivable so there's a valid tokenId with a depositor
      await mintDefaultReceivable();
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      const wrapperAddr = await wrapper.getAddress();
      const loanTokenAddr = await loanToken.getAddress();

      // MarketParams where collateralToken is loanToken (NOT the wrapper)
      const fakeMarketParams = {
        loanToken: loanTokenAddr,
        collateralToken: loanTokenAddr, // mismatch — wrapper != collateralToken
        oracle: ethers.ZeroAddress,
        irm: ethers.ZeroAddress,
        lltv: 0,
      };

      await expect(
        router.liquidateAndUnwrap(fakeMarketParams, lender.address, 1000, 0, wrapperAddr, 1)
      ).to.be.revertedWithCustomError(router, "WikshiRouter__WrapperMismatch");
    });

    it("should revert liquidateAndUnwrap when tokenId not owned by borrower", async function () {
      // Wrap a receivable — depositor is 'lender'
      await mintDefaultReceivable();
      await receivable.connect(lender).approve(await wrapper.getAddress(), 1);
      await wrapper.connect(lender).wrap(1);

      const wrapperAddr = await wrapper.getAddress();
      const loanTokenAddr = await loanToken.getAddress();

      // MarketParams where collateralToken matches wrapper (passes wrapper check)
      const marketParams = {
        loanToken: loanTokenAddr,
        collateralToken: wrapperAddr,
        oracle: ethers.ZeroAddress,
        irm: ethers.ZeroAddress,
        lltv: 0,
      };

      // Try to liquidate 'other' but unwrap tokenId 1 (deposited by 'lender')
      // This is the exact cherry-pick attack: liquidator targets a different borrower's NFT
      await expect(
        router.liquidateAndUnwrap(marketParams, other.address, 1000, 0, wrapperAddr, 1)
      ).to.be.revertedWithCustomError(router, "WikshiRouter__TokenIdNotOwnedByBorrower");
    });
  });
});
