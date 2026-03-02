// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IWikshiCreditOracle} from "contracts/interfaces/IWikshiCreditOracle.sol";
import {USCBase} from "contracts/vendor/USCBase.sol";
import {EvmV1Decoder} from "contracts/vendor/EvmV1Decoder.sol";
import {INativeQueryVerifier} from "contracts/vendor/VerifierInterface.sol";
import {IChainInfoPrecompile, ChainInfoLib} from "contracts/vendor/ChainInfoPrecompile.sol";

/// @title WikshiCreditOracle
/// @notice Dual-source credit scoring oracle extending Gluwa's USCBase for cross-chain verification.
/// @dev Source A: Off-chain oracle operator (ingests historical Credal/Creditcoin credit data).
///      Source B: USC-verified cross-chain payment events from source chains (Ethereum, Polygon, etc.).
///      Design references:
///      - Gluwa's CreditScore.sol (score 300-900, event-driven, 4 actions)
///      - Gluwa's USCLoanManager.sol (proof verification + EvmV1Decoder pattern)
///      Architecture decision: Tae Oh stated credit scoring should be off-chain —
///      "different lenders, different models." Our oracle operator pattern honors this:
///      the off-chain model is pluggable, the on-chain oracle stores the result.
/// @custom:security-contact security@wikshi.xyz
contract WikshiCreditOracle is IWikshiCreditOracle, USCBase, Ownable2Step, ReentrancyGuard {

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum payment amount to count ($100 in 6-decimal tokens).
    /// @dev Set at $100 to make credit score farming economically infeasible.
    uint256 public constant MIN_PAYMENT_AMOUNT = 100e6;

    /// @notice Minimum interval between score updates for the same borrower (1 day).
    /// @dev Combined with $100 minimum payment, reaching Established tier costs $1,000+
    ///      over 10+ days — making LLTV bonus farming economically marginal.
    uint256 public constant MIN_UPDATE_INTERVAL = 1 days;

    /// @notice Initial credit score for new borrowers (matches Gluwa CreditScore.sol: 300).
    uint256 public constant INITIAL_SCORE = 300;

    /// @notice Maximum credit score.
    uint256 public constant MAX_SCORE = 1000;

    /// @notice Grace period before score decay begins.
    uint256 public constant DECAY_GRACE_PERIOD = 30 days;

    /// @notice Score points decayed per day after grace period.
    uint256 public constant DECAY_RATE_PER_DAY = 1;

    /// @notice Score penalty applied per liquidation slash.
    uint256 public constant SLASH_PENALTY = 100;

    /// @notice Event signature for PaymentMade events from source chain PaymentTracker.
    bytes32 public constant PAYMENT_MADE_SIGNATURE =
        keccak256("PaymentMade(address,uint256,uint256,uint256)");

    /*//////////////////////////////////////////////////////////////
          GLUWA CCNEXT LOAN.SOL ACTUAL EVENT SELECTORS
    //////////////////////////////////////////////////////////////*/
    /// @dev Sourced from gluwa/CCNext-smart-contracts CreditScore.sol — these are the
    ///      precomputed selectors for events emitted by Gluwa's on-chain Loan.sol contract.
    ///      Topic layout differs from external DeFi events: bytes32 indexed loanHash is topics[1],
    ///      borrower address is at topics[2] or topics[3] depending on the event.

    /// @notice Gluwa Loan.sol: LoanFundInitiated(bytes32 indexed loanHash, address indexed lender, address indexed borrower, uint256 amount)
    /// @dev Borrower at topics[3], amount in data
    bytes32 public constant GLUWA_FUND_LOAN_SELECTOR =
        0xa1c86ab2ab7ae6485c68325a433de4a6c7f4bca1f08e39b6f472e966186009a3;

    /// @notice Gluwa Loan.sol: LoanRepaid(bytes32 indexed loanHash, address indexed borrower, uint256 amount)
    /// @dev Borrower at topics[2], amount in data
    bytes32 public constant GLUWA_REPAY_LOAN_SELECTOR =
        0xa4513463869a9bb2a04ca9d0887721a32388ebe4ade85f8743261b3214b6d65b;

    /// @notice Gluwa Loan.sol: LoanLateRepayment(bytes32 indexed loanHash, address indexed borrower)
    /// @dev Borrower at topics[2], no data
    bytes32 public constant GLUWA_LATE_REPAYMENT_SELECTOR =
        0xb0d80134f4ded447f10109fd780b197cb9d2acd76570ec652dd08dccd2edb374;

    /// @notice Gluwa Loan.sol: LoanExpired(bytes32 indexed loanHash, address indexed borrower)
    /// @dev Matches actual Loan.sol event signature (bytes32,address), not CreditScore.sol's
    ///      internal helper event which has different params (bytes32,uint256,uint256).
    bytes32 public constant GLUWA_EXPIRED_LOAN_SELECTOR =
        keccak256("LoanExpired(bytes32,address)");

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Credit scores per borrower (0-1000).
    mapping(address => uint256) public creditScores;

    /// @notice Verified payment count per borrower.
    mapping(address => uint256) public paymentCount;

    /// @notice Last score update timestamp per borrower (cooldown enforcement).
    mapping(address => uint256) public lastScoreUpdate;

    /// @notice Off-chain oracle operator address (submits scores from Credal data).
    address public oracleOperator;

    /// @notice Supported event signatures for multi-protocol credit recognition.
    /// @dev Maps event signature => whether it's recognized as a valid credit event.
    mapping(bytes32 => bool) public supportedEventSignatures;

    /// @notice Addresses authorized to slash credit scores (e.g. WikshiLend on liquidation).
    mapping(address => bool) public authorizedSlashers;

    /// @notice Allowlist of approved source contracts whose logs are trusted, scoped per chain.
    /// @dev Maps (chainKey => source contract address => approved).
    ///      Only logs emitted by approved contracts on the specific source chain are accepted.
    ///      Prevents spoofed events from CREATE2-deployed contracts on other chains.
    mapping(uint64 => mapping(address => bool)) public approvedSourceContracts;

    /// @notice Per-token decimals for approved source contracts.
    /// @dev Maps (chainKey => source contract => token address => decimals).
    ///      Multi-asset protocols handle tokens with different decimals through one contract.
    ///      Use token=address(0) as a contract-level default for single-asset protocols.
    ///      Decimals MUST be explicitly set (>0); unset decimals (0) will revert.
    mapping(uint64 => mapping(address => mapping(address => uint8))) public sourceTokenDecimals;

    /// @notice The ChainInfo precompile instance (0x0FD3).
    /// @dev Exposes USC attestation state: supported chains, attested heights, continuity bounds.
    ///      Used alongside 0x0FD2 (NativeQueryVerifier) — 0x0FD2 verifies proofs, 0x0FD3 queries state.
    IChainInfoPrecompile public immutable CHAIN_INFO;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiCreditOracle__NotOperator();
    error WikshiCreditOracle__ScoreExceedsMax();
    error WikshiCreditOracle__CooldownActive();
    error WikshiCreditOracle__ZeroAddress();
    error WikshiCreditOracle__UnsupportedTxType();
    error WikshiCreditOracle__TxFailed();
    error WikshiCreditOracle__NoPaymentEvents();
    error WikshiCreditOracle__PaymentBelowMinimum();
    error WikshiCreditOracle__InvalidAction();
    error WikshiCreditOracle__NotAuthorizedSlasher();
    error WikshiCreditOracle__UnapprovedSourceContract();
    error WikshiCreditOracle__DecimalsNotConfigured();

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOracleOperator() {
        if (msg.sender != oracleOperator) revert WikshiCreditOracle__NotOperator();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param initialOwner The initial owner (should be multisig for mainnet).
    /// @param operator The initial oracle operator address.
    constructor(address initialOwner, address operator) Ownable(initialOwner) {
        if (operator == address(0)) revert WikshiCreditOracle__ZeroAddress();
        oracleOperator = operator;
        CHAIN_INFO = ChainInfoLib.getChainInfo();

        // Register supported event signatures for credit recognition.
        // Only PaymentTracker and Gluwa Loan.sol events are registered by default.
        // DeFi protocol events (Aave, Compound) are excluded because they can be manufactured
        // cheaply via flash loans to farm credit scores without genuine credit activity.
        supportedEventSignatures[PAYMENT_MADE_SIGNATURE] = true;

        // Register Gluwa CCNext Loan.sol actual event selectors (from CreditScore.sol)
        supportedEventSignatures[GLUWA_FUND_LOAN_SELECTOR] = true;
        supportedEventSignatures[GLUWA_REPAY_LOAN_SELECTOR] = true;
        supportedEventSignatures[GLUWA_LATE_REPAYMENT_SELECTOR] = true;
        supportedEventSignatures[GLUWA_EXPIRED_LOAN_SELECTOR] = true;
    }

    /*//////////////////////////////////////////////////////////////
                    USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiCreditOracle
    /// @dev Source A: Off-chain operator submits scores derived from Credal/Creditcoin data.
    ///      Honors Tae Oh's design: "different lenders, different models" — the model is off-chain,
    ///      the oracle just stores the result.
    function submitCreditScore(address borrower, uint256 score) external nonReentrant onlyOracleOperator {
        if (borrower == address(0)) revert WikshiCreditOracle__ZeroAddress();
        if (score > MAX_SCORE) revert WikshiCreditOracle__ScoreExceedsMax();
        if (block.timestamp - lastScoreUpdate[borrower] < MIN_UPDATE_INTERVAL) {
            revert WikshiCreditOracle__CooldownActive();
        }

        creditScores[borrower] = score;
        lastScoreUpdate[borrower] = block.timestamp;

        emit CreditScoreUpdated(borrower, score, "operator");
    }

    /// @notice Register or unregister an event signature for multi-protocol credit recognition.
    /// @param signature The event signature hash.
    /// @param supported Whether the signature should be recognized.
    function setSupportedEventSignature(bytes32 signature, bool supported) external onlyOwner {
        supportedEventSignatures[signature] = supported;
        emit SupportedEventSignatureUpdated(signature, supported);
    }

    /// @notice Updates the oracle operator address.
    function setOracleOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert WikshiCreditOracle__ZeroAddress();
        address oldOperator = oracleOperator;
        oracleOperator = newOperator;
        emit OracleOperatorUpdated(oldOperator, newOperator);
    }

    /// @inheritdoc IWikshiCreditOracle
    function setAuthorizedSlasher(address slasher, bool authorized) external onlyOwner {
        if (slasher == address(0)) revert WikshiCreditOracle__ZeroAddress();
        authorizedSlashers[slasher] = authorized;
        emit SlasherUpdated(slasher, authorized);
    }

    /// @notice Approve or revoke a source contract for USC event validation, scoped to a specific chain.
    /// @dev Per-chain scoping prevents cross-chain address collision attacks.
    ///      A contract approved on Ethereum (chainKey=1) is NOT automatically trusted on Polygon (chainKey=137).
    /// @param chainKey The USC chain key the source contract belongs to.
    /// @param sourceContract The contract address on the source chain.
    /// @param approved Whether the contract is approved.
    function setApprovedSourceContract(uint64 chainKey, address sourceContract, bool approved) external onlyOwner {
        if (sourceContract == address(0)) revert WikshiCreditOracle__ZeroAddress();
        approvedSourceContracts[chainKey][sourceContract] = approved;
        emit ApprovedSourceContractUpdated(chainKey, sourceContract, approved);
    }

    /// @notice Set expected token decimals for a specific token on a source contract.
    /// @dev Multi-asset protocols handle tokens with different decimals through one contract.
    ///      Use the actual token address for per-token decimals (e.g., USDT address → 6, WETH address → 18).
    ///      Use token=address(0) as a contract-level default for single-asset protocols.
    ///      Decimals MUST be > 0; the oracle will revert on events with unconfigured decimals.
    /// @param chainKey The USC chain key.
    /// @param sourceContract The contract address on the source chain.
    /// @param token The underlying token address (address(0) for contract-level default).
    /// @param decimals The token decimals (must be > 0).
    function setSourceTokenDecimals(uint64 chainKey, address sourceContract, address token, uint8 decimals) external onlyOwner {
        if (sourceContract == address(0)) revert WikshiCreditOracle__ZeroAddress();
        if (decimals == 0) revert WikshiCreditOracle__DecimalsNotConfigured();
        sourceTokenDecimals[chainKey][sourceContract][token] = decimals;
    }

    /// @inheritdoc IWikshiCreditOracle
    /// @dev 3Jane-inspired credit slashing: liquidation → score penalty.
    ///      Gives credit data economic teeth — bad behavior has consequences.
    function slashScore(address borrower) external {
        if (!authorizedSlashers[msg.sender]) revert WikshiCreditOracle__NotAuthorizedSlasher();
        uint256 current = creditScores[borrower];
        creditScores[borrower] = current > SLASH_PENALTY ? current - SLASH_PENALTY : 0;
        lastScoreUpdate[borrower] = block.timestamp;
        emit CreditScoreUpdated(borrower, creditScores[borrower], "slash");
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiCreditOracle
    /// @dev Returns score with time-based decay applied. After DECAY_GRACE_PERIOD of inactivity,
    ///      score decays by DECAY_RATE_PER_DAY per day. VIEW-only computation — no gas cost.
    function getCreditScore(address borrower) external view returns (uint256) {
        return _getDecayedScore(borrower);
    }

    /// @inheritdoc IWikshiCreditOracle
    function getRawCreditScore(address borrower) external view returns (uint256) {
        return creditScores[borrower];
    }

    /// @inheritdoc IWikshiCreditOracle
    /// @dev Uses decayed score — inactive borrowers lose tier status over time.
    ///      This ensures tiers reflect current creditworthiness, not historical peaks.
    function getTrustTier(address borrower) external view returns (TrustTier) {
        uint256 score = _getDecayedScore(borrower);
        uint256 payments = paymentCount[borrower];

        if (score >= 700 && payments >= 20) return TrustTier.Trusted;
        if (score >= 400 && payments >= 10) return TrustTier.Established;
        if (score > 0 || payments > 0) return TrustTier.Basic;
        return TrustTier.Unverified;
    }

    /// @inheritdoc IWikshiCreditOracle
    function getPaymentCount(address borrower) external view returns (uint256) {
        return paymentCount[borrower];
    }

    /*//////////////////////////////////////////////////////////////
                  CHAIN INFO (0x0FD3 PRECOMPILE VIEWS)
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns all source chains supported by the USC bridge.
    /// @dev Queries ChainInfoPrecompile at 0x0FD3. Only callable on Creditcoin.
    function getSupportedChains() external view returns (IChainInfoPrecompile.ChainInfo[] memory) {
        return CHAIN_INFO.get_supported_chains();
    }

    /// @notice Checks whether a specific block height on a source chain has been attested.
    /// @dev Useful for off-chain workers to verify attestation status before submitting proofs.
    /// @param chainKey The Creditcoin-internal identifier for the source chain.
    /// @param blockHeight The block number to check.
    /// @return True if the height has been attested by the USC bridge.
    function isChainHeightAttested(uint64 chainKey, uint64 blockHeight) external view returns (bool) {
        return CHAIN_INFO.is_height_attested(chainKey, blockHeight);
    }

    /// @notice Returns the latest attested block height and hash for a source chain.
    /// @dev Off-chain workers use this to know how far the attestation frontier has advanced.
    /// @param chainKey The source chain identifier.
    /// @return height The latest attested block number.
    /// @return blockHash The block hash at that height.
    /// @return exists False if no attestations exist yet for this chain.
    function getLatestAttestation(uint64 chainKey) external view returns (uint64 height, bytes32 blockHash, bool exists) {
        IChainInfoPrecompile.HeightHashResult memory result = CHAIN_INFO.get_latest_attestation_height_and_hash(chainKey);
        return (result.height, result.hash, result.exists);
    }

    /// @notice Returns chain info for a given chainKey.
    /// @dev Validates that a chainKey is recognized by the USC bridge before proof submission.
    /// @param chainKey The source chain identifier.
    /// @return chainId The EVM chain ID (e.g. 1 for Ethereum, 11155111 for Sepolia).
    /// @return exists False if the chain is not supported.
    function getChainInfo(uint64 chainKey) external view returns (uint64 chainId, bool exists) {
        IChainInfoPrecompile.ChainInfoResult memory result = CHAIN_INFO.get_chain_by_key(chainKey);
        return (result.info.chainId, result.exists);
    }

    /*//////////////////////////////////////////////////////////////
                    INTERNAL STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Source B: Called by USCBase.execute() after proof verification succeeds.
    ///      Decodes the cross-chain transaction, extracts credit-relevant events,
    ///      and updates the borrower's credit score.
    ///      Supports PaymentTracker and Gluwa Loan.sol events only.
    ///      Pattern: USCLoanManager.sol from gluwa/usc-testnet-bridge-examples.
    ///
    ///      Security properties:
    ///      - Worst-action-wins: negative events (LoanExpired, LoanLateRepayment) checked BEFORE
    ///        positive events to prevent masking defaults with bundled positive events.
    ///      - Only PaymentTracker + Gluwa events recognized (DeFi events excluded — flash loan risk).
    ///      - log.address_ validated against per-chain approvedSourceContracts allowlist.
    ///      - Action is DERIVED from event type — caller cannot choose action.
    ///      - MIN_UPDATE_INTERVAL cooldown is enforced for USC-based updates.
    function _processAndEmitEvent(
        uint8, /* action — IGNORED, derived from event type */
        bytes32,
        bytes memory encodedTransaction,
        uint64 chainKey
    ) internal override {
        // 1. Validate transaction type (reuse EvmV1Decoder from Gluwa)
        uint8 txType = EvmV1Decoder.getTransactionType(encodedTransaction);
        if (!EvmV1Decoder.isValidTransactionType(txType)) {
            revert WikshiCreditOracle__UnsupportedTxType();
        }

        // 2. Decode receipt and check success (precompile does NOT check this!)
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        if (receipt.receiptStatus != 1) revert WikshiCreditOracle__TxFailed();

        // 3. Search for supported credit events in receipt logs.
        //    Worst-action-wins: negative events checked first so they cannot be masked
        //    by positive events bundled in the same cross-chain transaction receipt.
        EvmV1Decoder.LogEntry[] memory creditLogs;

        // --- NEGATIVE EVENTS (checked first — worst action wins) ---

        // Gluwa: LoanExpired — action=2 (default, MOST SEVERE)
        if (supportedEventSignatures[GLUWA_EXPIRED_LOAN_SELECTOR]) {
            creditLogs = EvmV1Decoder.getLogsByEventSignature(receipt, GLUWA_EXPIRED_LOAN_SELECTOR);
            if (creditLogs.length > 0) {
                _validateSourceContract(creditLogs[0], chainKey);
                _processGluwaLateOrExpired(creditLogs[0], 2);
                return;
            }
        }

        // Gluwa: LoanLateRepayment — action=1 (late, SECOND MOST SEVERE)
        if (supportedEventSignatures[GLUWA_LATE_REPAYMENT_SELECTOR]) {
            creditLogs = EvmV1Decoder.getLogsByEventSignature(receipt, GLUWA_LATE_REPAYMENT_SELECTOR);
            if (creditLogs.length > 0) {
                _validateSourceContract(creditLogs[0], chainKey);
                _processGluwaLateOrExpired(creditLogs[0], 1);
                return;
            }
        }

        // --- POSITIVE EVENTS (only processed if NO negative events found) ---

        // PaymentMade (our native format) — action=0 (on-time payment)
        // PaymentMade(address indexed borrower, ...) — borrower at topics[1]
        // Single-asset per PaymentTracker → token=address(0) (contract-level default)
        if (supportedEventSignatures[PAYMENT_MADE_SIGNATURE]) {
            creditLogs = EvmV1Decoder.getLogsByEventSignature(receipt, PAYMENT_MADE_SIGNATURE);
            if (creditLogs.length > 0) {
                _validateAndProcessPaymentEvent(creditLogs[0], 0, 1, chainKey, address(0));
                return;
            }
        }

        // Gluwa: LoanRepaid — action=0 (positive signal)
        // Single-asset per Loan contract → token=address(0)
        if (supportedEventSignatures[GLUWA_REPAY_LOAN_SELECTOR]) {
            creditLogs = EvmV1Decoder.getLogsByEventSignature(receipt, GLUWA_REPAY_LOAN_SELECTOR);
            if (creditLogs.length > 0) {
                _validateAndProcessGluwaLoanEvent(creditLogs[0], 0, 2, chainKey, address(0));
                return;
            }
        }

        // Gluwa: LoanFundInitiated — action=0 (positive signal, initializes credit)
        if (supportedEventSignatures[GLUWA_FUND_LOAN_SELECTOR]) {
            creditLogs = EvmV1Decoder.getLogsByEventSignature(receipt, GLUWA_FUND_LOAN_SELECTOR);
            if (creditLogs.length > 0) {
                _validateAndProcessGluwaLoanEvent(creditLogs[0], 0, 3, chainKey, address(0));
                return;
            }
        }

        // No supported events found
        revert WikshiCreditOracle__NoPaymentEvents();
    }

    /// @dev Validates that a log was emitted by an approved source contract on the given chain.
    ///      Per-chain scoping prevents CREATE2 address collision attacks.
    /// @param log The decoded log entry from the cross-chain transaction.
    /// @param chainKey The USC chain key identifying which source chain the proof came from.
    function _validateSourceContract(EvmV1Decoder.LogEntry memory log, uint64 chainKey) internal view {
        if (!approvedSourceContracts[chainKey][log.address_]) {
            revert WikshiCreditOracle__UnapprovedSourceContract();
        }
    }

    /// @dev Validates source contract (per-chain) then processes a payment event.
    /// @param borrowerTopicIdx The index in log.topics where borrower address is located.
    /// @param token The underlying token address for per-token decimals lookup (address(0) for single-asset).
    function _validateAndProcessPaymentEvent(EvmV1Decoder.LogEntry memory log, uint8 action, uint256 borrowerTopicIdx, uint64 chainKey, address token) internal {
        _validateSourceContract(log, chainKey);
        _processPaymentEvent(log, action, borrowerTopicIdx, chainKey, token);
    }

    /// @dev Validates source contract (per-chain) then processes a Gluwa loan event.
    /// @param token The underlying token address for per-token decimals lookup (address(0) for single-asset).
    function _validateAndProcessGluwaLoanEvent(EvmV1Decoder.LogEntry memory log, uint8 action, uint256 borrowerTopicIdx, uint64 chainKey, address token) internal {
        _validateSourceContract(log, chainKey);
        _processGluwaLoanEvent(log, action, borrowerTopicIdx, chainKey, token);
    }

    /// @dev Processes a single payment event and adjusts the borrower's credit score.
    ///      Scoring model inspired by Gluwa's CreditScore.sol (4 actions: fund, repay, late, expired).
    ///      We expand to 3 actions with tiered amount scaling.
    /// @param borrowerTopicIdx The index in log.topics where the borrower address is located.
    ///        Different protocols place the borrower at different topic indices.
    function _processPaymentEvent(EvmV1Decoder.LogEntry memory log, uint8 action, uint256 borrowerTopicIdx, uint64 chainKey, address token) internal {
        // Validate topic length (USCMinter pattern: check before accessing topics)
        require(log.topics.length > borrowerTopicIdx, "Invalid log: insufficient topics for borrower index");
        // Extract borrower from the protocol-specific indexed topic
        address borrower = address(uint160(uint256(log.topics[borrowerTopicIdx])));

        // Enforce cooldown for USC-based updates
        if (block.timestamp - lastScoreUpdate[borrower] < MIN_UPDATE_INTERVAL) {
            revert WikshiCreditOracle__CooldownActive();
        }

        // Extract amount from event data (first 32 bytes = amount)
        uint256 amount;
        if (log.data.length >= 32) {
            amount = abi.decode(log.data, (uint256));
        }

        // Normalize amount to 6 decimals using per-token decimals configuration.
        amount = _normalizeAmountToUsd6(amount, chainKey, log.address_, token);

        if (amount < MIN_PAYMENT_AMOUNT) revert WikshiCreditOracle__PaymentBelowMinimum();

        // Initialize score if first interaction (same as Gluwa: initial = 300)
        if (creditScores[borrower] == 0) {
            creditScores[borrower] = INITIAL_SCORE;
        }

        // Action-based scoring (inspired by Gluwa's 4-action model, expanded)
        if (action == 0) {
            // On-time payment → score increase (tiered amount scaling)
            uint256 increment = _calculateIncrement(amount);
            uint256 newScore = creditScores[borrower] + increment;
            creditScores[borrower] = newScore > MAX_SCORE ? MAX_SCORE : newScore;
            paymentCount[borrower]++;
        } else if (action == 1) {
            // Late payment → score decrease, but still counts as a payment made
            creditScores[borrower] = creditScores[borrower] > 50
                ? creditScores[borrower] - 50
                : 0;
            paymentCount[borrower]++;
        } else if (action == 2) {
            // Default → large score decrease
            creditScores[borrower] = creditScores[borrower] > 200
                ? creditScores[borrower] - 200
                : 0;
        } else {
            revert WikshiCreditOracle__InvalidAction();
        }

        lastScoreUpdate[borrower] = block.timestamp;

        emit CreditScoreUpdated(borrower, creditScores[borrower], "usc");
    }

    /*//////////////////////////////////////////////////////////////
                      INTERNAL READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Processes a Gluwa Loan.sol event where borrower is at a non-standard topic index.
    ///      Gluwa events have bytes32 indexed loanHash at index 1, borrower at borrowerTopicIdx.
    ///      This handles LoanFundInitiated (borrower at index 3) and LoanRepaid (borrower at index 2).
    function _processGluwaLoanEvent(EvmV1Decoder.LogEntry memory log, uint8 action, uint256 borrowerTopicIdx, uint64 chainKey, address token) internal {
        require(log.topics.length > borrowerTopicIdx, "Invalid Gluwa log: insufficient topics");
        address borrower = address(uint160(uint256(log.topics[borrowerTopicIdx])));

        // Enforce cooldown for USC-based updates
        if (block.timestamp - lastScoreUpdate[borrower] < MIN_UPDATE_INTERVAL) {
            revert WikshiCreditOracle__CooldownActive();
        }

        // Extract amount from event data (first 32 bytes)
        uint256 amount;
        if (log.data.length >= 32) {
            amount = abi.decode(log.data, (uint256));
        }

        // Normalize amount to 6 decimals
        amount = _normalizeAmountToUsd6(amount, chainKey, log.address_, token);

        if (amount < MIN_PAYMENT_AMOUNT) revert WikshiCreditOracle__PaymentBelowMinimum();

        if (creditScores[borrower] == 0) {
            creditScores[borrower] = INITIAL_SCORE;
        }

        if (action == 0) {
            uint256 increment = _calculateIncrement(amount);
            uint256 newScore = creditScores[borrower] + increment;
            creditScores[borrower] = newScore > MAX_SCORE ? MAX_SCORE : newScore;
            paymentCount[borrower]++;
        } else if (action == 1) {
            creditScores[borrower] = creditScores[borrower] > 50
                ? creditScores[borrower] - 50
                : 0;
            paymentCount[borrower]++;
        } else if (action == 2) {
            creditScores[borrower] = creditScores[borrower] > 200
                ? creditScores[borrower] - 200
                : 0;
        } else {
            revert WikshiCreditOracle__InvalidAction();
        }

        lastScoreUpdate[borrower] = block.timestamp;
        emit CreditScoreUpdated(borrower, creditScores[borrower], "usc-gluwa");
    }

    /// @dev Processes Gluwa LoanLateRepayment/LoanExpired events (no amount data).
    ///      These events only contain borrower address — hardcoded action mapping.
    function _processGluwaLateOrExpired(EvmV1Decoder.LogEntry memory log, uint8 action) internal {
        // LoanLateRepayment(bytes32 indexed loanHash, address indexed borrower): borrower at topics[2]
        // LoanExpired(bytes32 indexed loanHash, address indexed borrower): borrower at topics[2]
        uint256 borrowerIdx = log.topics.length >= 3 ? 2 : 1;
        address borrower = address(uint160(uint256(log.topics[borrowerIdx])));

        // Enforce cooldown for USC-based updates
        if (block.timestamp - lastScoreUpdate[borrower] < MIN_UPDATE_INTERVAL) {
            revert WikshiCreditOracle__CooldownActive();
        }

        if (creditScores[borrower] == 0) {
            creditScores[borrower] = INITIAL_SCORE;
        }

        if (action == 1) {
            // Late repayment: -50 points, still counts as payment
            creditScores[borrower] = creditScores[borrower] > 50
                ? creditScores[borrower] - 50
                : 0;
            paymentCount[borrower]++;
        } else {
            // Expired/default: -200 points
            creditScores[borrower] = creditScores[borrower] > 200
                ? creditScores[borrower] - 200
                : 0;
        }

        lastScoreUpdate[borrower] = block.timestamp;
        emit CreditScoreUpdated(borrower, creditScores[borrower], "usc-gluwa");
    }

    /// @dev Returns the credit score with time-based decay applied.
    ///      Shared by getCreditScore() and getTrustTier() to ensure consistency.
    function _getDecayedScore(address borrower) internal view returns (uint256) {
        uint256 rawScore = creditScores[borrower];
        if (rawScore == 0) return 0;

        uint256 lastUpdate = lastScoreUpdate[borrower];
        if (lastUpdate == 0 || block.timestamp <= lastUpdate + DECAY_GRACE_PERIOD) {
            return rawScore;
        }

        uint256 daysSinceGrace = (block.timestamp - lastUpdate - DECAY_GRACE_PERIOD) / 1 days;
        uint256 decay = daysSinceGrace * DECAY_RATE_PER_DAY;
        return decay >= rawScore ? 0 : rawScore - decay;
    }

    /// @dev Normalizes a cross-chain event amount to 6 decimals using per-token decimals.
    ///      Uses (chainKey, sourceContract, token) for lookup; falls back to (chainKey, sourceContract, address(0))
    ///      for single-asset contracts. Reverts if decimals are not configured.
    /// @param amount The raw amount from the cross-chain event.
    /// @param chainKey The source chain key.
    /// @param sourceContract The emitting contract address.
    /// @param token The underlying token address (e.g., Aave reserve). address(0) for single-asset.
    /// @return The amount normalized to 6 decimals.
    function _normalizeAmountToUsd6(uint256 amount, uint64 chainKey, address sourceContract, address token) internal view returns (uint256) {
        // Try per-token decimals first (multi-asset protocols like Aave)
        uint8 decimals = sourceTokenDecimals[chainKey][sourceContract][token];
        // Fall back to contract-level default (single-asset protocols)
        if (decimals == 0 && token != address(0)) {
            decimals = sourceTokenDecimals[chainKey][sourceContract][address(0)];
        }
        // SECURITY: Unset decimals (0) is invalid — revert to prevent score farming
        if (decimals == 0) revert WikshiCreditOracle__DecimalsNotConfigured();

        if (decimals == 6) return amount;
        if (decimals > 6) {
            return amount / (10 ** (decimals - 6));
        } else {
            return amount * (10 ** (6 - decimals));
        }
    }

    /// @dev Calculates score increment based on payment amount (tiered step function).
    ///      Amounts are expected to be normalized to 6 decimals.
    ///      Larger payments give diminishing returns to prevent gaming via single large transfers.
    function _calculateIncrement(uint256 amount) internal pure returns (uint256) {
        if (amount >= 1000e6) return 30; // $1000+: 30 points
        if (amount >= 100e6) return 20;  // $100-$999: 20 points
        return 10;                        // $1-$99: 10 points
    }
}
