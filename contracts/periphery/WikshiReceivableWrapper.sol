// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWikshiReceivable} from "contracts/interfaces/IWikshiReceivable.sol";

/// @title WikshiReceivableWrapper
/// @notice Wraps WikshiReceivable ERC-721 tokens into fungible ERC-20 position tokens.
/// @dev Enables receivable NFTs to be used as collateral in Wikshi lending markets,
///      which require ERC-20 collateral tokens. Each wrapper instance is scoped to a
///      single loan token denomination to prevent decimal mismatch attacks.
///
///      Security design:
///      - unwrap() restricted to original depositor OR authorized unwrappers (e.g., liquidation router).
///        Prevents cherry-picking high-value receivables from a pool of heterogeneous NFTs.
///      - onERC721Received rejects unsolicited transfers — only accepts NFTs during wrap().
///      - Constructor enforces expectedLoanToken; wrap() validates receivable denomination
///        and normalizes principal to wrapper decimals (6) to prevent collateral inflation.
/// @custom:security-contact security@wikshi.xyz
contract WikshiReceivableWrapper is ERC20, Ownable, IERC721Receiver {
    /*//////////////////////////////////////////////////////////////
                          STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The WikshiReceivable contract whose NFTs are wrapped.
    IWikshiReceivable public immutable receivable;

    /// @notice The loan token this wrapper is scoped to.
    /// @dev Only receivables denominated in this token can be wrapped.
    address public immutable expectedLoanToken;

    /// @notice Decimals of the expected loan token (cached for gas efficiency).
    uint8 public immutable loanTokenDecimals;

    /// @notice Maps token ID → minted ERC-20 amount (for accurate burn on unwrap).
    mapping(uint256 => uint256) public mintedAmount;

    /// @notice Maps token ID → original depositor address.
    /// @dev Only the depositor or authorized unwrappers can unwrap a specific tokenId,
    ///      preventing cherry-picking attacks across pooled heterogeneous receivables.
    mapping(uint256 => address) public depositorOf;

    /// @notice Addresses authorized to unwrap any tokenId (e.g., WikshiLend for liquidation).
    mapping(address => bool) public authorizedUnwrappers;

    /// @notice Total number of receivables currently held by this wrapper.
    uint256 public wrappedCount;

    /// @notice Reentrancy guard for onERC721Received — only true during wrap().
    bool private _wrapping;

    /*//////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    event Wrapped(uint256 indexed tokenId, address indexed depositor, uint256 amount);
    event Unwrapped(uint256 indexed tokenId, address indexed redeemer, uint256 amount);
    event AuthorizedUnwrapperUpdated(address indexed unwrapper, bool authorized);

    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    error WikshiWrapper__InsufficientBalance();
    error WikshiWrapper__ZeroPrincipal();
    error WikshiWrapper__InvalidReceivable();
    error WikshiWrapper__UnsolicitedTransfer();
    error WikshiWrapper__LoanTokenMismatch();
    error WikshiWrapper__ZeroAddress();
    error WikshiWrapper__NotAuthorizedToUnwrap();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param receivable_ The WikshiReceivable contract address.
    /// @param expectedLoanToken_ The loan token denomination this wrapper accepts.
    /// @param initialOwner The owner who manages authorized unwrappers.
    constructor(
        address receivable_,
        address expectedLoanToken_,
        address initialOwner
    ) ERC20("Wrapped Wikshi Receivable", "wREC") Ownable(initialOwner) {
        if (receivable_ == address(0) || expectedLoanToken_ == address(0)) revert WikshiWrapper__ZeroAddress();
        receivable = IWikshiReceivable(receivable_);
        expectedLoanToken = expectedLoanToken_;
        loanTokenDecimals = IERC20Metadata(expectedLoanToken_).decimals();
    }

    /*//////////////////////////////////////////////////////////////
                      STATE-CHANGING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Deposit a receivable NFT and receive wREC-20 tokens.
    /// @dev Caller must have approved this contract for the NFT beforehand.
    ///      Validates loan token denomination matches wrapper's expectedLoanToken.
    ///      Normalizes principal to 6 decimals regardless of underlying loan token decimals.
    /// @param tokenId The receivable NFT token ID to deposit.
    function wrap(uint256 tokenId) external {
        IWikshiReceivable.LoanData memory loan = receivable.getLoanData(tokenId);
        if (loan.principal == 0) revert WikshiWrapper__ZeroPrincipal();

        // Enforce loan token denomination matches this wrapper
        if (loan.loanToken != expectedLoanToken) revert WikshiWrapper__LoanTokenMismatch();

        // Only active or partially repaid receivables can be wrapped
        if (loan.status != IWikshiReceivable.ReceivableStatus.Active &&
            loan.status != IWikshiReceivable.ReceivableStatus.PartiallyRepaid) {
            revert WikshiWrapper__InvalidReceivable();
        }

        // Set wrapping flag so onERC721Received accepts this transfer
        _wrapping = true;
        _transferNFTIn(tokenId);
        _wrapping = false;

        // Normalize principal to wrapper decimals (6)
        uint256 amount = _normalizeToWrapperDecimals(loan.principal);
        if (amount == 0) revert WikshiWrapper__ZeroPrincipal();

        mintedAmount[tokenId] = amount;
        depositorOf[tokenId] = msg.sender;
        wrappedCount++;

        _mint(msg.sender, amount);
        emit Wrapped(tokenId, msg.sender, amount);
    }

    /// @notice Authorize or revoke an address to unwrap any tokenId (for liquidation contracts).
    /// @param unwrapper The address to authorize or revoke.
    /// @param authorized Whether the address is authorized.
    function setAuthorizedUnwrapper(address unwrapper, bool authorized) external onlyOwner {
        if (unwrapper == address(0)) revert WikshiWrapper__ZeroAddress();
        authorizedUnwrappers[unwrapper] = authorized;
        emit AuthorizedUnwrapperUpdated(unwrapper, authorized);
    }

    /// @notice Withdraw a receivable NFT by burning the corresponding wREC-20 tokens.
    /// @dev Only the original depositor or authorized unwrappers
    ///      can unwrap a specific tokenId. Prevents cherry-picking high-value receivables.
    /// @param tokenId The receivable NFT token ID to withdraw.
    function unwrap(uint256 tokenId) external {
        _unwrapInternal(tokenId, msg.sender);
    }

    /// @notice Unwrap a receivable NFT and send it to a specified recipient.
    /// @dev Only callable by authorized unwrappers (e.g., WikshiLiquidationRouter).
    ///      Enables liquidation flows: the router atomically liquidates a wREC-collateralized
    ///      position and unwraps the receivable NFT directly to the liquidator.
    ///      Without this, seized wREC collateral would be non-redeemable by the liquidator.
    /// @param tokenId The receivable NFT token ID to withdraw.
    /// @param recipient The address to receive the unwrapped NFT.
    function unwrapTo(uint256 tokenId, address recipient) external {
        if (!authorizedUnwrappers[msg.sender]) revert WikshiWrapper__NotAuthorizedToUnwrap();
        if (recipient == address(0)) revert WikshiWrapper__ZeroAddress();
        _unwrapInternal(tokenId, recipient);
    }

    /// @dev Shared unwrap logic for unwrap() and unwrapTo().
    function _unwrapInternal(uint256 tokenId, address recipient) internal {
        uint256 amount = mintedAmount[tokenId];
        if (amount == 0) revert WikshiWrapper__InvalidReceivable();

        // Access control: ONLY depositor OR authorized unwrapper. No public fallback.
        if (msg.sender != depositorOf[tokenId] && !authorizedUnwrappers[msg.sender]) {
            revert WikshiWrapper__NotAuthorizedToUnwrap();
        }

        if (balanceOf(msg.sender) < amount) revert WikshiWrapper__InsufficientBalance();

        // Burn ERC-20 and return NFT to recipient
        _burn(msg.sender, amount);
        delete mintedAmount[tokenId];
        delete depositorOf[tokenId];
        wrappedCount--;

        _wrapping = true;
        _transferNFTOut(tokenId, recipient);
        _wrapping = false;

        emit Unwrapped(tokenId, recipient, amount);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the ERC-20 token decimals matching typical stablecoin decimals.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /*//////////////////////////////////////////////////////////////
                     ERC-721 RECEIVER INTERFACE
    //////////////////////////////////////////////////////////////*/

    /// @dev Only accepts NFTs during wrap()/unwrap() calls.
    ///      Rejects unsolicited safeTransferFrom to prevent NFTs from being permanently trapped.
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        if (!_wrapping) revert WikshiWrapper__UnsolicitedTransfer();
        return this.onERC721Received.selector;
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @dev Normalizes a principal amount from loan token decimals to wrapper decimals (6).
    function _normalizeToWrapperDecimals(uint256 principal) internal view returns (uint256) {
        if (loanTokenDecimals == 6) return principal;
        if (loanTokenDecimals > 6) {
            return principal / (10 ** (loanTokenDecimals - 6));
        } else {
            return principal * (10 ** (6 - loanTokenDecimals));
        }
    }

    /// @dev Transfers an NFT from the caller to this contract.
    function _transferNFTIn(uint256 tokenId) internal {
        (bool success, ) = address(receivable).call(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256)",
                msg.sender,
                address(this),
                tokenId
            )
        );
        if (!success) revert WikshiWrapper__InvalidReceivable();
    }

    /// @dev Transfers an NFT from this contract back to a recipient.
    function _transferNFTOut(uint256 tokenId, address to) internal {
        (bool success, ) = address(receivable).call(
            abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256)",
                address(this),
                to,
                tokenId
            )
        );
        if (!success) revert WikshiWrapper__InvalidReceivable();
    }
}
