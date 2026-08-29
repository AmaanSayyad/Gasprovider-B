// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Centralized treasury contract for holding and distributing tokens across multiple chains
 * @dev This contract holds liquidity and executes direct transfers to users
 */
contract Treasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Emitted when native tokens are deposited to the Treasury
    /// @param token Address of the token (address(0) for native tokens)
    /// @param amount Amount deposited
    /// @param depositor Address of the depositor
    event Deposited(address indexed token, uint256 amount, address indexed depositor);

    /// @notice Emitted when native tokens are distributed to a recipient
    /// @param recipient Address receiving the tokens
    /// @param amount Amount distributed
    /// @param intentId Intent ID associated with this distribution
    event Distributed(address indexed recipient, uint256 amount, bytes32 indexed intentId);

    /// @notice Emitted when ERC20 tokens are distributed to a recipient
    /// @param token Address of the ERC20 token
    /// @param recipient Address receiving the tokens
    /// @param amount Amount distributed
    /// @param intentId Intent ID associated with this distribution
    event TokenDistributed(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bytes32 indexed intentId
    );

    /// @notice Emitted when tokens are withdrawn from the Treasury
    /// @param token Address of the token (address(0) for native tokens)
    /// @param amount Amount withdrawn
    /// @param recipient Address receiving the withdrawal
    event Withdrawn(address indexed token, uint256 amount, address indexed recipient);

    /**
     * @notice Constructor sets the contract owner
     */
    constructor() {}

    /**
     * @notice Allow contract to receive native tokens
     */
    receive() external payable {
        emit Deposited(address(0), msg.value, msg.sender);
    }

    /**
     * @notice Owner deposits native tokens to Treasury
     * @dev Emits Deposited event
     */
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Amount must be greater than 0");
        emit Deposited(address(0), msg.value, msg.sender);
    }

    /**
     * @notice Owner deposits ERC20 tokens to Treasury
     * @param token Address of the ERC20 token
     * @param amount Amount to deposit
     * @dev Emits Deposited event
     */
    function depositToken(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, amount, msg.sender);
    }

    /**
     * @notice Owner distributes native tokens to a recipient
     * @param recipient Address to receive the tokens
     * @param amount Amount to distribute
     * @param intentId Intent ID for tracking
     * @return txHash Hash of this transaction (for compatibility)
     * @dev Emits Distributed event
     */
    function distribute(
        address payable recipient,
        uint256 amount,
        bytes32 intentId
    ) external onlyOwner nonReentrant returns (bytes32 txHash) {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Native token transfer failed");

        emit Distributed(recipient, amount, intentId);
        
        // Return a pseudo-hash for compatibility (actual tx hash is determined by blockchain)
        return keccak256(abi.encodePacked(recipient, amount, intentId, block.timestamp));
    }

    /**
     * @notice Owner distributes ERC20 tokens to a recipient
     * @param token Address of the ERC20 token
     * @param recipient Address to receive the tokens
     * @param amount Amount to distribute
     * @param intentId Intent ID for tracking
     * @return txHash Hash of this transaction (for compatibility)
     * @dev Emits TokenDistributed event
     */
    function distributeToken(
        address token,
        address recipient,
        uint256 amount,
        bytes32 intentId
    ) external onlyOwner nonReentrant returns (bytes32 txHash) {
        require(token != address(0), "Invalid token address");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= amount, "Insufficient token balance");

        IERC20(token).safeTransfer(recipient, amount);
        emit TokenDistributed(token, recipient, amount, intentId);
        
        // Return a pseudo-hash for compatibility
        return keccak256(abi.encodePacked(token, recipient, amount, intentId, block.timestamp));
    }

    /**
     * @notice Owner distributes native tokens to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to distribute
     * @param intentId Intent ID for tracking
     * @dev Emits Distributed event for each recipient
     */
    function batchDistribute(
        address payable[] calldata recipients,
        uint256[] calldata amounts,
        bytes32 intentId
    ) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0, "Empty arrays");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(address(this).balance >= totalAmount, "Insufficient balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Amount must be greater than 0");

            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "Native token transfer failed");

            emit Distributed(recipients[i], amounts[i], intentId);
        }
    }

    /**
     * @notice Owner withdraws tokens from Treasury
     * @param token Address of the token (address(0) for native tokens)
     * @param amount Amount to withdraw
     * @dev Emits Withdrawn event
     */
    function withdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            // Withdraw native tokens
            require(address(this).balance >= amount, "Insufficient balance");
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Native token transfer failed");
        } else {
            // Withdraw ERC20 tokens
            uint256 balance = IERC20(token).balanceOf(address(this));
            require(balance >= amount, "Insufficient token balance");
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(token, amount, msg.sender);
    }

    /**
     * @notice Get Treasury balance for a specific token
     * @param token Address of the token (address(0) for native tokens)
     * @return Balance of the specified token
     */
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /**
     * @notice Get native token balance
     * @return Native token balance
     */
    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get ERC20 token balance
     * @param token Address of the ERC20 token
     * @return Token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        require(token != address(0), "Invalid token address");
        return IERC20(token).balanceOf(address(this));
    }
}
