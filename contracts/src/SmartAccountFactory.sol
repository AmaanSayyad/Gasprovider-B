// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./SmartAccount.sol";

/**
 * @title SmartAccountFactory
 * @notice Factory contract for deploying Smart Accounts
 * @dev Uses CREATE2 for deterministic address generation
 */
contract SmartAccountFactory {
    // Mapping from EOA address to Smart Account address
    mapping(address => address) public smartAccounts;

    // Smart Account implementation bytecode hash (for CREATE2)
    bytes32 public immutable smartAccountBytecodeHash;

    event SmartAccountDeployed(
        address indexed eoaAddress,
        address indexed smartAccountAddress
    );

    constructor() {
        // Compute bytecode hash for CREATE2
        bytes memory bytecode = type(SmartAccount).creationCode;
        smartAccountBytecodeHash = keccak256(bytecode);
    }

    /**
     * @notice Get Smart Account address for an EOA (if deployed)
     * @param eoaAddress The EOA address
     * @return The Smart Account address, or zero address if not deployed
     */
    function getSmartAccount(address eoaAddress) external view returns (address) {
        return smartAccounts[eoaAddress];
    }

    /**
     * @notice Predict the Smart Account address for an EOA using CREATE2
     * @param eoaAddress The EOA address
     * @return The predicted Smart Account address
     */
    function predictSmartAccountAddress(address eoaAddress) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(eoaAddress));
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(eoaAddress)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Deploy a Smart Account for an EOA
     * @param eoaAddress The EOA address that will own the Smart Account
     * @return The deployed Smart Account address
     */
    function deployAccount(address eoaAddress) external returns (address) {
        require(eoaAddress != address(0), "Invalid EOA address");

        // Check if Smart Account already exists
        address existingAccount = smartAccounts[eoaAddress];
        if (existingAccount != address(0)) {
            // Verify it's actually deployed
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(existingAccount)
            }
            if (codeSize > 0) {
                return existingAccount;
            }
        }

        // Deploy using CREATE2 for deterministic address
        bytes32 salt = keccak256(abi.encodePacked(eoaAddress));
        bytes memory bytecode = abi.encodePacked(
            type(SmartAccount).creationCode,
            abi.encode(eoaAddress)
        );

        address smartAccountAddress;
        assembly {
            smartAccountAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(smartAccountAddress != address(0), "Deployment failed");

        // Store the mapping
        smartAccounts[eoaAddress] = smartAccountAddress;

        emit SmartAccountDeployed(eoaAddress, smartAccountAddress);

        return smartAccountAddress;
    }

    /**
     * @notice Batch deploy Smart Accounts for multiple EOAs
     * @param eoaAddresses Array of EOA addresses
     * @return Array of deployed Smart Account addresses
     */
    function deployAccountsBatch(address[] calldata eoaAddresses) public returns (address[] memory) {
        address[] memory deployedAccounts = new address[](eoaAddresses.length);

        for (uint256 i = 0; i < eoaAddresses.length; i++) {
            deployedAccounts[i] = this.deployAccount(eoaAddresses[i]);  // Avoid this if possible
        }

        return deployedAccounts;
    }
}

