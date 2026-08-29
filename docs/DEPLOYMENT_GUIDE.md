# Treasury Demo System Deployment Guide

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


## Overview

This guide walks you through deploying the Gas Provider Treasury Demo System from scratch. The deployment process includes setting up the database, deploying smart contracts to multiple chains, configuring the backend, and launching the frontend.

**Estimated Time**: 2-3 hours for complete deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Architecture](#system-architecture)
3. [Step 1: Environment Setup](#step-1-environment-setup)
4. [Step 2: Database Setup](#step-2-database-setup)
5. [Step 3: Smart Contract Deployment](#step-3-smart-contract-deployment)
6. [Step 4: Treasury Funding](#step-4-treasury-funding)
7. [Step 5: Backend Deployment](#step-5-backend-deployment)
8. [Step 6: Frontend Deployment](#step-6-frontend-deployment)
9. [Step 7: Testing and Verification](#step-7-testing-and-verification)
10. [Troubleshooting](#troubleshooting)
11. [Production Considerations](#production-considerations)

---

## Prerequisites

### Required Software

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v14.x or higher
- **Git**: Latest version

### Required Accounts

- **Wallet**: MetaMask or similar (with testnet funds)
- **Block Explorer API Keys** (optional, for contract verification):
  - Etherscan
  - PolygonScan
  - Arbiscan
  - Basescan
  - Snowtrace
  - BSCScan

### Testnet Funds

You'll need native tokens on all supported testnets:

| Chain | Faucet URL |
|-------|------------|
| Flare Coston2 | https://faucet.flare.network/ |
| Ethereum Sepolia | https://sepoliafaucet.com/ |
| Polygon Amoy | https://faucet.polygon.technology/ |
| Arbitrum Sepolia | https://faucet.quicknode.com/arbitrum/sepolia |
| Optimism Sepolia | https://app.optimism.io/faucet |
| Base Sepolia | https://www.coinbase.com/faucets/base-ethereum-goerli-faucet |
| Avalanche Fuji | https://faucet.avax.network/ |
| BSC Testnet | https://testnet.bnbchain.org/faucet-smart |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    Hosted on Vercel/Netlify                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Backend API (Fastify + Prisma)                      │
│                  Hosted on AWS/Railway                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────────┐
│   PostgreSQL  │         │  Treasury Smart  │
│   Database    │         │    Contracts     │
│               │         │  (11 Testnets)   │
└───────────────┘         └──────────────────┘
```

---

## Step 1: Environment Setup

### 1.1 Clone the Repository

```bash
git clone https://github.com/your-org/gas-fountain.git
cd gas-fountain
```

### 1.2 Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install contract dependencies
cd ../contracts
npm install
```

### 1.3 Create Environment Files

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
touch .env

# Contracts
cd ../contracts
cp .env.example .env
```

### 1.4 Generate Deployment Wallet

```bash
cd contracts

# Generate a new wallet for deployment
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# This outputs a private key like:
# 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Add 0x prefix and save to contracts/.env
echo "DEPLOYER_PRIVATE_KEY=0x1234567890abcdef..." >> .env
```

**⚠️ Important**: 
- Save this private key securely
- Fund this wallet with testnet tokens on all chains
- Never commit this key to version control

---

## Step 2: Database Setup

### 2.1 Install PostgreSQL

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS**:
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows**:
Download from https://www.postgresql.org/download/windows/

### 2.2 Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE gasfountain;
CREATE USER gasfountain WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE gasfountain TO gasfountain;

# Exit
\q
```

### 2.3 Configure Database Connection

Edit `backend/.env`:

```bash
DATABASE_URL=postgresql://gasfountain:your_secure_password@localhost:5432/gasfountain?schema=public
```

### 2.4 Run Migrations

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify database setup
npx prisma studio
```

---

## Step 3: Smart Contract Deployment

### 3.1 Fund Deployment Wallet

Get the wallet address:

```bash
cd contracts
npm run get-address
```

Fund this address with testnet tokens on all chains (see [Testnet Funds](#testnet-funds)).

### 3.2 Configure Deployment

Edit `contracts/.env`:

```bash
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...

# Optional: Add block explorer API keys for verification
ETHERSCAN_API_KEY=YOUR_KEY
POLYGONSCAN_API_KEY=YOUR_KEY
ARBISCAN_API_KEY=YOUR_KEY
```

### 3.3 Deploy to All Chains

```bash
cd contracts

# Deploy Treasury contracts to all testnets
npm run deploy:all

# This will deploy to:
# - Flare Coston2
# - Ethereum Sepolia
# - Polygon Amoy
# - Arbitrum Sepolia
# - Optimism Sepolia
# - Base Sepolia
# - World Sepolia
# - Zora Sepolia
# - Scroll Sepolia
# - Avalanche Fuji
# - BSC Testnet
```

**Expected Output**:
```
Deploying Treasury to Coston2...
✓ Treasury deployed to: 0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63

Deploying Treasury to Sepolia...
✓ Treasury deployed to: 0x5b402676535a3ba75c851c14e1e249a4257d2265

...

Deployment Summary:
- Total chains: 11
- Successful: 11
- Failed: 0

Addresses saved to: deployments/treasury-addresses.json
```

### 3.4 Verify Contracts (Optional)

```bash
# Verify on Coston2
npm run verify:coston2

# Verify on Sepolia
npm run verify:sepolia

# Verify all
npm run verify:all
```

### 3.5 Save Contract Addresses

The deployment script automatically saves addresses to `contracts/deployments/treasury-addresses.json`.

Copy these addresses to your backend configuration:

```bash
cd backend

# Extract addresses and add to .env
node scripts/extract-treasury-addresses.js
```

Or manually add to `backend/.env`:

```bash
TREASURY_ADDRESS_114=0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63
TREASURY_ADDRESS_11155111=0x5b402676535a3ba75c851c14e1e249a4257d2265
# ... (add all 11 addresses)
```

---

## Step 4: Treasury Funding

### 4.1 Fund Treasuries with Native Tokens

```bash
cd contracts

# Fund all treasuries with native tokens
npm run fund:all

# Or fund specific chains
npm run fund:coston2
npm run fund:sepolia
```

**Recommended Amounts**:
- Coston2: 1000 C2FLR
- Sepolia: 0.5 ETH
- Polygon Amoy: 100 MATIC
- Arbitrum Sepolia: 0.5 ETH
- Optimism Sepolia: 0.5 ETH
- Base Sepolia: 0.5 ETH
- Avalanche Fuji: 10 AVAX
- BSC Testnet: 1 BNB

### 4.2 Verify Treasury Balances

```bash
cd contracts

# Check balances on all chains
npm run verify:balances

# Expected output:
# Coston2: 1000 C2FLR
# Sepolia: 0.5 ETH
# ...
```

### 4.3 Fund with Stablecoins (Optional)

If you want to test with USDC/USDT:

```bash
# Deploy mock tokens (testnet only)
npm run deploy:mock-tokens

# Fund treasuries with mock USDC
npm run fund:usdc
```

---

## Step 5: Backend Deployment

### 5.1 Configure Backend

Edit `backend/.env`:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://gasfountain:password@localhost:5432/gasfountain

# Blockchain
DISTRIBUTOR_PRIVATE_KEY=0x1234567890abcdef...

# Treasury Addresses (from Step 3.5)
TREASURY_ADDRESS_114=0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63
TREASURY_ADDRESS_11155111=0x5b402676535a3ba75c851c14e1e249a4257d2265
# ... (all 11 addresses)

# Optional: Custom RPC endpoints
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
```

### 5.2 Build Backend

```bash
cd backend

# Build TypeScript
npm run build

# Test the build
npm run start
```

### 5.3 Deploy to Production

**Option A: Deploy to Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up
```

**Option B: Deploy to AWS EC2**

```bash
# SSH to your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone repository
git clone https://github.com/your-org/gas-fountain.git
cd gas-fountain/backend

# Install dependencies
npm install

# Setup PM2
npm install -g pm2
pm2 start npm --name "gas-fountain-api" -- start
pm2 save
pm2 startup
```

**Option C: Deploy with Docker**

```bash
cd backend

# Build Docker image
docker build -t gas-fountain-backend .

# Run container
docker run -d \
  --name gas-fountain-api \
  -p 3000:3000 \
  --env-file .env \
  gas-fountain-backend
```

### 5.4 Verify Backend

```bash
# Production API
curl https://backend-production-6f62.up.railway.app/health

# Test supported chains endpoint
curl https://backend-production-6f62.up.railway.app/api/chains/supported

# Test treasury balances
curl https://backend-production-6f62.up.railway.app/api/treasury/balances
```

---

## Step 6: Frontend Deployment

### 6.1 Configure Frontend

Edit `frontend/.env` (local) or Vercel Production env:

```bash
VITE_API_URL=https://backend-production-6f62.up.railway.app
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_ENABLE_TESTNET=true
```

### 6.2 Build Frontend

```bash
cd frontend

# Build for production
npm run build

# Test the build locally
npm run preview
```

### 6.3 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Or use Vercel Dashboard**:
1. Go to https://vercel.com
2. Import your Git repository
3. Configure environment variables
4. Deploy

### 6.4 Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### 6.5 Configure Custom Domain (Optional)

**Vercel**:
```bash
vercel domains add your-domain.com
```

**Netlify**:
```bash
netlify domains:add your-domain.com
```

---

## Step 7: Testing and Verification

### 7.1 Testing Checklist

Use this checklist to verify your deployment:

#### Smart Contracts
- [ ] All 11 Treasury contracts deployed
- [ ] All contracts verified on block explorers
- [ ] All Treasuries funded with native tokens
- [ ] Treasury balances visible onchain

#### Backend
- [ ] Backend server running and accessible
- [ ] Database connected and migrations applied
- [ ] All Treasury addresses configured
- [ ] RPC endpoints responding
- [ ] API endpoints returning data

#### Frontend
- [ ] Frontend accessible via URL
- [ ] Wallet connection working
- [ ] All chains visible in UI
- [ ] Price calculations displaying
- [ ] Transaction flow working

### 7.2 End-to-End Test

Perform a complete deposit-to-distribution flow:

```bash
# 1. Connect wallet to frontend
# 2. Select source chain (any chain)
# 3. Select destination chains (2-3 chains)
# 4. Enter deposit amount (e.g., 10 USDC)
# 5. Review gas estimates
# 6. Confirm transaction
# 7. Monitor distribution progress
# 8. Verify transactions on block explorers
# 9. Check activity log
```

### 7.3 Automated Tests

```bash
# Run backend tests
cd backend
npm run test

# Run contract tests
cd ../contracts
npm run test

# Run integration tests
cd ../backend
npm run test:integration
```

### 7.4 Monitor Logs

```bash
# Backend logs
cd backend
npm run logs

# Or with PM2
pm2 logs gas-fountain-api

# Or with Docker
docker logs -f gas-fountain-api
```

---

## Troubleshooting

### Issue: Contract Deployment Fails

**Symptoms**: Deployment script errors or reverts

**Solutions**:
1. Check wallet has sufficient testnet funds
2. Verify RPC endpoint is responding
3. Increase gas limit in deployment script
4. Try alternative RPC endpoint
5. Check network congestion

```bash
# Test RPC endpoint
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://coston2-api.flare.network/ext/C/rpc
```

---

### Issue: Database Connection Fails

**Symptoms**: Backend won't start, database errors

**Solutions**:
1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Verify database credentials
4. Check firewall rules
5. Test connection manually

```bash
# Test database connection
psql postgresql://gasfountain:password@localhost:5432/gasfountain

# Check PostgreSQL status
sudo systemctl status postgresql
```

---

### Issue: Backend Can't Connect to Chains

**Symptoms**: RPC errors, timeout errors

**Solutions**:
1. Verify RPC endpoints are accessible
2. Check firewall/network settings
3. Try alternative RPC providers
4. Increase timeout values
5. Check rate limits

```bash
# Test RPC connectivity
npm run test:rpc
```

---

### Issue: Frontend Can't Connect to Backend

**Symptoms**: API errors, CORS errors

**Solutions**:
1. Verify backend URL in frontend .env
2. Check CORS configuration in backend
3. Verify backend is running
4. Check SSL/TLS certificates
5. Test API endpoints directly

```bash
# Test backend API
curl https://backend-production-6f62.up.railway.app/health
```

---

### Issue: Transactions Failing

**Symptoms**: Distributions fail, insufficient balance errors

**Solutions**:
1. Check Treasury balances
2. Verify gas estimates
3. Check nonce management
4. Verify private key has permissions
5. Check transaction logs

```bash
# Check Treasury balances
npm run verify:balances

# Check transaction logs
npm run logs:transactions
```

---

## Production Considerations

### Security

1. **Private Key Management**:
   - Use hardware wallets for mainnet
   - Implement key rotation
   - Use AWS KMS or HashiCorp Vault
   - Never commit keys to version control

2. **Database Security**:
   - Use SSL/TLS connections
   - Implement IP whitelisting
   - Regular backups
   - Encryption at rest

3. **API Security**:
   - Implement rate limiting
   - Use API keys for authentication
   - Enable HTTPS only
   - Implement request validation

### Monitoring

1. **Application Monitoring**:
   - Set up error tracking (Sentry, Rollbar)
   - Monitor API response times
   - Track transaction success rates
   - Alert on failures

2. **Infrastructure Monitoring**:
   - Monitor server resources (CPU, memory, disk)
   - Track database performance
   - Monitor RPC endpoint health
   - Set up uptime monitoring

3. **Blockchain Monitoring**:
   - Monitor Treasury balances
   - Track gas prices
   - Monitor transaction confirmations
   - Alert on low balances

### Scaling

1. **Backend Scaling**:
   - Use load balancer
   - Implement horizontal scaling
   - Add caching layer (Redis)
   - Optimize database queries

2. **Database Scaling**:
   - Implement read replicas
   - Use connection pooling
   - Optimize indexes
   - Archive old data

3. **RPC Scaling**:
   - Use multiple RPC providers
   - Implement request caching
   - Load balance RPC calls
   - Monitor rate limits

### Maintenance

1. **Regular Updates**:
   - Update dependencies monthly
   - Apply security patches immediately
   - Update exchange rates weekly
   - Review and optimize code

2. **Backup Strategy**:
   - Daily database backups
   - Store backups offsite
   - Test restore procedures
   - Document recovery process

3. **Incident Response**:
   - Create runbook for common issues
   - Define escalation procedures
   - Maintain on-call rotation
   - Conduct post-mortems

---

## Next Steps

After successful deployment:

1. **Monitor System**: Watch logs and metrics for the first 24 hours
2. **Test Thoroughly**: Run multiple test transactions
3. **Document Issues**: Keep track of any problems encountered
4. **Optimize Performance**: Identify and fix bottlenecks
5. **Plan Upgrades**: Schedule regular maintenance windows

---

## Related Documentation

- [Treasury Addresses](./TREASURY_ADDRESSES.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)
- [Exchange Rate Configuration](./EXCHANGE_RATE_CONFIGURATION.md)
- [User Guide](./USER_GUIDE.md)
