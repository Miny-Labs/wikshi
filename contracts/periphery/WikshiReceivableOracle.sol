// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IOracle} from "contracts/interfaces/IOracle.sol";
import {IWikshiReceivable} from "contracts/interfaces/IWikshiReceivable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title WikshiReceivableOracle
/// @notice Prices WikshiReceivable-backed collateral for Wikshi lending markets.
/// @dev Implements IOracle so it can be plugged into any Wikshi market as the price oracle.
///      Price represents the value of 1 unit of wrapped receivable (wREC-20) in loan token terms.
///
///      Pricing model (simplified DCF):
///      - Aggregates value of all receivables held by the wrapper contract
///      - Each receivable valued by WikshiReceivable.getReceivableValue() which accounts for:
///        (a) borrower credit score → recovery probability
///        (b) time to maturity → time discount
///        (c) repayment status → actual vs expected cash flows
///      - Total value / total wrapped supply = price per wREC-20 token
///
///      For hackathon: uses admin-settable aggregate price with auto-refresh capability.
///      For mainnet: would integrate with off-chain NAV calculation service (Centrifuge pattern).
/// @custom:security-contact security@wikshi.xyz
contract WikshiReceivableOracle is IOracle, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Price scale matching Morpho Blue pattern (1e36).
    uint256 public constant ORACLE_PRICE_SCALE = 1e36;

    /// @notice Maximum staleness before price is considered stale.
    uint256 public constant MAX_STALENESS = 48 hours;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The WikshiReceivable contract.
    IWikshiReceivable public receivable;

    /// @notice Current aggregate price of receivable collateral in loan token terms.
    /// @dev Scaled by 1e36. Represents value of 1 unit of wrapped receivable token.
    uint256 public currentPrice;

    /// @notice Timestamp of last price update.
    uint256 public lastUpdated;

    /// @notice Human-readable description.
    string public description;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiReceivableOracle__StalePrice();
    error WikshiReceivableOracle__ZeroPrice();
    error WikshiReceivableOracle__ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param initialOwner The owner (admin who updates NAV price).
    /// @param receivable_ The WikshiReceivable contract address.
    /// @param initialPrice Initial price scaled by 1e36 (e.g., 1e36 = 1:1 with loan token).
    /// @param pairDescription Description string (e.g., "wREC/USDT").
    constructor(
        address initialOwner,
        address receivable_,
        uint256 initialPrice,
        string memory pairDescription
    ) Ownable(initialOwner) {
        if (receivable_ == address(0)) revert WikshiReceivableOracle__ZeroAddress();
        if (initialPrice == 0) revert WikshiReceivableOracle__ZeroPrice();
        receivable = IWikshiReceivable(receivable_);
        currentPrice = initialPrice;
        lastUpdated = block.timestamp;
        description = pairDescription;
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOracle
    function price() external view returns (uint256) {
        if (block.timestamp - lastUpdated > MAX_STALENESS) {
            revert WikshiReceivableOracle__StalePrice();
        }
        return currentPrice;
    }

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Update the aggregate receivable price.
    /// @dev Called by admin/keeper after computing NAV off-chain.
    ///      For mainnet: this would be automated via Chainlink Keeper or similar.
    /// @param newPrice New price scaled by 1e36.
    function setPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert WikshiReceivableOracle__ZeroPrice();
        uint256 oldPrice = currentPrice;
        currentPrice = newPrice;
        lastUpdated = block.timestamp;
        emit PriceUpdated(oldPrice, newPrice, block.timestamp);
    }

    /// @notice Compute and update price from a specific receivable's on-chain valuation.
    /// @dev Reads getReceivableValue() which incorporates credit score and time discount.
    ///      Used for single-receivable markets (1 NFT = 1 market).
    /// @param tokenId The receivable token ID to price.
    /// @param loanTokenDecimals Decimals of the loan token for proper scaling.
    function refreshPriceFromReceivable(uint256 tokenId, uint8 loanTokenDecimals) external onlyOwner {
        uint256 value = receivable.getReceivableValue(tokenId);
        if (value == 0) revert WikshiReceivableOracle__ZeroPrice();

        // Scale to ORACLE_PRICE_SCALE: value is in loan token units,
        // price represents "value of 1 unit of collateral in loan token terms"
        // For wrapped receivables: 1 wREC-20 token = value / wrapper supply
        // For direct NFT pricing: price = value * 10^(36 - loanTokenDecimals)
        uint256 newPrice = value * (10 ** (36 - loanTokenDecimals));

        uint256 oldPrice = currentPrice;
        currentPrice = newPrice;
        lastUpdated = block.timestamp;
        emit PriceUpdated(oldPrice, newPrice, block.timestamp);
    }
}
