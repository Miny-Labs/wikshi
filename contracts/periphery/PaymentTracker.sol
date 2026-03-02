// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PaymentTracker
/// @notice Source chain contract (deployed on Sepolia/Ethereum) that emits custom payment events.
/// @dev Emits PaymentMade events per USC docs — NOT generic Transfer events.
///      The off-chain worker picks up these events, generates proofs, and submits them
///      to WikshiCreditOracle on Creditcoin via USC v2.
///      Pattern reference: AuxiliaryLoanContract.sol from gluwa/usc-testnet-bridge-examples.
///
///      Loan registry prevents credit score farming: only operator-registered loans
///      with verified borrowers can generate PaymentMade events. Self-funded phantom
///      loans are impossible because registerLoan is operator-only.
/// @custom:security-contact security@wikshi.xyz
contract PaymentTracker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The payment token (e.g., USDT, USDC on source chain).
    IERC20 public immutable paymentToken;

    /// @notice Treasury address that receives payments.
    address public immutable treasury;

    /// @notice Operator who registers real loans (prevents self-funded credit farming).
    address public operator;

    /// @notice Registered loans: loanId => borrower address.
    /// @dev Only payments against registered loans by their assigned borrower generate events.
    mapping(uint256 => address) public registeredLoans;

    /// @notice Total payments tracked per borrower.
    mapping(address => uint256) public totalPayments;

    /// @notice Payment count per borrower.
    mapping(address => uint256) public paymentCounts;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a borrower makes a payment.
    /// @dev Custom event per USC docs — the off-chain worker filters for this signature.
    ///      Topics: [0] = event sig, [1] = borrower (indexed), [2] = loanId (indexed).
    ///      Data: amount, timestamp.
    event PaymentMade(
        address indexed borrower,
        uint256 indexed loanId,
        uint256 amount,
        uint256 timestamp
    );

    event LoanRegistered(uint256 indexed loanId, address indexed borrower);
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error PaymentTracker__ZeroAmount();
    error PaymentTracker__ZeroAddress();
    error PaymentTracker__Unauthorized();
    error PaymentTracker__UnregisteredLoan();
    error PaymentTracker__NotBorrower();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param token The ERC20 payment token address.
    /// @param treasuryAddress The address that receives payments.
    /// @param operator_ The initial loan registry operator.
    constructor(address token, address treasuryAddress, address operator_) {
        if (token == address(0) || treasuryAddress == address(0) || operator_ == address(0)) {
            revert PaymentTracker__ZeroAddress();
        }
        paymentToken = IERC20(token);
        treasury = treasuryAddress;
        operator = operator_;
    }

    /*//////////////////////////////////////////////////////////////
                          OPERATOR FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Register a real loan with its verified borrower.
    /// @dev Only operator can register loans. This prevents self-funded credit score farming:
    ///      an attacker cannot create phantom loans and pay themselves to inflate their score.
    /// @param loanId The loan identifier (matches source chain loan).
    /// @param borrower The verified borrower who owes repayment.
    function registerLoan(uint256 loanId, address borrower) external {
        if (msg.sender != operator) revert PaymentTracker__Unauthorized();
        if (borrower == address(0)) revert PaymentTracker__ZeroAddress();
        registeredLoans[loanId] = borrower;
        emit LoanRegistered(loanId, borrower);
    }

    /// @notice Update the operator address.
    function setOperator(address newOperator) external {
        if (msg.sender != operator) revert PaymentTracker__Unauthorized();
        if (newOperator == address(0)) revert PaymentTracker__ZeroAddress();
        address old = operator;
        operator = newOperator;
        emit OperatorUpdated(old, newOperator);
    }

    /*//////////////////////////////////////////////////////////////
                    USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Records a loan payment. Transfers tokens and emits PaymentMade event.
    /// @dev Only registered borrowers can pay registered loans, preventing credit score
    ///      farming via self-funded phantom payments.
    /// @param loanId The loan identifier (must be registered by operator).
    /// @param amount The payment amount in token units.
    function makePayment(uint256 loanId, uint256 amount) external nonReentrant {
        if (amount == 0) revert PaymentTracker__ZeroAmount();

        // Validate loan is registered and caller is the assigned borrower
        address registeredBorrower = registeredLoans[loanId];
        if (registeredBorrower == address(0)) revert PaymentTracker__UnregisteredLoan();
        if (msg.sender != registeredBorrower) revert PaymentTracker__NotBorrower();

        // Effects
        totalPayments[msg.sender] += amount;
        paymentCounts[msg.sender]++;

        // Interactions (CEI: state updated before external call)
        paymentToken.safeTransferFrom(msg.sender, treasury, amount);

        emit PaymentMade(msg.sender, loanId, amount, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the total amount paid by a borrower.
    function getTotalPayments(address borrower) external view returns (uint256) {
        return totalPayments[borrower];
    }

    /// @notice Returns the number of payments made by a borrower.
    function getPaymentCount(address borrower) external view returns (uint256) {
        return paymentCounts[borrower];
    }
}
