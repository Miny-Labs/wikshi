// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IWikshiReceivable
/// @notice Interface for tokenized loan receivables — the RWA primitive of the Wikshi ecosystem.
/// @dev Each receivable represents a lender's right to receive repayment from a funded loan.
///      Receivables are ERC-721 tokens that can be wrapped into ERC-20 and used as collateral
///      in Wikshi lending markets, unlocking liquidity for lenders without waiting for maturity.
/// @custom:security-contact security@wikshi.xyz
interface IWikshiReceivable {
    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    /// @notice Lifecycle state of a receivable.
    enum ReceivableStatus {
        Active,         // Loan funded, awaiting repayment
        Repaid,         // Borrower repaid in full
        PartiallyRepaid,// Partial repayment received
        Defaulted,      // Loan expired / borrower defaulted
        Liquidated      // Receivable was seized in Wikshi liquidation
    }

    /*//////////////////////////////////////////////////////////////
                               STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Core loan data embedded in each receivable NFT.
    struct LoanData {
        address borrower;           // The borrower who owes repayment
        address loanToken;          // Token denomination (e.g., USDT)
        uint256 principal;          // Original loan amount
        uint256 interestRate;       // Annual rate in basis points (e.g., 1500 = 15%)
        uint256 expectedRepayment;  // Principal + interest at maturity
        uint256 fundedAt;           // Timestamp when loan was funded
        uint256 maturityAt;         // Timestamp when repayment is due
        bytes32 sourceLoanHash;     // Hash identifying the source loan (Gluwa Loan.sol / DealOrder)
        uint64 sourceChainKey;      // USC chain key of the source chain
        ReceivableStatus status;    // Current lifecycle state
        uint256 repaidAmount;       // Amount repaid so far
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ReceivableMinted(
        uint256 indexed tokenId,
        address indexed lender,
        address indexed borrower,
        uint256 principal,
        uint256 expectedRepayment,
        uint256 maturityAt,
        bytes32 sourceLoanHash
    );

    event ReceivableStatusUpdated(uint256 indexed tokenId, ReceivableStatus oldStatus, ReceivableStatus newStatus);
    event RepaymentRecorded(uint256 indexed tokenId, uint256 amount, uint256 totalRepaid);
    event ReceivableRedeemed(uint256 indexed tokenId, address indexed holder, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the full loan data for a receivable token.
    function getLoanData(uint256 tokenId) external view returns (LoanData memory);

    /// @notice Returns the current estimated value of a receivable (used by oracle).
    /// @dev Value = expectedRepayment * creditMultiplier * timeDiscount.
    function getReceivableValue(uint256 tokenId) external view returns (uint256);

    /// @notice Returns total count of receivables minted.
    function totalReceivables() external view returns (uint256);

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Mint a receivable NFT representing a funded loan.
    /// @param lender The address receiving the receivable (the original lender).
    /// @param borrower The borrower who owes repayment.
    /// @param loanToken Token denomination of the loan.
    /// @param principal Original loan amount.
    /// @param interestRate Annual interest rate in basis points.
    /// @param maturityAt Timestamp when repayment is due.
    /// @param sourceLoanHash Unique identifier of the source loan.
    /// @param sourceChainKey USC chain key where the loan originated.
    function mintReceivable(
        address lender,
        address borrower,
        address loanToken,
        uint256 principal,
        uint256 interestRate,
        uint256 maturityAt,
        bytes32 sourceLoanHash,
        uint64 sourceChainKey
    ) external returns (uint256 tokenId);

    /// @notice Record a repayment against a receivable (operator or USC-verified).
    function recordRepayment(uint256 tokenId, uint256 amount) external;

    /// @notice Mark a receivable as defaulted (operator or auto-detection at maturity).
    function markDefaulted(uint256 tokenId) external;

    /// @notice Redeem a fully repaid receivable — burns NFT, allows holder to claim repayment.
    function redeem(uint256 tokenId) external;
}
