// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title IChainInfoPrecompile
/// @notice Interface for the Creditcoin ChainInfo precompile at 0x0FD3 (4051 decimal).
/// @dev Derived from the canonical ABI in @gluwa/cc-next-query-builder v0.7.0
///      (src/chain-info/chain_info_abi.json). All functions are view (read-only).
///      Uses snake_case naming per Substrate/Rust convention (matches the precompile).
///      No official Solidity interface exists in any Gluwa repository as of March 2026 —
///      this is the first Solidity interface derived from the ABI JSON.
interface IChainInfoPrecompile {

    /*//////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @dev Metadata for a source chain supported by the USC bridge.
    struct ChainInfo {
        uint64 chainKey;
        uint64 chainId;
        bytes  chainName;      // Raw bytes, not UTF-8 string (SDK note: decoding may return zeros)
        uint8  chainEncoding;  // RLP encoding variant used by the source chain
    }

    /// @dev Wrapper for get_chain_by_key — check `exists` before using `info`.
    struct ChainInfoResult {
        ChainInfo info;
        bool      exists;
    }

    /// @dev Result for height+hash queries. `isAttestation` distinguishes attestations from checkpoints.
    struct HeightHashResult {
        uint64  height;
        bytes32 hash;
        bool    isAttestation;
        bool    exists;
    }

    /// @dev Continuity bounds bracketing a target height — used for ContinuityProof construction.
    struct BoundsCheckResult {
        uint64  parentHeight;
        bytes32 parentHash;
        bool    parentIsAttestation;
        uint64  childHeight;
        bytes32 childHash;
        bool    childIsAttestation;
        bool    isAttested;
    }

    /// @dev Reverse lookup result: height from a digest.
    struct HeightResult {
        uint64 height;
        bool   exists;
    }

    /// @dev Checkpoint hash lookup result.
    struct HashResult {
        bytes32 hash;
        bool    exists;
    }

    /*//////////////////////////////////////////////////////////////
                        CHAIN DISCOVERY
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns all source chains currently supported by the Creditcoin USC bridge.
    function get_supported_chains() external view returns (ChainInfo[] memory chains);

    /// @notice Returns info for a single chain by its chainKey.
    function get_chain_by_key(uint64 chainKey) external view returns (ChainInfoResult memory result);

    /*//////////////////////////////////////////////////////////////
                       ATTESTATION STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the latest attested block height and hash for a chain.
    function get_latest_attestation_height_and_hash(uint64 chainKey)
        external view returns (HeightHashResult memory result);

    /// @notice Returns the latest checkpoint height and hash for a chain.
    function get_latest_checkpoint_height_and_hash(uint64 chainKey)
        external view returns (HeightHashResult memory result);

    /// @notice Simple boolean check: is a specific block height attested?
    function is_height_attested(uint64 chainKey, uint64 targetHeight)
        external view returns (bool isAttested);

    /// @notice Returns the genesis height from which attestations begin for a chain.
    function get_attestation_genesis_height(uint64 chainKey)
        external view returns (uint64 genesisHeight);

    /*//////////////////////////////////////////////////////////////
                      CONTINUITY BOUNDS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the continuity bounds surrounding a target height.
    /// @dev Core function for building a ContinuityProof for the prover precompile (0x0FD2).
    function get_attestation_bounds(uint64 chainKey, uint64 targetHeight)
        external view returns (BoundsCheckResult memory result);

    /*//////////////////////////////////////////////////////////////
                        SCAN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Finds the highest attested block at or before targetHeight.
    function find_highest_attested_before(uint64 chainKey, uint64 targetHeight)
        external view returns (HeightHashResult memory result);

    /// @notice Finds the lowest attested block at or after targetHeight.
    function find_lowest_attested_after(uint64 chainKey, uint64 targetHeight)
        external view returns (HeightHashResult memory result);

    /*//////////////////////////////////////////////////////////////
                      HASH / DIGEST LOOKUPS
    //////////////////////////////////////////////////////////////*/

    /// @notice Reverse lookup: given a block hash, find its attested height.
    function get_attestation_height_for_digest(uint64 chainKey, bytes32 digest)
        external view returns (HeightResult memory);

    /// @notice Returns the checkpoint hash stored for a specific block height.
    function get_checkpoint_for_height(uint64 chainKey, uint64 height)
        external view returns (HashResult memory);
}

/// @dev Helper library to get the ChainInfo precompile instance, matching NativeQueryVerifierLib pattern.
library ChainInfoLib {
    address constant PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000fD3;

    function getChainInfo() internal pure returns (IChainInfoPrecompile) {
        return IChainInfoPrecompile(PRECOMPILE_ADDRESS);
    }
}
