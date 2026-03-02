// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IOracle} from "contracts/interfaces/IOracle.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title WikshiOracle
/// @notice Admin-settable price oracle implementing Morpho Blue's IOracle interface.
/// @dev One oracle instance per market pair. Price is collateral-to-loan, scaled by 1e36.
///      On Creditcoin testnet there are no Chainlink feeds, so we use admin-settable prices.
///      For mainnet, this would be replaced with a Chainlink/Pyth adapter.
/// @custom:security-contact security@wikshi.xyz
contract WikshiOracle is IOracle, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 public constant MAX_STALENESS = 24 hours;
    uint256 public constant ORACLE_PRICE_SCALE = 1e36;

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Current price of collateral quoted in loan token, scaled by 1e36.
    uint256 public currentPrice;

    /// @notice Timestamp of last price update.
    uint256 public lastUpdated;

    /// @notice Human-readable description of the price pair.
    string public description;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiOracle__StalePrice();
    error WikshiOracle__ZeroPrice();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param initialOwner The initial owner.
    /// @param initialPrice Initial price scaled by 1e36.
    /// @param pairDescription Human-readable pair description (e.g., "CTC/USDT").
    constructor(address initialOwner, uint256 initialPrice, string memory pairDescription) Ownable(initialOwner) {
        if (initialPrice == 0) revert WikshiOracle__ZeroPrice();
        currentPrice = initialPrice;
        lastUpdated = block.timestamp;
        description = pairDescription;
    }

    /*//////////////////////////////////////////////////////////////
                      USER-FACING READ-ONLY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IOracle
    function price() external view returns (uint256) {
        if (block.timestamp - lastUpdated > MAX_STALENESS) revert WikshiOracle__StalePrice();
        return currentPrice;
    }

    /*//////////////////////////////////////////////////////////////
                    USER-FACING STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Updates the price. Only callable by owner.
    /// @param newPrice New price scaled by 1e36.
    function setPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert WikshiOracle__ZeroPrice();
        uint256 oldPrice = currentPrice;
        currentPrice = newPrice;
        lastUpdated = block.timestamp;
        emit PriceUpdated(oldPrice, newPrice, block.timestamp);
    }
}
