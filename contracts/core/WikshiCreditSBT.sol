// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IWikshiCreditOracle} from "contracts/interfaces/IWikshiCreditOracle.sol";

/// @title WikshiCreditSBT
/// @notice Non-transferable Soulbound Token representing a borrower's on-chain credit identity.
/// @dev ERC-5192 compliant (Minimal Soulbound NFTs). One SBT per address.
///      Other Creditcoin protocols can query credit data directly from this contract,
///      making Wikshi an ecosystem-wide credit primitive.
contract WikshiCreditSBT is ERC721, Ownable2Step {
    using Strings for uint256;

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiSBT__NonTransferable();
    error WikshiSBT__ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                          ERC-5192 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when an SBT is locked (always on mint for soulbound).
    event Locked(uint256 indexed tokenId);

    /// @notice Emitted when credit data is synced to the SBT.
    event CreditDataSynced(address indexed borrower, uint256 score, uint8 tier, uint256 paymentCount);

    /// @notice Emitted when the credit oracle address is updated.
    event SetCreditOracle(address indexed oldOracle, address indexed newOracle);

    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The credit oracle to read scores from.
    IWikshiCreditOracle public creditOracle;

    /// @notice Token ID counter (each address gets tokenId = uint256(address)).
    /// @dev Using address as tokenId ensures 1:1 mapping and easy lookup.

    /// @notice Cached credit data per token for on-chain queryability.
    struct CreditData {
        uint256 score;
        IWikshiCreditOracle.TrustTier tier;
        uint256 paymentCount;
        uint256 lastSynced;
    }

    /// @notice Credit data stored per borrower address.
    mapping(address => CreditData) public creditData;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address initialOwner,
        address creditOracle_
    ) ERC721("Wikshi Credit Score", "wCREDIT") Ownable(initialOwner) {
        if (creditOracle_ == address(0)) revert WikshiSBT__ZeroAddress();
        creditOracle = IWikshiCreditOracle(creditOracle_);
    }

    /*//////////////////////////////////////////////////////////////
                        SOULBOUND ENFORCEMENT
    //////////////////////////////////////////////////////////////*/

    /// @dev Override _update to block all transfers. Only mint (from=0) and burn (to=0) are allowed.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == 0) and burning (to == 0), block transfers
        if (from != address(0) && to != address(0)) {
            revert WikshiSBT__NonTransferable();
        }
        return super._update(to, tokenId, auth);
    }

    /// @notice ERC-5192: Returns whether a token is locked (always true for soulbound).
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @notice ERC-165: Declare support for ERC-5192 interface.
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        // ERC-5192 interface ID = 0xb45a3c0e
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    /*//////////////////////////////////////////////////////////////
                          MINT / SYNC
    //////////////////////////////////////////////////////////////*/

    /// @notice Mint a credit SBT for a borrower. Callable by anyone — the SBT just records
    ///         the borrower's current credit data from the oracle.
    /// @param borrower The address to mint for.
    function mint(address borrower) external {
        if (borrower == address(0)) revert WikshiSBT__ZeroAddress();
        uint256 tokenId = _addressToTokenId(borrower);
        // _mint reverts if already exists (ERC721InvalidSender)
        _mint(borrower, tokenId);
        emit Locked(tokenId);
        _syncCreditData(borrower);
    }

    /// @notice Sync latest credit data from the oracle to the SBT.
    /// @dev Callable by anyone — data is read from the oracle, not user-supplied.
    function syncCreditData(address borrower) external {
        uint256 tokenId = _addressToTokenId(borrower);
        _requireOwned(tokenId);
        _syncCreditData(borrower);
    }

    /*//////////////////////////////////////////////////////////////
                    COMPOSABLE CREDIT QUERIES
    //////////////////////////////////////////////////////////////*/

    /// @notice Get the cached credit score for a borrower.
    /// @dev Other protocols on Creditcoin can call this to check creditworthiness.
    function getCreditScore(address borrower) external view returns (uint256) {
        return creditData[borrower].score;
    }

    /// @notice Get the cached trust tier for a borrower.
    function getTrustTier(address borrower) external view returns (IWikshiCreditOracle.TrustTier) {
        return creditData[borrower].tier;
    }

    /// @notice Get the cached payment count for a borrower.
    function getPaymentCount(address borrower) external view returns (uint256) {
        return creditData[borrower].paymentCount;
    }

    /// @notice Get all credit data for a borrower in a single call.
    function getFullCreditProfile(address borrower) external view returns (
        uint256 score,
        IWikshiCreditOracle.TrustTier tier,
        uint256 paymentCount,
        uint256 lastSynced,
        bool hasSBT
    ) {
        uint256 tokenId = _addressToTokenId(borrower);
        hasSBT = _ownerOf(tokenId) != address(0);
        CreditData memory data = creditData[borrower];
        return (data.score, data.tier, data.paymentCount, data.lastSynced, hasSBT);
    }

    /*//////////////////////////////////////////////////////////////
                             ADMIN
    //////////////////////////////////////////////////////////////*/

    /// @notice Update the credit oracle address.
    function setCreditOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert WikshiSBT__ZeroAddress();
        address oldOracle = address(creditOracle);
        creditOracle = IWikshiCreditOracle(newOracle);
        emit SetCreditOracle(oldOracle, newOracle);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _syncCreditData(address borrower) internal {
        CreditData storage data = creditData[borrower];
        data.score = creditOracle.getCreditScore(borrower);
        data.tier = creditOracle.getTrustTier(borrower);
        data.paymentCount = creditOracle.getPaymentCount(borrower);
        data.lastSynced = block.timestamp;

        emit CreditDataSynced(borrower, data.score, uint8(data.tier), data.paymentCount);
    }

    /// @dev Deterministic token ID from address. Ensures 1:1 mapping.
    function _addressToTokenId(address addr) internal pure returns (uint256) {
        return uint256(uint160(addr));
    }
}
