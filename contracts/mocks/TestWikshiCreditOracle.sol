// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {WikshiCreditOracle} from "contracts/core/WikshiCreditOracle.sol";
import {EvmV1Decoder} from "contracts/vendor/EvmV1Decoder.sol";

/// @title TestWikshiCreditOracle
/// @notice Test harness that exposes internal functions of WikshiCreditOracle for unit testing.
/// @dev The USC precompile (0x0FD2) only exists on Creditcoin's chain. This harness lets us test
///      our scoring logic (processPaymentEvent, calculateIncrement) locally without the precompile.
contract TestWikshiCreditOracle is WikshiCreditOracle {
    constructor(address initialOwner, address operator) WikshiCreditOracle(initialOwner, operator) {}

    /// @notice Exposes _processPaymentEvent for testing score calculations.
    /// @param borrowerTopicIdx The topic index where borrower address is located.
    /// @dev Uses chainKey=0, token=address(0) for local testing (no cross-chain normalization).
    function processPaymentEventPublic(EvmV1Decoder.LogEntry memory log, uint8 action, uint256 borrowerTopicIdx) external {
        _processPaymentEvent(log, action, borrowerTopicIdx, 0, address(0));
    }

    /// @notice Exposes _calculateIncrement for testing tiered step function.
    function calculateIncrementPublic(uint256 amount) external pure returns (uint256) {
        return _calculateIncrement(amount);
    }

    /// @notice Allows tests to set paymentCount directly for tier testing.
    function setPaymentCountForTesting(address borrower, uint256 count) external {
        paymentCount[borrower] = count;
    }
}
