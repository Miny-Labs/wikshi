// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IWikshiReceivable} from "contracts/interfaces/IWikshiReceivable.sol";
import {IWikshiCreditOracle} from "contracts/interfaces/IWikshiCreditOracle.sol";

/// @title WikshiReceivable
/// @notice ERC-721 tokenized loan receivables — the RWA primitive of the Wikshi ecosystem.
/// @dev Each NFT represents a lender's right to receive repayment from a funded loan.
///      Receivables can be deposited as collateral in Wikshi lending markets via WikshiReceivableWrapper,
///      giving lenders immediate liquidity against their locked loan positions.
///
///      Integration with Creditcoin's infrastructure:
///      - Source loans originate on external chains (Ethereum, Creditcoin Substrate) via Gluwa's Loan.sol
///      - Funding is verified cross-chain via USC Merkle proofs (0x0FD2 precompile)
///      - Borrower credit scores from WikshiCreditOracle affect receivable valuation
///      - Repayment/default events flow back via USC, updating receivable status
///
///      This creates the full RWA cycle: real-world loan → tokenized receivable → DeFi collateral.
/// @custom:security-contact security@wikshi.xyz
contract WikshiReceivable is IWikshiReceivable, ERC721Enumerable, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Basis points denominator (100% = 10000).
    uint256 public constant BPS = 10000;

    /// @notice Maximum interest rate (100% APR in basis points).
    uint256 public constant MAX_INTEREST_RATE = 10000;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Credit oracle for borrower score lookups.
    IWikshiCreditOracle public creditOracle;

    /// @notice Next token ID to mint.
    uint256 public nextTokenId;

    /// @notice Loan data per token ID.
    mapping(uint256 => LoanData) internal _loanData;

    /// @notice Prevents duplicate minting for the same source loan.
    mapping(bytes32 => bool) public sourceLoanMinted;

    /// @notice Authorized minters (operator, USC bridge, or WikshiLend).
    mapping(address => bool) public authorizedMinters;

    /// @notice Authorized status updaters (operator for repayment/default recording).
    mapping(address => bool) public authorizedUpdaters;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiReceivable__ZeroAddress();
    error WikshiReceivable__Unauthorized();
    error WikshiReceivable__InvalidMaturity();
    error WikshiReceivable__InvalidRate();
    error WikshiReceivable__ZeroPrincipal();
    error WikshiReceivable__DuplicateLoan();
    error WikshiReceivable__InvalidStatus();
    error WikshiReceivable__ExcessRepayment();
    error WikshiReceivable__NotRepaid();

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAuthorizedMinter() {
        if (!authorizedMinters[msg.sender] && msg.sender != owner()) revert WikshiReceivable__Unauthorized();
        _;
    }

    modifier onlyAuthorizedUpdater() {
        if (!authorizedUpdaters[msg.sender] && msg.sender != owner()) revert WikshiReceivable__Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address initialOwner,
        address creditOracle_
    ) ERC721("Wikshi Loan Receivable", "wREC") Ownable(initialOwner) {
        if (creditOracle_ == address(0)) revert WikshiReceivable__ZeroAddress();
        creditOracle = IWikshiCreditOracle(creditOracle_);
        nextTokenId = 1; // Start at 1 (0 is reserved as null)
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorize or revoke a minter address.
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert WikshiReceivable__ZeroAddress();
        authorizedMinters[minter] = authorized;
    }

    /// @notice Authorize or revoke an updater address.
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        if (updater == address(0)) revert WikshiReceivable__ZeroAddress();
        authorizedUpdaters[updater] = authorized;
    }

    /// @notice Update the credit oracle address.
    function setCreditOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert WikshiReceivable__ZeroAddress();
        creditOracle = IWikshiCreditOracle(newOracle);
    }

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiReceivable
    function mintReceivable(
        address lender,
        address borrower,
        address loanToken,
        uint256 principal,
        uint256 interestRate,
        uint256 maturityAt,
        bytes32 sourceLoanHash,
        uint64 sourceChainKey
    ) external onlyAuthorizedMinter returns (uint256 tokenId) {
        // Validation
        if (lender == address(0) || borrower == address(0) || loanToken == address(0)) {
            revert WikshiReceivable__ZeroAddress();
        }
        if (principal == 0) revert WikshiReceivable__ZeroPrincipal();
        if (interestRate > MAX_INTEREST_RATE) revert WikshiReceivable__InvalidRate();
        if (maturityAt <= block.timestamp) revert WikshiReceivable__InvalidMaturity();
        if (sourceLoanMinted[sourceLoanHash]) revert WikshiReceivable__DuplicateLoan();

        // Calculate expected repayment: principal + (principal * rate * duration / (BPS * 365 days))
        uint256 duration = maturityAt - block.timestamp;
        uint256 interest = (principal * interestRate * duration) / (BPS * 365 days);
        uint256 expectedRepayment = principal + interest;

        // Mint
        tokenId = nextTokenId++;
        sourceLoanMinted[sourceLoanHash] = true;

        _loanData[tokenId] = LoanData({
            borrower: borrower,
            loanToken: loanToken,
            principal: principal,
            interestRate: interestRate,
            expectedRepayment: expectedRepayment,
            fundedAt: block.timestamp,
            maturityAt: maturityAt,
            sourceLoanHash: sourceLoanHash,
            sourceChainKey: sourceChainKey,
            status: ReceivableStatus.Active,
            repaidAmount: 0
        });

        _mint(lender, tokenId);

        emit ReceivableMinted(
            tokenId, lender, borrower, principal,
            expectedRepayment, maturityAt, sourceLoanHash
        );
    }

    /// @inheritdoc IWikshiReceivable
    function recordRepayment(uint256 tokenId, uint256 amount) external onlyAuthorizedUpdater {
        LoanData storage loan = _loanData[tokenId];
        if (loan.status != ReceivableStatus.Active && loan.status != ReceivableStatus.PartiallyRepaid) {
            revert WikshiReceivable__InvalidStatus();
        }
        if (loan.repaidAmount + amount > loan.expectedRepayment) {
            revert WikshiReceivable__ExcessRepayment();
        }

        ReceivableStatus oldStatus = loan.status;
        loan.repaidAmount += amount;

        if (loan.repaidAmount >= loan.expectedRepayment) {
            loan.status = ReceivableStatus.Repaid;
        } else {
            loan.status = ReceivableStatus.PartiallyRepaid;
        }

        emit RepaymentRecorded(tokenId, amount, loan.repaidAmount);
        if (loan.status != oldStatus) {
            emit ReceivableStatusUpdated(tokenId, oldStatus, loan.status);
        }
    }

    /// @inheritdoc IWikshiReceivable
    function markDefaulted(uint256 tokenId) external onlyAuthorizedUpdater {
        LoanData storage loan = _loanData[tokenId];
        if (loan.status != ReceivableStatus.Active && loan.status != ReceivableStatus.PartiallyRepaid) {
            revert WikshiReceivable__InvalidStatus();
        }

        ReceivableStatus oldStatus = loan.status;
        loan.status = ReceivableStatus.Defaulted;
        emit ReceivableStatusUpdated(tokenId, oldStatus, ReceivableStatus.Defaulted);
    }

    /// @inheritdoc IWikshiReceivable
    /// @dev Burns the receivable NFT. Actual repayment claim is handled off-chain or via wrapper.
    function redeem(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert WikshiReceivable__Unauthorized();
        if (_loanData[tokenId].status != ReceivableStatus.Repaid) revert WikshiReceivable__NotRepaid();

        uint256 repaidAmount = _loanData[tokenId].repaidAmount;
        _burn(tokenId);

        emit ReceivableRedeemed(tokenId, msg.sender, repaidAmount);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IWikshiReceivable
    function getLoanData(uint256 tokenId) external view returns (LoanData memory) {
        return _loanData[tokenId];
    }

    /// @inheritdoc IWikshiReceivable
    /// @dev Value = expectedRepayment * creditMultiplier * timeDiscount
    ///      creditMultiplier: borrower score 0→50%, 500→75%, 1000→100% recovery expectation
    ///      timeDiscount: closer to maturity → higher value (linear from 85% at funding to 100% at maturity)
    function getReceivableValue(uint256 tokenId) external view returns (uint256) {
        LoanData memory loan = _loanData[tokenId];

        // Defaulted or liquidated receivables have value = repaidAmount only
        if (loan.status == ReceivableStatus.Defaulted || loan.status == ReceivableStatus.Liquidated) {
            return loan.repaidAmount;
        }

        // Fully repaid = face value
        if (loan.status == ReceivableStatus.Repaid) {
            return loan.expectedRepayment;
        }

        // Active/PartiallyRepaid: DCF-style valuation
        uint256 outstanding = loan.expectedRepayment - loan.repaidAmount;

        // Credit multiplier: score/1000 scaled between 50% and 100%
        // multiplier = 5000 + (score * 5000 / 1000) in BPS
        uint256 score = creditOracle.getCreditScore(loan.borrower);
        uint256 creditMultiplier = 5000 + (score * 5000 / 1000); // 5000-10000 BPS (50%-100%)

        // Time discount: linear from 85% at funding to 100% at maturity
        uint256 timeDiscount;
        if (block.timestamp >= loan.maturityAt) {
            timeDiscount = BPS; // 100% — at or past maturity
        } else {
            uint256 totalDuration = loan.maturityAt - loan.fundedAt;
            uint256 elapsed = block.timestamp - loan.fundedAt;
            // discount = 8500 + (elapsed * 1500 / totalDuration) → range [8500, 10000] BPS
            timeDiscount = 8500 + (elapsed * 1500 / totalDuration);
        }

        // value = outstanding * creditMultiplier * timeDiscount / (BPS * BPS)
        // Add back already-repaid amount at face value
        uint256 outstandingValue = (outstanding * creditMultiplier * timeDiscount) / (BPS * BPS);
        return loan.repaidAmount + outstandingValue;
    }

    /// @inheritdoc IWikshiReceivable
    function totalReceivables() external view returns (uint256) {
        return nextTokenId - 1;
    }

    /*//////////////////////////////////////////////////////////////
                           ERC721 OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @dev Required override for ERC721Enumerable.
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    /// @dev Required override for ERC721Enumerable.
    function _increaseBalance(address account, uint128 value) internal override(ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    /// @dev Required override for ERC721Enumerable.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
