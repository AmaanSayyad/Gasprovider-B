// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DestinationTreasury
 * @notice Holds native gas on a destination chain and drips it to users.
 *
 * The backend calls `drip(usdAmount6, recipient)` with a USD amount in 6
 * decimals — the same unit the escrow on BOT Chain records — and this contract
 * converts it to native using an owner-set price. Keeping the conversion here
 * means the backend never has to know what a destination's gas token is worth.
 *
 * Deliberately small: no swaps, no oracle, no token support. It receives native
 * and sends native.
 */
contract DestinationTreasury {
    /// @notice Address allowed to drip, set the price, and withdraw.
    address public owner;

    /// @notice Address allowed to call `drip` alongside the owner (the backend signer).
    address public relayer;

    /// @notice USD price of one whole native token, scaled by 1e6 (2450 USD -> 2_450_000_000).
    uint256 public priceUsd6;

    /// @notice Largest single payout, in wei. Bounds the damage from a bad price.
    uint256 public maxDripWei;

    /// @notice When true, `drip` reverts.
    bool public paused;

    uint256 private _entered;

    event Dripped(address indexed recipient, uint256 usdAmount6, uint256 nativeAmount);
    event PriceUpdated(uint256 priceUsd6);
    event MaxDripUpdated(uint256 maxDripWei);
    event RelayerUpdated(address relayer);
    event PausedSet(bool paused);
    event Funded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed from, address indexed to);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOwnerOrRelayer() {
        require(msg.sender == owner || msg.sender == relayer, "not authorised");
        _;
    }

    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor(uint256 _priceUsd6, uint256 _maxDripWei, address _relayer) payable {
        require(_priceUsd6 > 0, "price = 0");
        owner = msg.sender;
        priceUsd6 = _priceUsd6;
        maxDripWei = _maxDripWei;
        relayer = _relayer;
        emit PriceUpdated(_priceUsd6);
        emit MaxDripUpdated(_maxDripWei);
        emit RelayerUpdated(_relayer);
    }

    /// @notice Accept native funding.
    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    /**
     * @notice Send `usdAmount6` worth of native gas to `recipient`.
     * @param usdAmount6 USD value, 6 decimals (5 == $0.000005).
     * @param recipient  Who receives the gas.
     */
    function drip(uint256 usdAmount6, address payable recipient)
        external
        onlyOwnerOrRelayer
        nonReentrant
    {
        require(!paused, "paused");
        require(recipient != address(0), "recipient = zero");
        require(usdAmount6 > 0, "amount = 0");

        // usdAmount6 and priceUsd6 share a scale, so it cancels:
        //   native_wei = usdAmount6 * 1e18 / priceUsd6
        uint256 nativeAmount = (usdAmount6 * 1e18) / priceUsd6;
        require(nativeAmount > 0, "amount rounds to zero");
        require(nativeAmount <= maxDripWei, "over max drip");
        require(address(this).balance >= nativeAmount, "insufficient balance");

        (bool ok, ) = recipient.call{value: nativeAmount}("");
        require(ok, "native transfer failed");

        emit Dripped(recipient, usdAmount6, nativeAmount);
    }

    /// @notice How much native `usdAmount6` currently buys. For callers to preview.
    function quote(uint256 usdAmount6) external view returns (uint256) {
        return (usdAmount6 * 1e18) / priceUsd6;
    }

    function setPrice(uint256 _priceUsd6) external onlyOwner {
        require(_priceUsd6 > 0, "price = 0");
        priceUsd6 = _priceUsd6;
        emit PriceUpdated(_priceUsd6);
    }

    function setMaxDrip(uint256 _maxDripWei) external onlyOwner {
        maxDripWei = _maxDripWei;
        emit MaxDripUpdated(_maxDripWei);
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "to = zero");
        require(address(this).balance >= amount, "insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "native transfer failed");
        emit Withdrawn(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "newOwner = zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
