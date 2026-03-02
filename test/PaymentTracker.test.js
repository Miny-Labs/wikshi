const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentTracker", function () {
  let paymentTracker, token;
  let borrower, treasury, operator, attacker;

  beforeEach(async function () {
    [borrower, treasury, operator, attacker] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy("USD-TCoin", "USDT", 6);
    await token.waitForDeployment();

    const PaymentTracker = await ethers.getContractFactory("PaymentTracker");
    paymentTracker = await PaymentTracker.deploy(await token.getAddress(), treasury.address, operator.address);
    await paymentTracker.waitForDeployment();

    // Register loan 1 for borrower (operator-only)
    await paymentTracker.connect(operator).registerLoan(1, borrower.address);

    // Mint tokens to borrower and approve
    await token.mint(borrower.address, 100000n * 10n ** 6n);
    await token.connect(borrower).approve(await paymentTracker.getAddress(), ethers.MaxUint256);
  });

  describe("Constructor", function () {
    it("should set payment token, treasury, and operator", async function () {
      expect(await paymentTracker.paymentToken()).to.equal(await token.getAddress());
      expect(await paymentTracker.treasury()).to.equal(treasury.address);
      expect(await paymentTracker.operator()).to.equal(operator.address);
    });

    it("should revert with zero token address", async function () {
      const PaymentTracker = await ethers.getContractFactory("PaymentTracker");
      await expect(
        PaymentTracker.deploy(ethers.ZeroAddress, treasury.address, operator.address)
      ).to.be.revertedWithCustomError(PaymentTracker, "PaymentTracker__ZeroAddress");
    });

    it("should revert with zero treasury address", async function () {
      const PaymentTracker = await ethers.getContractFactory("PaymentTracker");
      await expect(
        PaymentTracker.deploy(await token.getAddress(), ethers.ZeroAddress, operator.address)
      ).to.be.revertedWithCustomError(PaymentTracker, "PaymentTracker__ZeroAddress");
    });

    it("should revert with zero operator address", async function () {
      const PaymentTracker = await ethers.getContractFactory("PaymentTracker");
      await expect(
        PaymentTracker.deploy(await token.getAddress(), treasury.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(PaymentTracker, "PaymentTracker__ZeroAddress");
    });
  });

  describe("Loan Registry", function () {
    it("should register a loan with operator", async function () {
      await paymentTracker.connect(operator).registerLoan(99, borrower.address);
      expect(await paymentTracker.registeredLoans(99)).to.equal(borrower.address);
    });

    it("should emit LoanRegistered event", async function () {
      await expect(paymentTracker.connect(operator).registerLoan(99, borrower.address))
        .to.emit(paymentTracker, "LoanRegistered")
        .withArgs(99, borrower.address);
    });

    it("should revert registerLoan from non-operator", async function () {
      await expect(
        paymentTracker.connect(attacker).registerLoan(99, attacker.address)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__Unauthorized");
    });

    it("should revert registerLoan with zero borrower", async function () {
      await expect(
        paymentTracker.connect(operator).registerLoan(99, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__ZeroAddress");
    });

    it("should update operator", async function () {
      await paymentTracker.connect(operator).setOperator(attacker.address);
      expect(await paymentTracker.operator()).to.equal(attacker.address);
    });

    it("should revert setOperator from non-operator", async function () {
      await expect(
        paymentTracker.connect(attacker).setOperator(attacker.address)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__Unauthorized");
    });
  });

  describe("makePayment", function () {
    it("should record payment and transfer tokens", async function () {
      const amount = 1000n * 10n ** 6n;
      const treasuryBefore = await token.balanceOf(treasury.address);

      await paymentTracker.connect(borrower).makePayment(1, amount);

      expect(await paymentTracker.totalPayments(borrower.address)).to.equal(amount);
      expect(await paymentTracker.paymentCounts(borrower.address)).to.equal(1);
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + amount);
    });

    it("should emit PaymentMade event", async function () {
      const amount = 500n * 10n ** 6n;
      await expect(paymentTracker.connect(borrower).makePayment(1, amount))
        .to.emit(paymentTracker, "PaymentMade")
        .withArgs(borrower.address, 1, amount, (ts) => ts > 0);
    });

    it("should revert with zero amount", async function () {
      await expect(
        paymentTracker.connect(borrower).makePayment(1, 0)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__ZeroAmount");
    });

    it("should revert for unregistered loan", async function () {
      await expect(
        paymentTracker.connect(borrower).makePayment(999, 100n * 10n ** 6n)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__UnregisteredLoan");
    });

    it("should revert when caller is not the registered borrower", async function () {
      // Loan 1 is registered for 'borrower', attacker tries to pay
      await token.mint(attacker.address, 10000n * 10n ** 6n);
      await token.connect(attacker).approve(await paymentTracker.getAddress(), ethers.MaxUint256);

      await expect(
        paymentTracker.connect(attacker).makePayment(1, 100n * 10n ** 6n)
      ).to.be.revertedWithCustomError(paymentTracker, "PaymentTracker__NotBorrower");
    });

    it("should track multiple payments to the same registered loan", async function () {
      await paymentTracker.connect(borrower).makePayment(1, 100n * 10n ** 6n);
      await paymentTracker.connect(borrower).makePayment(1, 200n * 10n ** 6n);

      expect(await paymentTracker.totalPayments(borrower.address)).to.equal(300n * 10n ** 6n);
      expect(await paymentTracker.paymentCounts(borrower.address)).to.equal(2);
    });
  });

  describe("Multiple loan IDs", function () {
    it("should track payments to different registered loanIds independently", async function () {
      // Register additional loans for borrower
      await paymentTracker.connect(operator).registerLoan(2, borrower.address);
      await paymentTracker.connect(operator).registerLoan(3, borrower.address);

      await paymentTracker.connect(borrower).makePayment(1, 100n * 10n ** 6n);
      await paymentTracker.connect(borrower).makePayment(2, 200n * 10n ** 6n);
      await paymentTracker.connect(borrower).makePayment(3, 300n * 10n ** 6n);

      // Total across all loanIds
      expect(await paymentTracker.totalPayments(borrower.address)).to.equal(600n * 10n ** 6n);
      expect(await paymentTracker.paymentCounts(borrower.address)).to.equal(3);
    });

    it("should emit separate events per payment with different loanIds", async function () {
      await paymentTracker.connect(operator).registerLoan(10, borrower.address);
      await paymentTracker.connect(operator).registerLoan(20, borrower.address);

      await expect(paymentTracker.connect(borrower).makePayment(10, 100n * 10n ** 6n))
        .to.emit(paymentTracker, "PaymentMade")
        .withArgs(borrower.address, 10, 100n * 10n ** 6n, (ts) => ts > 0);

      await expect(paymentTracker.connect(borrower).makePayment(20, 200n * 10n ** 6n))
        .to.emit(paymentTracker, "PaymentMade")
        .withArgs(borrower.address, 20, 200n * 10n ** 6n, (ts) => ts > 0);
    });
  });
});
