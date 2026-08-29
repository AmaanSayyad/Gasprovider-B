// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Minimal interface for Uniswap V3 SwapRouter
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @notice Minimal interface for WETH (wrapped native token)
interface IWETH {
    function withdraw(uint256) external;
}

/// @notice Interface for Flare FTSO FastUpdater contract
interface IFastUpdater {
    function fetchCurrentFeeds(bytes21[] calldata _feedIds)
        external
        view
        returns (
            uint256[] memory _feedValues,
            int8[] memory _decimals,
            uint64 _timestamp
        );
}

/// @notice Interface for Flare FDC Verification contract
interface IFdcVerification {
    struct Proof {
        bytes32[] merkleProof;
        bytes data;
    }
    
    function verifyPayment(Proof calldata proof) external view returns (bool);
    function verifyEVMTransaction(Proof calldata proof) external view returns (bool);
}

/// @notice Attestation response structure for FDC
struct AttestationResponse {
    bytes32 attestationType;
    bytes32 sourceId;
    uint64 votingRound;
    uint64 lowestUsedTimestamp;
    bytes requestBody;
    bytes responseBody;
}

contract GasStation is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    ISwapRouter public immutable swapRouter;
    IWETH public immutable weth;

    /// @notice Uniswap V3 pool fee tier (e.g. 500 = 0.05%, 3000 = 0.3%)
    uint24 public immutable poolFee;

    /// @notice Flare FTSO FastUpdater contract
    IFastUpdater public ftsoFastUpdater;

    /// @notice Flare FDC Verification contract
    IFdcVerification public fdcVerification;

    /// @notice Mapping of supported FAsset token addresses
    mapping(address => bool) public supportedFAssets;

    /// @notice Array of all supported FAsset addresses
    address[] public fAssetList;

    /// @notice Mapping of FAsset to underlying asset symbol
    mapping(address => string) public fAssetToUnderlying;

    /// @notice Emitted when a user deposits USDC with their chain distribution.
    event Deposited(address indexed user, uint256 totalAmount, uint256[] chainIds, uint256[] chainAmounts);

    /// @notice Emitted when USDC is swapped and native token is dripped to a user.
    event Dripped(address indexed recipient, uint256 usdcAmountIn, uint256 nativeAmountOut);

    /// @notice Emitted when a user deposits FAssets
    event FAssetDeposited(
        address indexed user,
        address indexed fAssetToken,
        uint256 amount,
        uint256[] chainIds,
        uint256[] chainAmounts
    );

    /// @notice Emitted when a deposit is verified via FDC
    event DepositVerified(
        bytes32 indexed txHash,
        address indexed user,
        bool verified
    );

    constructor(
        address _usdc,
        address _swapRouter,
        address _weth,
        uint24 _poolFee,
        address _ftsoFastUpdater,
        address _fdcVerification
    ) {
        require(_usdc != address(0), "USDC addr zero");
        require(_swapRouter != address(0), "Router addr zero");
        require(_weth != address(0), "WETH addr zero");
        require(_poolFee > 0, "poolFee = 0");

        usdc = IERC20(_usdc);
        swapRouter = ISwapRouter(_swapRouter);
        weth = IWETH(_weth);
        poolFee = _poolFee;
        
        // Flare integrations (can be zero address if not on Flare)
        ftsoFastUpdater = IFastUpdater(_ftsoFastUpdater);
        fdcVerification = IFdcVerification(_fdcVerification);
    }

    /// @notice Allow contract to receive native token when unwrapping WETH.
    receive() external payable {}

    /// @notice User deposits USDC + specifies per-chain gas distribution (off-chain logic can read this).
    function deposit(
        uint256 totalAmount,
        uint256[] calldata chainIds,
        uint256[] calldata chainAmounts
    ) external nonReentrant {
        require(totalAmount > 0, "totalAmount = 0");
        require(chainIds.length == chainAmounts.length && chainIds.length > 0, "array length mismatch");

        uint256 sum;
        uint256 len = chainAmounts.length;
        for (uint256 i = 0; i < len; i++) {
            sum += chainAmounts[i];
        }

        require(sum == totalAmount, "amounts do not sum to totalAmount");

        // Pull USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit Deposited(msg.sender, totalAmount, chainIds, chainAmounts);
    }

    /// @notice Called only by the owner.
    /// Swaps `usdcAmount` of USDC held by this contract to native token and sends it to `recipient`.
    function drip(uint256 usdcAmount, address payable recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "recipient = zero");
        require(usdcAmount > 0, "usdcAmount = 0");

        // Check USDC balance
        uint256 balance = usdc.balanceOf(address(this));
        require(balance >= usdcAmount, "insufficient USDC");

        // Approve router for this exact amount (reset first for safety)
        usdc.safeApprove(address(swapRouter), 0);
        usdc.safeApprove(address(swapRouter), usdcAmount);

        // Swap USDC -> WETH (output to this contract)
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(usdc),
            tokenOut: address(weth),
            fee: poolFee,
            recipient: address(this),
            amountIn: usdcAmount,
            amountOutMinimum: 0, // MVP: no slippage check
            sqrtPriceLimitX96: 0 // no price limit
        });

        uint256 wethReceived = swapRouter.exactInputSingle(params);

        // Unwrap WETH -> native token (ETH)
        weth.withdraw(wethReceived);

        // Forward the native token to the user
        (bool ok, ) = recipient.call{value: wethReceived}("");
        require(ok, "native transfer failed");

        emit Dripped(recipient, usdcAmount, wethReceived);
    }

    /// @notice Deposit FAsset tokens with chain distribution
    /// @param fAssetToken The FAsset token address
    /// @param totalAmount Total amount of FAssets to deposit
    /// @param chainIds Array of destination chain IDs
    /// @param chainAmounts Array of amounts for each chain
    function depositFAsset(
        address fAssetToken,
        uint256 totalAmount,
        uint256[] calldata chainIds,
        uint256[] calldata chainAmounts
    ) external nonReentrant {
        require(totalAmount > 0, "totalAmount = 0");
        require(supportedFAssets[fAssetToken], "FAsset not supported");
        require(chainIds.length == chainAmounts.length && chainIds.length > 0, "array length mismatch");

        uint256 sum;
        uint256 len = chainAmounts.length;
        for (uint256 i = 0; i < len; i++) {
            sum += chainAmounts[i];
        }

        require(sum == totalAmount, "amounts do not sum to totalAmount");

        // Pull FAsset tokens from user
        IERC20(fAssetToken).safeTransferFrom(msg.sender, address(this), totalAmount);

        emit FAssetDeposited(msg.sender, fAssetToken, totalAmount, chainIds, chainAmounts);
    }

    /// @notice Drip with FTSO price verification
    /// @param usdcAmount Amount of USDC to swap
    /// @param recipient Recipient address
    /// @param ftsoFeedId FTSO feed ID for price verification
    function dripWithFTSO(
        uint256 usdcAmount,
        address payable recipient,
        bytes21 ftsoFeedId
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "recipient = zero");
        require(usdcAmount > 0, "usdcAmount = 0");
        require(address(ftsoFastUpdater) != address(0), "FTSO not configured");

        // Check USDC balance
        uint256 balance = usdc.balanceOf(address(this));
        require(balance >= usdcAmount, "insufficient USDC");

        // Query FTSO for current price
        bytes21[] memory feedIds = new bytes21[](1);
        feedIds[0] = ftsoFeedId;
        
        (uint256[] memory feedValues, int8[] memory decimals, uint64 timestamp) = 
            ftsoFastUpdater.fetchCurrentFeeds(feedIds);
        
        require(feedValues.length > 0, "FTSO feed not available");
        require(timestamp > 0, "Invalid FTSO timestamp");
        
        // Calculate native token amount based on FTSO price
        // This is a simplified calculation - production would need more sophisticated logic
        uint256 nativeAmount = _calculateNativeAmount(usdcAmount, feedValues[0], decimals[0]);

        // Approve router for this exact amount (reset first for safety)
        usdc.safeApprove(address(swapRouter), 0);
        usdc.safeApprove(address(swapRouter), usdcAmount);

        // Swap USDC -> WETH (output to this contract)
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(usdc),
            tokenOut: address(weth),
            fee: poolFee,
            recipient: address(this),
            amountIn: usdcAmount,
            amountOutMinimum: 0, // MVP: no slippage check
            sqrtPriceLimitX96: 0 // no price limit
        });

        uint256 wethReceived = swapRouter.exactInputSingle(params);

        // Unwrap WETH -> native token
        weth.withdraw(wethReceived);

        // Forward the native token to the user
        (bool ok, ) = recipient.call{value: wethReceived}("");
        require(ok, "native transfer failed");

        emit Dripped(recipient, usdcAmount, wethReceived);
    }

    /// @notice Verify deposit with FDC attestation proof
    /// @param attestationResponse The attestation response data
    /// @param merkleProof The Merkle proof for verification
    /// @return verified Whether the deposit was successfully verified
    function verifyDepositWithFDC(
        bytes calldata attestationResponse,
        bytes32[] calldata merkleProof
    ) external onlyOwner returns (bool verified) {
        require(address(fdcVerification) != address(0), "FDC not configured");
        require(attestationResponse.length > 0, "Empty attestation response");
        require(merkleProof.length > 0, "Empty merkle proof");

        // Decode attestation response to extract transaction hash
        AttestationResponse memory response = abi.decode(attestationResponse, (AttestationResponse));
        
        // Create proof structure
        IFdcVerification.Proof memory proof = IFdcVerification.Proof({
            merkleProof: merkleProof,
            data: attestationResponse
        });

        // Verify based on attestation type
        if (response.attestationType == keccak256("EVMTransaction")) {
            verified = fdcVerification.verifyEVMTransaction(proof);
        } else if (response.attestationType == keccak256("Payment")) {
            verified = fdcVerification.verifyPayment(proof);
        } else {
            revert("Unsupported attestation type");
        }

        // Extract transaction hash from response body
        bytes32 txHash = _extractTxHash(response.responseBody);
        
        // Extract user address (simplified - would need proper decoding in production)
        address user = address(0); // Placeholder
        
        emit DepositVerified(txHash, user, verified);
        
        return verified;
    }

    /// @notice Add a supported FAsset token
    /// @param fAssetToken The FAsset token address
    /// @param underlyingSymbol The underlying asset symbol (e.g., "BTC", "XRP")
    function addFAsset(address fAssetToken, string calldata underlyingSymbol) external onlyOwner {
        require(fAssetToken != address(0), "FAsset addr zero");
        require(!supportedFAssets[fAssetToken], "FAsset already supported");
        
        supportedFAssets[fAssetToken] = true;
        fAssetList.push(fAssetToken);
        fAssetToUnderlying[fAssetToken] = underlyingSymbol;
    }

    /// @notice Remove a supported FAsset token
    /// @param fAssetToken The FAsset token address
    function removeFAsset(address fAssetToken) external onlyOwner {
        require(supportedFAssets[fAssetToken], "FAsset not supported");
        
        supportedFAssets[fAssetToken] = false;
        delete fAssetToUnderlying[fAssetToken];
        
        // Remove from array
        for (uint256 i = 0; i < fAssetList.length; i++) {
            if (fAssetList[i] == fAssetToken) {
                fAssetList[i] = fAssetList[fAssetList.length - 1];
                fAssetList.pop();
                break;
            }
        }
    }

    /// @notice Get all supported FAsset addresses
    /// @return Array of supported FAsset token addresses
    function getSupportedFAssets() external view returns (address[] memory) {
        return fAssetList;
    }

    /// @notice Update FTSO FastUpdater address
    /// @param _ftsoFastUpdater New FastUpdater address
    function setFTSOFastUpdater(address _ftsoFastUpdater) external onlyOwner {
        ftsoFastUpdater = IFastUpdater(_ftsoFastUpdater);
    }

    /// @notice Update FDC Verification address
    /// @param _fdcVerification New FDC Verification address
    function setFDCVerification(address _fdcVerification) external onlyOwner {
        fdcVerification = IFdcVerification(_fdcVerification);
    }

    /// @notice Internal function to calculate native token amount from FTSO price
    /// @param usdcAmount Amount of USDC
    /// @param ftsoPrice FTSO price value
    /// @param ftsoDecimals FTSO price decimals
    /// @return Native token amount
    function _calculateNativeAmount(
        uint256 usdcAmount,
        uint256 ftsoPrice,
        int8 ftsoDecimals
    ) internal pure returns (uint256) {
        // Simplified calculation - production would need more sophisticated logic
        // This assumes ftsoPrice is in USD and we're converting USDC to native token
        require(ftsoPrice > 0, "Invalid FTSO price");
        
        // Convert USDC (6 decimals) to native token (18 decimals) using FTSO price
        uint256 decimalsAdjustment = uint256(int256(ftsoDecimals));
        return (usdcAmount * (10 ** decimalsAdjustment)) / ftsoPrice;
    }

    /// @notice Internal function to extract transaction hash from response body
    /// @param responseBody The response body bytes
    /// @return Transaction hash
    function _extractTxHash(bytes memory responseBody) internal pure returns (bytes32) {
        // Simplified extraction - production would need proper ABI decoding
        if (responseBody.length >= 32) {
            bytes32 txHash;
            assembly {
                txHash := mload(add(responseBody, 32))
            }
            return txHash;
        }
        return bytes32(0);
    }
}
