// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SmartAccount
 * @notice ERC-4337 compatible Smart Account for gasless transactions
 * @dev Each EOA has a deterministic Smart Account address
 */
contract SmartAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // EOA address that owns this Smart Account
    address public immutable owner;

    // Nonce for replay protection
    uint256 public nonce;

    // Domain separator for EIP-712
    bytes32 public immutable DOMAIN_SEPARATOR;

    // EIP-712 type hash for execute
    bytes32 public constant EXECUTE_TYPEHASH =
        keccak256("Execute(address to,uint256 value,bytes data,uint256 nonce)");

    // EIP-712 type hash for executeBatch
    bytes32 public constant EXECUTE_BATCH_TYPEHASH =
        keccak256("ExecuteBatch(address[] to,uint256[] value,bytes[] data,uint256 nonce)");

    event Executed(address indexed to, uint256 value, bytes data, uint256 nonce);
    event ExecutedBatch(address[] to, uint256[] value, bytes[] data, uint256 nonce);

    constructor(address _owner) {
        require(_owner != address(0), "Owner cannot be zero address");
        owner = _owner;

        // Initialize domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("SmartAccount"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Execute a single transaction
     * @dev Can be called by owner directly or by relayer after off-chain signature verification
     * @param to Target address
     * @param value Amount of native token to send
     * @param data Calldata for the transaction
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external {
        require(to != address(0), "Invalid target address");
        
        // Allow owner to execute directly, or any caller (relayer) after off-chain verification
        // In production, you may want to add a trusted relayer whitelist
        
        // Increment nonce
        nonce++;

        // Execute the transaction
        (bool success, ) = to.call{value: value}(data);
        require(success, "Execution failed");

        emit Executed(to, value, data, nonce - 1);
    }

    /**
     * @notice Execute multiple transactions in a batch
     * @dev Can be called by owner directly or by relayer after off-chain signature verification
     * @param to Array of target addresses
     * @param value Array of amounts to send
     * @param data Array of calldata
     */
    function executeBatch(
        address[] calldata to,
        uint256[] calldata value,
        bytes[] calldata data
    ) external {
        require(to.length == value.length && to.length == data.length, "Array length mismatch");
        require(to.length > 0, "Empty batch");

        // Allow owner to execute directly, or any caller (relayer) after off-chain verification
        // In production, you may want to add a trusted relayer whitelist

        // Increment nonce
        nonce++;

        // Execute all transactions
        for (uint256 i = 0; i < to.length; i++) {
            require(to[i] != address(0), "Invalid target address");
            (bool success, ) = to[i].call{value: value[i]}(data[i]);
            require(success, "Batch execution failed");
        }

        emit ExecutedBatch(to, value, data, nonce - 1);
    }

    /**
     * @notice Execute with signature verification (more secure version)
     * @param to Target address
     * @param value Amount of native token to send
     * @param data Calldata for the transaction
     * @param signature EOA signature for authorization
     */
    function executeWithSignature(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    ) external {
        require(to != address(0), "Invalid target address");

        // Verify signature
        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(EXECUTE_TYPEHASH, to, value, keccak256(data), nonce))
            )
        );

        address signer = hash.recover(signature);
        require(signer == owner, "Invalid signature");

        // Increment nonce
        nonce++;

        // Execute the transaction
        (bool success, ) = to.call{value: value}(data);
        require(success, "Execution failed");

        emit Executed(to, value, data, nonce - 1);
    }

    /**
     * @notice Get current nonce
     * @return Current nonce value
     */
    function getNonce() external view returns (uint256) {
        return nonce;
    }

    /**
     * @notice Allow contract to receive native tokens
     */
    receive() external payable {}
}

