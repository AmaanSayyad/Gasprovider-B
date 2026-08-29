# Gas Provider User Guide

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).

**Live app:** https://gas-provider.vercel.app  
**Demo video:** https://youtu.be/XTCR6daMmE0  
**Pitch deck:** https://docs.google.com/presentation/d/1dcDHlryNzrDfVudiqPB-xnrNiIX9w971PFaoAP4Jztk/edit?usp=sharing


## Welcome to Gas Provider! 🚀

Gas Provider is a multi-chain gas distribution platform that allows you to deposit tokens on one chain and receive native gas tokens on multiple destination chains. This guide will walk you through using the platform step by step.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Making Your First Deposit](#making-your-first-deposit)
3. [Tracking Your Transactions](#tracking-your-transactions)
4. [Understanding the Activity Log](#understanding-the-activity-log)
5. [Supported Chains and Tokens](#supported-chains-and-tokens)
6. [How It Works](#how-it-works)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### What You'll Need

1. **A Web3 Wallet**: MetaMask, WalletConnect, or similar
2. **Testnet Tokens**: Get free testnet tokens from faucets (see [Supported Chains](#supported-chains-and-tokens))
3. **A Web Browser**: Chrome, Firefox, or Brave recommended

### Step 1: Connect Your Wallet

1. Visit the Gas Fountain website
2. Click **"Connect Wallet"** in the top right corner
3. Select your wallet provider (MetaMask, WalletConnect, etc.)
4. Approve the connection request in your wallet
5. Your wallet address will appear in the top right

**Tip**: Make sure you're connected to a supported testnet!

---

## Making Your First Deposit

### Overview

The deposit process has 4 simple steps:
1. Select source chain and token
2. Choose destination chains
3. Review gas estimates
4. Confirm and track

### Step 1: Select Source Chain and Token

1. **Choose Source Chain**: Click the source chain dropdown and select any supported chain
   - Note: In the demo system, all deposits are processed through the Treasury system regardless of which chain you select

2. **Select Token**: Click the token dropdown and choose your deposit token
   - Supported tokens: USDC, USDT, FLR, WFLR

3. **Enter Amount**: Type the amount you want to deposit
   - Minimum: 1 USDC (or equivalent)
   - Maximum: Based on your wallet balance

**Example**:
```
Source Chain: Ethereum Sepolia
Token: USDC
Amount: 100
```

### Step 2: Choose Destination Chains

1. **Select Destination Chains**: Check the boxes for chains where you want to receive gas
   - You can select multiple chains
   - Each chain shows its native token (ETH, MATIC, AVAX, etc.)

2. **Adjust Allocation** (Optional): Use the sliders to adjust how much gas you want on each chain
   - Default: Equal distribution across all selected chains
   - Total must equal 100%

**Example**:
```
✓ Ethereum Sepolia (50%)
✓ Polygon Amoy (30%)
✓ Arbitrum Sepolia (20%)
```

### Step 3: Review Gas Estimates

The platform will show you:

- **USD Value**: Total value of your deposit
- **Gas Amounts**: How much native gas you'll receive on each chain
- **Exchange Rates**: Current rates used for calculations
- **Estimated Time**: Expected completion time

**Example**:
```
Deposit: 100 USDC ($100)

You will receive:
- Ethereum Sepolia: 0.025 ETH ($50)
- Polygon Amoy: 37.5 MATIC ($30)
- Arbitrum Sepolia: 0.01 ETH ($20)
```

### Step 4: Confirm Transaction

1. Click **"Confirm Deposit"**
2. Review the transaction details in your wallet
3. Approve the transaction
4. Wait for confirmation

**What Happens Next**:
- Your deposit is recorded
- Treasury contracts on each destination chain are triggered
- Native gas is distributed to your wallet address
- You can track progress in real-time

---

## Tracking Your Transactions

### Real-Time Progress

After confirming your deposit, you'll see a progress screen showing:

1. **Overall Status**: Created → Validating → Distributing → Completed
2. **Per-Chain Status**: Individual progress for each destination chain
3. **Transaction Hashes**: Links to block explorers for each transaction
4. **Confirmations**: Number of block confirmations for each transaction

**Status Indicators**:
- 🟡 **Pending**: Transaction submitted, waiting for confirmation
- 🔵 **Processing**: Transaction confirmed, waiting for finality
- 🟢 **Completed**: Transaction fully confirmed
- 🔴 **Failed**: Transaction failed (see error message)

### Viewing Transaction Details

Click on any transaction hash to:
- View the transaction on the block explorer
- See gas used and transaction fee
- Verify the recipient address
- Check block number and timestamp

**Example Transaction Hash**:
```
Ethereum Sepolia: 0x1234...5678
→ Opens Sepolia Etherscan
```

---

## Understanding the Activity Log

### Accessing Your History

1. Click **"Activity"** in the navigation menu
2. View all your past deposits and distributions
3. Filter by status, chain, or date
4. Search by transaction hash or intent ID

### Activity Log Details

Each entry shows:

- **Timestamp**: When the deposit was initiated
- **Source**: Chain and token you deposited
- **Amount**: How much you deposited (in USD)
- **Destinations**: Which chains received gas
- **Status**: Current status of the intent
- **Actions**: View details, copy transaction hashes

**Example Entry**:
```
Deposited 100 USDC on Ethereum Sepolia
Distributed to 3 chains
Status: Completed ✓
```

### Filtering and Searching

- **Filter by Status**: Show only completed, pending, or failed transactions
- **Filter by Chain**: Show transactions for specific chains
- **Search**: Find transactions by hash or intent ID
- **Date Range**: View transactions from specific time periods

---

## Supported Chains and Tokens

### Supported Chains

| Chain | Chain ID | Native Token | Faucet |
|-------|----------|--------------|--------|
| Flare Coston2 | 114 | C2FLR | [Get C2FLR](https://faucet.flare.network/) |
| Ethereum Sepolia | 11155111 | ETH | [Get ETH](https://sepoliafaucet.com/) |
| Polygon Amoy | 80002 | MATIC | [Get MATIC](https://faucet.polygon.technology/) |
| Arbitrum Sepolia | 421614 | ETH | [Get ETH](https://faucet.quicknode.com/arbitrum/sepolia) |
| Optimism Sepolia | 11155420 | ETH | [Get ETH](https://app.optimism.io/faucet) |
| Base Sepolia | 84532 | ETH | [Get ETH](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) |
| World Sepolia | 4801 | ETH | [Get ETH](https://worldchain-sepolia.g.alchemy.com/public) |
| Zora Sepolia | 999999999 | ETH | [Get ETH](https://sepolia.rpc.zora.energy) |
| Scroll Sepolia | 534351 | ETH | [Get ETH](https://sepolia-rpc.scroll.io) |
| Avalanche Fuji | 43113 | AVAX | [Get AVAX](https://faucet.avax.network/) |
| BSC Testnet | 97 | tBNB | [Get BNB](https://testnet.bnbchain.org/faucet-smart) |

### Supported Tokens

| Token | Symbol | Decimals | Description |
|-------|--------|----------|-------------|
| USD Coin | USDC | 6 | Stablecoin pegged to USD |
| Tether | USDT | 6 | Stablecoin pegged to USD |
| Flare | FLR | 18 | Native Flare token |
| Wrapped Flare | WFLR | 18 | Wrapped FLR token |

---

## How It Works

### The Treasury System

Gas Fountain uses a simplified Treasury-based architecture:

1. **Deposit**: You deposit tokens (appears to be on any chain)
2. **Routing**: Backend routes your request to the Treasury system
3. **Calculation**: System calculates gas amounts using exchange rates
4. **Distribution**: Treasury contracts on each chain send you native gas
5. **Confirmation**: You receive real blockchain transactions

### Exchange Rates

The demo system uses hardcoded exchange rates:

- **USDC/USDT**: $1.00
- **FLR/WFLR**: $0.02
- **ETH**: $2,000
- **BNB**: $300
- **MATIC**: $0.80
- **AVAX**: $25

**Note**: These are demo rates. Production will use live oracle feeds.

### Transaction Flow

```
1. User deposits 100 USDC
   ↓
2. System calculates: $100 USD value
   ↓
3. User selects 3 destination chains
   ↓
4. System distributes:
   - Ethereum: 0.025 ETH ($50)
   - Polygon: 62.5 MATIC ($50)
   ↓
5. User receives gas on both chains
```

---

## Troubleshooting

### Issue: Wallet Won't Connect

**Symptoms**: Connection button doesn't work or wallet doesn't appear

**Solutions**:
1. Refresh the page
2. Check if wallet extension is installed
3. Try a different browser
4. Clear browser cache
5. Update wallet extension

---

### Issue: Transaction Stuck on "Pending"

**Symptoms**: Transaction shows pending for a long time

**Solutions**:
1. Check the block explorer for transaction status
2. Verify the network isn't congested
3. Wait for more confirmations (can take 1-5 minutes)
4. Contact support if stuck for >10 minutes

---

### Issue: "Insufficient Balance" Error

**Symptoms**: Can't complete deposit, balance error

**Solutions**:
1. Check your wallet balance
2. Ensure you have enough tokens
3. Account for gas fees
4. Try a smaller amount
5. Get more tokens from faucet

---

### Issue: Wrong Network

**Symptoms**: Wallet shows wrong network, can't see balances

**Solutions**:
1. Open your wallet
2. Click the network dropdown
3. Select the correct testnet
4. Refresh the Gas Fountain page

---

### Issue: Transaction Failed

**Symptoms**: Transaction shows "Failed" status

**Solutions**:
1. Check the error message in activity log
2. Verify Treasury has sufficient balance
3. Check if network is operational
4. Try again with a smaller amount
5. Contact support with transaction hash

---

### Issue: Can't See My Transaction

**Symptoms**: Transaction not appearing in activity log

**Solutions**:
1. Refresh the page
2. Check if you're connected with the correct wallet
3. Verify the transaction was confirmed
4. Check the block explorer directly
5. Clear browser cache

---

## FAQ

### General Questions

**Q: Is this real money?**
A: No, this is a testnet demo using test tokens with no real value.

**Q: How long do transactions take?**
A: Typically 1-5 minutes depending on network congestion.

**Q: Can I cancel a transaction?**
A: No, once confirmed on the blockchain, transactions cannot be cancelled.

**Q: What are the fees?**
A: The demo system has no fees. You only pay gas for the initial deposit transaction.

**Q: Is there a minimum deposit?**
A: Yes, minimum is 1 USDC or equivalent.

**Q: Is there a maximum deposit?**
A: Limited by Treasury liquidity. Check Treasury balances before large deposits.

---

### Technical Questions

**Q: Which wallets are supported?**
A: MetaMask, WalletConnect, Coinbase Wallet, and most Web3 wallets.

**Q: Can I use mainnet?**
A: Not yet. This is a testnet demo. Mainnet support coming soon.

**Q: How are exchange rates determined?**
A: Currently using hardcoded rates. Production will use Flare FTSO oracles.

**Q: Are transactions really onchain?**
A: Yes! All distributions are real blockchain transactions you can verify.

**Q: What happens if a chain is down?**
A: That specific distribution will fail, but others will complete successfully.

**Q: Can I deposit on one chain and receive on the same chain?**
A: Yes, you can select the same chain as both source and destination.

---

### Troubleshooting Questions

**Q: Why is my transaction taking so long?**
A: Network congestion or RPC issues. Check block explorer for status.

**Q: I didn't receive my gas, what happened?**
A: Check activity log for errors. Verify transaction on block explorer.

**Q: Can I get a refund?**
A: This is a demo system with test tokens. No refunds needed.

**Q: Who do I contact for support?**
A: Check the troubleshooting section or join our Discord community.

---

## Best Practices

### For Best Results

1. **Start Small**: Try a small deposit first to test the system
2. **Check Balances**: Verify Treasury has sufficient liquidity
3. **Use Reliable Networks**: Some testnets are more stable than others
4. **Save Transaction Hashes**: Keep records of your transactions
5. **Monitor Progress**: Watch the progress screen until completion

### Security Tips

1. **Never Share Private Keys**: Gas Fountain never asks for your private key
2. **Verify URLs**: Always check you're on the correct website
3. **Use Test Tokens Only**: This is a demo, don't send real assets
4. **Keep Wallet Updated**: Use the latest version of your wallet
5. **Review Transactions**: Always review before confirming

---

### Before Asking for Help

Please have ready:
1. Your wallet address
2. Transaction hash (if applicable)
3. Intent ID (from activity log)
4. Screenshots of any errors
5. Which browser and wallet you're using

---

## What's Next?

### Upcoming Features

- Live oracle price feeds (FTSO integration)
- More supported chains
- Additional tokens (FAssets)
- Mainnet deployment
- Mobile app
- Advanced allocation strategies


**Thank you for using Gas Provider! 🚀**

We're building the future of multi-chain gas distribution, and you're part of it.

---
