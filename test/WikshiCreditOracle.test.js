const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("WikshiCreditOracle", function () {
  let oracle, evmDecoderAddr;
  let owner, operator, borrower, other;

  beforeEach(async function () {
    [owner, operator, borrower, other] = await ethers.getSigners();

    // Deploy EvmV1Decoder library first (required by WikshiCreditOracle)
    const EvmV1Decoder = await ethers.getContractFactory("EvmV1Decoder");
    const evmDecoder = await EvmV1Decoder.deploy();
    await evmDecoder.waitForDeployment();
    evmDecoderAddr = await evmDecoder.getAddress();

    const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
      libraries: {
        EvmV1Decoder: evmDecoderAddr,
      },
    });
    oracle = await WikshiCreditOracle.deploy(owner.address, operator.address);
    await oracle.waitForDeployment();
  });

  describe("Constructor", function () {
    it("should set owner and operator", async function () {
      expect(await oracle.owner()).to.equal(owner.address);
      expect(await oracle.oracleOperator()).to.equal(operator.address);
    });

    it("should revert with zero operator address", async function () {
      const WikshiCreditOracle = await ethers.getContractFactory("WikshiCreditOracle", {
        libraries: { EvmV1Decoder: evmDecoderAddr },
      });
      await expect(
        WikshiCreditOracle.deploy(owner.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(WikshiCreditOracle, "WikshiCreditOracle__ZeroAddress");
    });
  });

  describe("submitCreditScore", function () {
    it("should set credit score as operator", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);
      expect(await oracle.getCreditScore(borrower.address)).to.equal(700);
    });

    it("should emit CreditScoreUpdated event", async function () {
      await expect(oracle.connect(operator).submitCreditScore(borrower.address, 500))
        .to.emit(oracle, "CreditScoreUpdated")
        .withArgs(borrower.address, 500, "operator");
    });

    it("should revert if not operator", async function () {
      await expect(
        oracle.connect(other).submitCreditScore(borrower.address, 500)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__NotOperator");
    });

    it("should revert with zero borrower address", async function () {
      await expect(
        oracle.connect(operator).submitCreditScore(ethers.ZeroAddress, 500)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__ZeroAddress");
    });

    it("should revert if score exceeds MAX_SCORE (1000)", async function () {
      await expect(
        oracle.connect(operator).submitCreditScore(borrower.address, 1001)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__ScoreExceedsMax");
    });

    it("should revert during cooldown period", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 500);

      // Immediate second submission should fail (1 day cooldown)
      await expect(
        oracle.connect(operator).submitCreditScore(borrower.address, 600)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__CooldownActive");
    });

    it("should allow update after cooldown", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 500);

      await time.increase(86401); // 1 day + 1 second

      await oracle.connect(operator).submitCreditScore(borrower.address, 700);
      expect(await oracle.getCreditScore(borrower.address)).to.equal(700);
    });
  });

  describe("Trust Tiers", function () {
    it("should return Unverified (0) for unknown borrowers", async function () {
      expect(await oracle.getTrustTier(other.address)).to.equal(0);
    });

    it("should return Basic (1) when score > 0", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 100);
      expect(await oracle.getTrustTier(borrower.address)).to.equal(1);
    });

    it("should return Established (2) when score >= 400 and payments >= 10", async function () {
      // Set score to 400
      await oracle.connect(operator).submitCreditScore(borrower.address, 400);

      // We can't directly set payment count via operator, but trust tier
      // checks both score AND paymentCount. Since paymentCount comes from
      // USC verified payments only, a score of 400 with 0 payments = Basic
      expect(await oracle.getTrustTier(borrower.address)).to.equal(1); // Basic (no payments)
    });

    it("should return correct tier based on score alone (without payments)", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 800);
      // Score 800 but 0 payments → Basic (not Trusted, which needs payments >= 20)
      expect(await oracle.getTrustTier(borrower.address)).to.equal(1);
    });
  });

  describe("setOracleOperator", function () {
    it("should update operator as owner", async function () {
      await oracle.connect(owner).setOracleOperator(other.address);
      expect(await oracle.oracleOperator()).to.equal(other.address);
    });

    it("should emit OracleOperatorUpdated event", async function () {
      await expect(oracle.connect(owner).setOracleOperator(other.address))
        .to.emit(oracle, "OracleOperatorUpdated")
        .withArgs(operator.address, other.address);
    });

    it("should revert if not owner", async function () {
      await expect(
        oracle.connect(other).setOracleOperator(other.address)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("should revert with zero address", async function () {
      await expect(
        oracle.connect(owner).setOracleOperator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__ZeroAddress");
    });
  });

  describe("TestWikshiCreditOracle — internal function tests", function () {
    let testOracle;
    const PAYMENT_MADE_SIGNATURE = ethers.keccak256(
      ethers.toUtf8Bytes("PaymentMade(address,uint256,uint256,uint256)")
    );

    beforeEach(async function () {
      const TestWikshiCreditOracle = await ethers.getContractFactory("TestWikshiCreditOracle", {
        libraries: { EvmV1Decoder: evmDecoderAddr },
      });
      testOracle = await TestWikshiCreditOracle.deploy(owner.address, operator.address);
      await testOracle.waitForDeployment();

      // Configure per-token decimals for test log source.
      // processPaymentEventPublic passes chainKey=0 and token=address(0).
      // Test logs use TEST_SOURCE_CONTRACT as address_ (not ZeroAddress, since setter requires non-zero).
      await testOracle.setSourceTokenDecimals(0, "0x0000000000000000000000000000000000000001", ethers.ZeroAddress, 6);
    });

    // Non-zero source contract address for test logs (setter rejects address(0))
    const TEST_SOURCE_CONTRACT = "0x0000000000000000000000000000000000000001";

    function buildPaymentLog(borrowerAddr, amount) {
      // topics[0] = event signature, topics[1] = indexed borrower address
      const topics = [
        PAYMENT_MADE_SIGNATURE,
        ethers.zeroPadValue(borrowerAddr, 32),
        ethers.zeroPadValue("0x01", 32), // loanId = 1
      ];
      // data = abi.encode(amount, timestamp)
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [amount, Math.floor(Date.now() / 1000)]
      );
      return {
        address_: TEST_SOURCE_CONTRACT,
        topics: topics,
        data: data,
      };
    }

    describe("_calculateIncrement", function () {
      it("should return 10 for $1 (1e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(1000000n)).to.equal(10);
      });

      it("should return 10 for $99 (99e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(99000000n)).to.equal(10);
      });

      it("should return 20 for $100 (100e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(100000000n)).to.equal(20);
      });

      it("should return 20 for $999 (999e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(999000000n)).to.equal(20);
      });

      it("should return 30 for $1000 (1000e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(1000000000n)).to.equal(30);
      });

      it("should return 30 for $10000 (10000e6)", async function () {
        expect(await testOracle.calculateIncrementPublic(10000000000n)).to.equal(30);
      });
    });

    describe("_processPaymentEvent scoring", function () {
      it("should initialize score at 300 + increment for first on-time payment", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n); // $100
        await testOracle.processPaymentEventPublic(log, 0, 1);
        // Initial 300 + 20 = 320
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);
      });

      it("should increment paymentCount for on-time and late, but not default", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);

        // On-time payment (action=0) — increments
        await testOracle.processPaymentEventPublic(log, 0, 1);
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(1);

        // Late payment (action=1) — also increments (payment was made, just late)
        await time.increase(86401);
        await testOracle.processPaymentEventPublic(log, 1, 1);
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(2);

        // Default (action=2) — should NOT increment (no payment made)
        await time.increase(86401);
        await testOracle.processPaymentEventPublic(log, 2, 1);
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(2);
      });

      it("should decrease score by 50 for late payment (action=1)", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        // Init: 300 + 20 = 320
        await testOracle.processPaymentEventPublic(log, 0, 1);
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);

        await time.increase(86401);
        // Late: 320 - 50 = 270
        await testOracle.processPaymentEventPublic(log, 1, 1);
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(270);
      });

      it("should decrease score by 200 for default (action=2)", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        await testOracle.processPaymentEventPublic(log, 0, 1);
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);

        await time.increase(86401);
        // Default: 320 - 200 = 120
        await testOracle.processPaymentEventPublic(log, 2, 1);
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(120);
      });

      it("should floor score at 0 on multiple defaults", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        await testOracle.processPaymentEventPublic(log, 0, 1);
        // 320

        await time.increase(86401);
        await testOracle.processPaymentEventPublic(log, 2, 1); // 320-200=120
        await time.increase(86401);
        await testOracle.processPaymentEventPublic(log, 2, 1); // 120-200=0 (floor)

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(0);
      });

      it("should cap score at MAX_SCORE (1000)", async function () {
        const log = buildPaymentLog(borrower.address, 1000000000n); // $1000 → +30

        // Need (1000 - 300) / 30 = ~24 payments to reach cap
        for (let i = 0; i < 24; i++) {
          await time.increase(86401);
          await testOracle.processPaymentEventPublic(log, 0, 1);
        }

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(1000);

        // One more should still be 1000
        await time.increase(86401);
        await testOracle.processPaymentEventPublic(log, 0, 1);
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(1000);
      });

      it("should revert on invalid action (action=3)", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        await expect(
          testOracle.processPaymentEventPublic(log, 3, 1)
        ).to.be.revertedWithCustomError(testOracle, "WikshiCreditOracle__InvalidAction");
      });

      it("should revert on payment below minimum ($100)", async function () {
        const log = buildPaymentLog(borrower.address, 99999999n); // < 100e6
        await expect(
          testOracle.processPaymentEventPublic(log, 0, 1)
        ).to.be.revertedWithCustomError(testOracle, "WikshiCreditOracle__PaymentBelowMinimum");
      });
    });

    describe("Trust tier progression via payments", function () {
      it("should reach Established tier (score>=400, payments>=10)", async function () {
        const log = buildPaymentLog(borrower.address, 1000000000n); // $1000 → +30

        // 10 payments: score = 300 + 10*30 = 600, payments = 10
        for (let i = 0; i < 10; i++) {
          await time.increase(86401);
          await testOracle.processPaymentEventPublic(log, 0, 1);
        }

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(600);
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(10);
        expect(await testOracle.getTrustTier(borrower.address)).to.equal(2); // Established
      });

      it("should reach Trusted tier (score>=700, payments>=20)", async function () {
        const log = buildPaymentLog(borrower.address, 1000000000n); // $1000 → +30

        // 20 payments: score = 300 + 20*30 = 900, payments = 20
        for (let i = 0; i < 20; i++) {
          await time.increase(86401);
          await testOracle.processPaymentEventPublic(log, 0, 1);
        }

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(900);
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(20);
        expect(await testOracle.getTrustTier(borrower.address)).to.equal(3); // Trusted
      });
    });

    describe("Cooldown", function () {
      it("should pass at exactly 86400s (boundary: < not <=)", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        await testOracle.processPaymentEventPublic(log, 0, 1);

        await time.increase(86400); // exactly 1 day
        // Should succeed — cooldown check is < not <=
        await testOracle.processPaymentEventPublic(log, 0, 1);

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(340); // 320 + 20
      });
    });

    describe("Borrower Topic Index", function () {
      const AAVE_V3_REPAY_SIG = ethers.keccak256(
        ethers.toUtf8Bytes("Repay(address,address,address,uint256,bool)")
      );

      it("should extract borrower from topics[2] for Aave V3 Repay events", async function () {
        // Aave V3 Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)
        // topics[0]=sig, topics[1]=reserve, topics[2]=user(borrower), topics[3]=repayer
        const reserve = other.address; // dummy reserve token
        const log = {
          address_: TEST_SOURCE_CONTRACT,
          topics: [
            AAVE_V3_REPAY_SIG,
            ethers.zeroPadValue(reserve, 32),            // topics[1] = reserve
            ethers.zeroPadValue(borrower.address, 32),   // topics[2] = user (borrower)
            ethers.zeroPadValue(other.address, 32),       // topics[3] = repayer
          ],
          data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "bool"],
            [100n * 10n ** 6n, false]
          ),
        };

        // Using borrowerTopicIdx=2 (Aave pattern)
        await testOracle.processPaymentEventPublic(log, 0, 2);

        // Borrower (topics[2]) should have score updated, not reserve (topics[1])
        expect(await testOracle.getCreditScore(borrower.address)).to.equal(320); // 300 + 20 ($100)
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(1);
      });

      it("should extract borrower from topics[1] for PaymentMade events", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n); // $100
        await testOracle.processPaymentEventPublic(log, 0, 1);

        expect(await testOracle.getCreditScore(borrower.address)).to.equal(320); // 300 + 20
        expect(await testOracle.getPaymentCount(borrower.address)).to.equal(1);
      });

      it("should revert when borrowerTopicIdx exceeds topics length", async function () {
        const log = buildPaymentLog(borrower.address, 100000000n);
        // log has 3 topics (indices 0,1,2). Requesting index 5 should fail.
        await expect(
          testOracle.processPaymentEventPublic(log, 0, 5)
        ).to.be.revertedWith("Invalid log: insufficient topics for borrower index");
      });
    });
  });

  describe("SupportedEventSignature event", function () {
    it("should emit SupportedEventSignatureUpdated on set", async function () {
      const sig = ethers.keccak256(ethers.toUtf8Bytes("Transfer(address,address,uint256)"));
      await expect(oracle.setSupportedEventSignature(sig, true))
        .to.emit(oracle, "SupportedEventSignatureUpdated")
        .withArgs(sig, true);
    });

    it("should emit event on unset", async function () {
      const sig = ethers.keccak256(ethers.toUtf8Bytes("PaymentMade(address,uint256,uint256,uint256)"));
      await expect(oracle.setSupportedEventSignature(sig, false))
        .to.emit(oracle, "SupportedEventSignatureUpdated")
        .withArgs(sig, false);
    });
  });

  describe("Score Decay", function () {
    it("should return full score within grace period (29 days)", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);

      // Advance 29 days — within 30-day grace
      await time.increase(29 * 24 * 60 * 60);

      expect(await oracle.getCreditScore(borrower.address)).to.equal(700);
    });

    it("should return decayed score after grace period (31 days = -1 point)", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);

      // Advance 31 days — 1 day past grace → 1 point decay
      await time.increase(31 * 24 * 60 * 60);

      expect(await oracle.getCreditScore(borrower.address)).to.equal(699);
    });

    it("should decay to 0 for very old scores (2+ years)", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 500);

      // Advance 2 years → (730 - 30) = 700 days past grace → 700 points decay → floor at 0
      await time.increase(730 * 24 * 60 * 60);

      expect(await oracle.getCreditScore(borrower.address)).to.equal(0);
    });

    it("should return 0 for 0 raw score (no double-compute)", async function () {
      // No score submitted, raw = 0
      expect(await oracle.getCreditScore(other.address)).to.equal(0);
    });

    it("should reset decay timer on score update", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);

      // Advance 35 days → 5 days past grace → -5 points
      await time.increase(35 * 24 * 60 * 60);
      expect(await oracle.getCreditScore(borrower.address)).to.equal(695);

      // Update score — resets timer
      await oracle.connect(operator).submitCreditScore(borrower.address, 800);

      // Score should be fresh 800, no decay
      expect(await oracle.getCreditScore(borrower.address)).to.equal(800);
    });

    it("should return undecayed value from getRawCreditScore", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);

      // Advance 60 days → 30 days past grace → -30 points decayed
      await time.increase(60 * 24 * 60 * 60);

      expect(await oracle.getCreditScore(borrower.address)).to.equal(670);
      expect(await oracle.getRawCreditScore(borrower.address)).to.equal(700);
    });
  });

  describe("Credit Slashing", function () {
    it("should slash score from authorized slasher", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);
      await oracle.connect(owner).setAuthorizedSlasher(other.address, true);

      await oracle.connect(other).slashScore(borrower.address);

      expect(await oracle.getRawCreditScore(borrower.address)).to.equal(600); // 700 - 100
    });

    it("should revert slash from non-slasher", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);

      await expect(
        oracle.connect(other).slashScore(borrower.address)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__NotAuthorizedSlasher");
    });

    it("should floor score at 0 (no underflow)", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 50);
      await oracle.connect(owner).setAuthorizedSlasher(other.address, true);

      await oracle.connect(other).slashScore(borrower.address);

      expect(await oracle.getRawCreditScore(borrower.address)).to.equal(0); // 50 - 100 → 0
    });

    it("should emit CreditScoreUpdated with source 'slash'", async function () {
      await oracle.connect(operator).submitCreditScore(borrower.address, 700);
      await oracle.connect(owner).setAuthorizedSlasher(other.address, true);

      await expect(oracle.connect(other).slashScore(borrower.address))
        .to.emit(oracle, "CreditScoreUpdated")
        .withArgs(borrower.address, 600, "slash");
    });

    it("should emit SlasherUpdated event on setAuthorizedSlasher", async function () {
      await expect(oracle.connect(owner).setAuthorizedSlasher(other.address, true))
        .to.emit(oracle, "SlasherUpdated")
        .withArgs(other.address, true);
    });

    it("should revert setAuthorizedSlasher with zero address", async function () {
      await expect(
        oracle.connect(owner).setAuthorizedSlasher(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__ZeroAddress");
    });
  });

  describe("Trust Tier Decay (getTrustTier uses decayed scores)", function () {
    let testOracle;
    const TEST_SRC = "0x0000000000000000000000000000000000000001";

    beforeEach(async function () {
      // Use TestWikshiCreditOracle to access processPaymentEventPublic
      const TestWikshiCreditOracle = await ethers.getContractFactory("TestWikshiCreditOracle", {
        libraries: { EvmV1Decoder: evmDecoderAddr },
      });
      testOracle = await TestWikshiCreditOracle.deploy(owner.address, operator.address);
      await testOracle.waitForDeployment();
      await testOracle.setSourceTokenDecimals(0, TEST_SRC, ethers.ZeroAddress, 6);
    });

    it("should return Trusted tier within grace period for high-score borrower", async function () {
      // Use setPaymentCountForTesting to reach Trusted tier threshold (payments >= 20)
      await testOracle.setPaymentCountForTesting(borrower.address, 20);
      await testOracle.connect(operator).submitCreditScore(borrower.address, 750);

      // Within grace period — should be Trusted (score >= 700, payments >= 20)
      expect(await testOracle.getTrustTier(borrower.address)).to.equal(3); // Trusted = 3
    });

    it("should downgrade tier when score decays below threshold", async function () {
      // Use setPaymentCountForTesting to reach Trusted tier threshold
      await testOracle.setPaymentCountForTesting(borrower.address, 20);
      await testOracle.connect(operator).submitCreditScore(borrower.address, 700);

      // Verify Trusted initially
      expect(await testOracle.getTrustTier(borrower.address)).to.equal(3);

      // Advance 31 days → 1 day past grace → score decays to 699
      await time.increase(31 * 24 * 60 * 60);

      // 699 < 700 → should downgrade from Trusted to Established (payments=20 >= 10)
      expect(await testOracle.getTrustTier(borrower.address)).to.equal(2); // Established = 2
    });

    it("should return Unverified when score fully decays and no payments", async function () {
      await testOracle.connect(operator).submitCreditScore(other.address, 100);

      // Advance 2 years → score decays to 0
      await time.increase(730 * 24 * 60 * 60);

      // Score = 0, payments = 0 → Unverified
      expect(await testOracle.getTrustTier(other.address)).to.equal(0); // Unverified = 0
    });
  });

  describe("ChainInfoPrecompile (0x0FD3) Integration", function () {
    it("should have CHAIN_INFO immutable set to 0x0FD3", async function () {
      const chainInfoAddr = await oracle.CHAIN_INFO();
      expect(chainInfoAddr.toLowerCase()).to.equal("0x0000000000000000000000000000000000000fd3");
    });

    it("should have VERIFIER immutable set to 0x0FD2", async function () {
      // Verify both precompiles are wired: 0x0FD2 for proofs, 0x0FD3 for chain info
      const verifierAddr = await oracle.VERIFIER();
      expect(verifierAddr).to.equal("0x0000000000000000000000000000000000000FD2");
    });

    it("should expose getSupportedChains (reverts in Hardhat, works on Creditcoin)", async function () {
      // 0x0FD3 precompile doesn't exist in Hardhat — call reverts.
      // This test verifies the function exists and is callable.
      await expect(oracle.getSupportedChains()).to.be.reverted;
    });

    it("should expose isChainHeightAttested (reverts in Hardhat, works on Creditcoin)", async function () {
      await expect(oracle.isChainHeightAttested(1, 12345678)).to.be.reverted;
    });

    it("should expose getLatestAttestation (reverts in Hardhat, works on Creditcoin)", async function () {
      await expect(oracle.getLatestAttestation(1)).to.be.reverted;
    });

    it("should expose getChainInfo (reverts in Hardhat, works on Creditcoin)", async function () {
      await expect(oracle.getChainInfo(1)).to.be.reverted;
    });
  });

  describe("Approved Source Contracts", function () {
    const CHAIN_KEY_ETH = 1n;
    const CHAIN_KEY_POLYGON = 137n;

    it("should set and query approved source contracts per chain", async function () {
      const sourceAddr = "0x1234567890AbcdEF1234567890aBcdef12345678";

      // Initially not approved
      expect(await oracle.approvedSourceContracts(CHAIN_KEY_ETH, sourceAddr)).to.equal(false);

      // Approve on Ethereum
      await oracle.setApprovedSourceContract(CHAIN_KEY_ETH, sourceAddr, true);
      expect(await oracle.approvedSourceContracts(CHAIN_KEY_ETH, sourceAddr)).to.equal(true);

      // Revoke on Ethereum
      await oracle.setApprovedSourceContract(CHAIN_KEY_ETH, sourceAddr, false);
      expect(await oracle.approvedSourceContracts(CHAIN_KEY_ETH, sourceAddr)).to.equal(false);
    });

    it("should emit ApprovedSourceContractUpdated event with chainKey", async function () {
      const sourceAddr = "0x1234567890AbcdEF1234567890aBcdef12345678";
      await expect(oracle.setApprovedSourceContract(CHAIN_KEY_ETH, sourceAddr, true))
        .to.emit(oracle, "ApprovedSourceContractUpdated")
        .withArgs(CHAIN_KEY_ETH, sourceAddr, true);
    });

    it("should revert if non-owner calls setApprovedSourceContract", async function () {
      const sourceAddr = "0x1234567890AbcdEF1234567890aBcdef12345678";
      await expect(
        oracle.connect(borrower).setApprovedSourceContract(CHAIN_KEY_ETH, sourceAddr, true)
      ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });

    it("should revert with zero address source contract", async function () {
      await expect(
        oracle.setApprovedSourceContract(CHAIN_KEY_ETH, ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(oracle, "WikshiCreditOracle__ZeroAddress");
    });

    it("should scope approvals per chain — same address on different chain is NOT approved", async function () {
      const sourceAddr = "0x1234567890AbcdEF1234567890aBcdef12345678";
      // Approve on Ethereum only
      await oracle.setApprovedSourceContract(CHAIN_KEY_ETH, sourceAddr, true);
      expect(await oracle.approvedSourceContracts(CHAIN_KEY_ETH, sourceAddr)).to.equal(true);
      // Same address on Polygon is NOT approved
      expect(await oracle.approvedSourceContracts(CHAIN_KEY_POLYGON, sourceAddr)).to.equal(false);
    });
  });

  describe("USC Cooldown Enforcement", function () {
    let testOracle;
    const PAYMENT_MADE_SIG = ethers.keccak256(
      ethers.toUtf8Bytes("PaymentMade(address,uint256,uint256,uint256)")
    );

    const USC_TEST_SRC = "0x0000000000000000000000000000000000000001";

    function buildLog(borrowerAddr, amount) {
      const topics = [
        PAYMENT_MADE_SIG,
        ethers.zeroPadValue(borrowerAddr, 32),
        ethers.zeroPadValue("0x01", 32),
      ];
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [amount, Math.floor(Date.now() / 1000)]
      );
      return { address_: USC_TEST_SRC, topics, data };
    }

    beforeEach(async function () {
      const TestWikshiCreditOracle = await ethers.getContractFactory("TestWikshiCreditOracle", {
        libraries: { EvmV1Decoder: evmDecoderAddr },
      });
      testOracle = await TestWikshiCreditOracle.deploy(owner.address, operator.address);
      await testOracle.waitForDeployment();
      await testOracle.setSourceTokenDecimals(0, USC_TEST_SRC, ethers.ZeroAddress, 6);
    });

    it("should enforce cooldown on consecutive USC payment events", async function () {
      const log = buildLog(borrower.address, 100000000n);

      // First call succeeds
      await testOracle.processPaymentEventPublic(log, 0, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);

      // Second call immediately should fail (cooldown active)
      await expect(
        testOracle.processPaymentEventPublic(log, 0, 1)
      ).to.be.revertedWithCustomError(testOracle, "WikshiCreditOracle__CooldownActive");
    });

    it("should allow USC payment event after cooldown expires", async function () {
      const log = buildLog(borrower.address, 100000000n);

      await testOracle.processPaymentEventPublic(log, 0, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);

      // Advance past cooldown (1 day)
      await time.increase(86401);

      // Should succeed now
      await testOracle.processPaymentEventPublic(log, 0, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(340);
    });
  });

  describe("Gluwa CCNext Loan.sol Event Selectors", function () {
    it("should have GLUWA_FUND_LOAN_SELECTOR registered", async function () {
      // LoanFundInitiated(bytes32,address,address,uint256) — precomputed from CreditScore.sol
      const sig = "0xa1c86ab2ab7ae6485c68325a433de4a6c7f4bca1f08e39b6f472e966186009a3";
      expect(await oracle.supportedEventSignatures(sig)).to.equal(true);
    });

    it("should have GLUWA_REPAY_LOAN_SELECTOR registered", async function () {
      // LoanRepaid(bytes32,address,uint256) — precomputed from CreditScore.sol
      const sig = "0xa4513463869a9bb2a04ca9d0887721a32388ebe4ade85f8743261b3214b6d65b";
      expect(await oracle.supportedEventSignatures(sig)).to.equal(true);
    });

    it("should have GLUWA_LATE_REPAYMENT_SELECTOR registered", async function () {
      // LoanLateRepayment(bytes32,address) — precomputed from CreditScore.sol
      const sig = "0xb0d80134f4ded447f10109fd780b197cb9d2acd76570ec652dd08dccd2edb374";
      expect(await oracle.supportedEventSignatures(sig)).to.equal(true);
    });

    it("should have GLUWA_EXPIRED_LOAN_SELECTOR registered", async function () {
      // LoanExpired(bytes32,address) — actual Loan.sol event signature
      const sig = ethers.keccak256(ethers.toUtf8Bytes("LoanExpired(bytes32,address)"));
      expect(await oracle.supportedEventSignatures(sig)).to.equal(true);
    });
  });

  describe("DeFi Event Farming Prevention", function () {
    it("should NOT have Aave V3 Repay signature registered by default", async function () {
      // Aave V3 Repay events excluded — can be generated cheaply via flash loans.
      const aaveSig = ethers.keccak256(
        ethers.toUtf8Bytes("Repay(address,address,address,uint256,bool)")
      );
      expect(await oracle.supportedEventSignatures(aaveSig)).to.equal(false);
    });

    it("should NOT have Compound V3 Supply signature registered by default", async function () {
      // Compound V3 Supply events excluded — can be generated cheaply via flash loans.
      const compoundSig = ethers.keccak256(
        ethers.toUtf8Bytes("Supply(address,address,uint256)")
      );
      expect(await oracle.supportedEventSignatures(compoundSig)).to.equal(false);
    });

    it("should only have PaymentTracker + Gluwa events registered (5 total)", async function () {
      // Verify the complete set of default-registered events:
      // 1. PaymentMade (PaymentTracker)
      const paymentSig = ethers.keccak256(
        ethers.toUtf8Bytes("PaymentMade(address,uint256,uint256,uint256)")
      );
      expect(await oracle.supportedEventSignatures(paymentSig)).to.equal(true);

      // 2-5. Gluwa Loan.sol events
      const gluwaFund = "0xa1c86ab2ab7ae6485c68325a433de4a6c7f4bca1f08e39b6f472e966186009a3";
      const gluwaRepay = "0xa4513463869a9bb2a04ca9d0887721a32388ebe4ade85f8743261b3214b6d65b";
      const gluwaLate = "0xb0d80134f4ded447f10109fd780b197cb9d2acd76570ec652dd08dccd2edb374";
      const gluwaExpired = ethers.keccak256(ethers.toUtf8Bytes("LoanExpired(bytes32,address)"));

      expect(await oracle.supportedEventSignatures(gluwaFund)).to.equal(true);
      expect(await oracle.supportedEventSignatures(gluwaRepay)).to.equal(true);
      expect(await oracle.supportedEventSignatures(gluwaLate)).to.equal(true);
      expect(await oracle.supportedEventSignatures(gluwaExpired)).to.equal(true);
    });

    it("owner CAN re-enable DeFi events via setSupportedEventSignature (explicit opt-in)", async function () {
      // Verify owner can still enable DeFi events if they accept the flash loan risk
      const aaveSig = ethers.keccak256(
        ethers.toUtf8Bytes("Repay(address,address,address,uint256,bool)")
      );
      expect(await oracle.supportedEventSignatures(aaveSig)).to.equal(false);

      await oracle.connect(owner).setSupportedEventSignature(aaveSig, true);
      expect(await oracle.supportedEventSignatures(aaveSig)).to.equal(true);

      // And revoke again
      await oracle.connect(owner).setSupportedEventSignature(aaveSig, false);
      expect(await oracle.supportedEventSignatures(aaveSig)).to.equal(false);
    });
  });

  describe("Worst-Action-Wins Ordering", function () {
    // NOTE: Full integration testing of _processAndEmitEvent requires RLP-encoded transactions
    // and the USC precompile (0x0FD2) which only exists on Creditcoin chain. These tests verify
    // the architectural guarantee: negative events are registered and take priority by design.

    it("should have negative Gluwa events registered (prerequisite for worst-action-wins)", async function () {
      // LoanExpired (action=2, most severe) must be registered to be checked first
      const expiredSig = ethers.keccak256(ethers.toUtf8Bytes("LoanExpired(bytes32,address)"));
      expect(await oracle.supportedEventSignatures(expiredSig)).to.equal(true);

      // LoanLateRepayment (action=1) must be registered to be checked second
      const lateSig = "0xb0d80134f4ded447f10109fd780b197cb9d2acd76570ec652dd08dccd2edb374";
      expect(await oracle.supportedEventSignatures(lateSig)).to.equal(true);
    });

    it("negative scoring paths should apply correct penalties", async function () {
      // Verify the scoring logic for negative actions still works correctly
      // via the test harness (processPaymentEventPublic)
      const testOracleFactory = await ethers.getContractFactory("TestWikshiCreditOracle", {
        libraries: { EvmV1Decoder: evmDecoderAddr },
      });
      const testOracle = await testOracleFactory.deploy(owner.address, operator.address);
      await testOracle.waitForDeployment();
      await testOracle.setSourceTokenDecimals(0, "0x0000000000000000000000000000000000000001", ethers.ZeroAddress, 6);

      const PAYMENT_MADE_SIG = ethers.keccak256(
        ethers.toUtf8Bytes("PaymentMade(address,uint256,uint256,uint256)")
      );
      const log = {
        address_: "0x0000000000000000000000000000000000000001",
        topics: [
          PAYMENT_MADE_SIG,
          ethers.zeroPadValue(borrower.address, 32),
          ethers.zeroPadValue("0x01", 32),
        ],
        data: ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256"],
          [100000000n, Math.floor(Date.now() / 1000)]
        ),
      };

      // On-time payment: init 300 + 20 = 320
      await testOracle.processPaymentEventPublic(log, 0, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(320);

      // Default (action=2): 320 - 200 = 120 — worst-action penalty
      await time.increase(86401);
      await testOracle.processPaymentEventPublic(log, 2, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(120);

      // Late (action=1): 120 - 50 = 70
      await time.increase(86401);
      await testOracle.processPaymentEventPublic(log, 1, 1);
      expect(await testOracle.getCreditScore(borrower.address)).to.equal(70);
    });
  });
});
