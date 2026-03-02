// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IWikshiCreditOracle
/// @notice Interface for Wikshi's dual-source credit scoring oracle.
/// @dev Sources: (A) off-chain operator via Credal, (B) USC-verified cross-chain payments.
/// @custom:security-contact security@wikshi.xyz
interface IWikshiCreditOracle {
    /*//////////////////////////////////////////////////////////////
                                ENUMS
    //////////////////////////////////////////////////////////////*/

    enum TrustTier {
        Unverified,
        Basic,
        Established,
        Trusted
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event CreditScoreUpdated(address indexed borrower, uint256 newScore, string source);
    event OracleOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event SupportedEventSignatureUpdated(bytes32 indexed signature, bool supported);
    event SlasherUpdated(address indexed slasher, bool authorized);
    event ApprovedSourceContractUpdated(uint64 indexed chainKey, address indexed sourceContract, bool approved);

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the credit score for a borrower (0-1000), with time-based decay applied.
    function getCreditScore(address borrower) external view returns (uint256);

    /// @notice Returns the raw (undecayed) credit score for a borrower.
    function getRawCreditScore(address borrower) external view returns (uint256);

    /// @notice Returns the trust tier for a borrower based on score and payment count.
    function getTrustTier(address borrower) external view returns (TrustTier);

    /// @notice Returns the number of verified payments for a borrower.
    function getPaymentCount(address borrower) external view returns (uint256);

    /// @notice Checks whether a specific block height on a source chain has been attested by USC.
    function isChainHeightAttested(uint64 chainKey, uint64 blockHeight) external view returns (bool);

    /// @notice Returns the latest attested block height and hash for a source chain.
    function getLatestAttestation(uint64 chainKey) external view returns (uint64 height, bytes32 blockHash, bool exists);

    /// @notice Returns chain info for a given chainKey (validates chain is supported by USC).
    function getChainInfo(uint64 chainKey) external view returns (uint64 chainId, bool exists);

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Submits a credit score from the off-chain oracle operator.
    /// @param borrower The borrower address.
    /// @param score The credit score (0-1000).
    function submitCreditScore(address borrower, uint256 score) external;

    /// @notice Slash a borrower's credit score (called by authorized slashers, e.g. WikshiLend on liquidation).
    function slashScore(address borrower) external;

    /// @notice Authorize or revoke an address as a credit slasher.
    function setAuthorizedSlasher(address slasher, bool authorized) external;

    /// @notice Register or unregister an event signature for multi-protocol credit recognition.
    function setSupportedEventSignature(bytes32 signature, bool supported) external;

    /// @notice Update the oracle operator address.
    function setOracleOperator(address newOperator) external;

    /// @notice Approve or revoke a source contract for USC event validation, scoped per chain.
    /// @param chainKey The USC chain key the source contract belongs to.
    /// @param sourceContract The contract address on the source chain.
    /// @param approved Whether the contract is approved.
    function setApprovedSourceContract(uint64 chainKey, address sourceContract, bool approved) external;
}
