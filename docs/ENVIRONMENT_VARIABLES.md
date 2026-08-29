# Environment Variables Documentation

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


## Overview

This document lists all environment variables required to run the Gas Provider Treasury Demo System. The system consists of three main components: Backend API, Frontend, and Smart Contracts.

---

## Table of Contents

1. [Backend Environment Variables](#backend-environment-variables)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Contract Deployment Variables](#contract-deployment-variables)
4. [Example .env Files](#example-env-files)
5. [Setup Instructions](#setup-instructions)

---

## Backend Environment Variables

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode: `development`, `production`, or `test` |
| `PORT` | No | `3000` | Port number for the API server |
| `HOST` | No | `0.0.0.0` | Host address to bind the server |

**Example**:
```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
```

---

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `DB_HOST` | No | `localhost` | Database host address |
| `DB_PORT` | No | `5432` | Database port |
| `DB_USER` | No | `gasfountain` | Database username |
| `DB_PASSWORD` | Yes | - | Database password |
| `DB_NAME` | No | `gasfountain` | Database name |

**Example**:
```bash
DATABASE_URL=postgresql://gasfountain:password123@localhost:5432/gasfountain?schema=public
DB_HOST=localhost
DB_PORT=5432
DB_USER=gasfountain
DB_PASSWORD=password123
DB_NAME=gasfountain
```

**Note**: If `DATABASE_URL` is provided, individual `DB_*` variables are not required.

---

### Blockchain Configuration

#### Private Key (REQUIRED)

| Variable | Required | Description |
|----------|----------|-------------|
| `DISTRIBUTOR_PRIVATE_KEY` | Yes | Private key of the wallet that owns Treasury contracts and executes distributions |

**Format**: `0x` followed by 64 hexadecimal characters

**Example**:
```bash
DISTRIBUTOR_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**⚠️ Security Warning**: 
- Never commit this key to version control
- Use different keys for testnet and mainnet
- Store production keys in secure key management systems (AWS KMS, HashiCorp Vault, etc.)

---

### Treasury Contract Addresses

Each supported chain requires its Treasury contract address:

| Variable | Chain | Chain ID | Required |
|----------|-------|----------|----------|
| `TREASURY_ADDRESS_114` | Flare Coston2 | 114 | Yes |
| `TREASURY_ADDRESS_11155111` | Ethereum Sepolia | 11155111 | Yes |
| `TREASURY_ADDRESS_80002` | Polygon Amoy | 80002 | Yes |
| `TREASURY_ADDRESS_421614` | Arbitrum Sepolia | 421614 | Yes |
| `TREASURY_ADDRESS_11155420` | Optimism Sepolia | 11155420 | Yes |
| `TREASURY_ADDRESS_84532` | Base Sepolia | 84532 | Yes |
| `TREASURY_ADDRESS_4801` | World Sepolia | 4801 | Yes |
| `TREASURY_ADDRESS_999999999` | Zora Sepolia | 999999999 | Yes |
| `TREASURY_ADDRESS_534351` | Scroll Sepolia | 534351 | Yes |
| `TREASURY_ADDRESS_43113` | Avalanche Fuji | 43113 | Yes |
| `TREASURY_ADDRESS_97` | BSC Testnet | 97 | Yes |

**Example**:
```bash
TREASURY_ADDRESS_114=0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63
TREASURY_ADDRESS_11155111=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_80002=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_421614=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_11155420=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_84532=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_4801=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_999999999=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_534351=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_43113=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_97=0x5b402676535a3ba75c851c14e1e249a4257d2265
```

---

### RPC Endpoints (Optional)

Custom RPC URLs for each chain. If not provided, public RPC endpoints are used as defaults.

| Variable | Chain | Default |
|----------|-------|---------|
| `COSTON2_RPC_URL` | Flare Coston2 | `https://coston2-api.flare.network/ext/C/rpc` |
| `FLARE_RPC_URL` | Flare Mainnet | `https://flare-api.flare.network/ext/C/rpc` |
| `SEPOLIA_RPC_URL` | Ethereum Sepolia | `https://ethereum-sepolia-rpc.publicnode.com` |
| `POLYGON_AMOY_RPC_URL` | Polygon Amoy | `https://rpc-amoy.polygon.technology` |
| `ARBITRUM_SEPOLIA_RPC_URL` | Arbitrum Sepolia | `https://sepolia-rollup.arbitrum.io/rpc` |
| `OPTIMISM_SEPOLIA_RPC_URL` | Optimism Sepolia | `https://sepolia.optimism.io` |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia | `https://sepolia.base.org` |
| `WORLD_SEPOLIA_RPC_URL` | World Sepolia | `https://worldchain-sepolia.g.alchemy.com/public` |
| `ZORA_SEPOLIA_RPC_URL` | Zora Sepolia | `https://sepolia.rpc.zora.energy` |
| `SCROLL_SEPOLIA_RPC_URL` | Scroll Sepolia | `https://sepolia-rpc.scroll.io` |
| `AVALANCHE_FUJI_RPC_URL` | Avalanche Fuji | `https://api.avax-test.network/ext/bc/C/rpc` |
| `BSC_TESTNET_RPC_URL` | BSC Testnet | `https://bsc-testnet-rpc.publicnode.com` |

**Example**:
```bash
# Optional: Use custom RPC endpoints
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

**Note**: The system includes fallback RPC endpoints, so these are optional. However, using dedicated RPC providers (Alchemy, Infura, etc.) can improve reliability and performance.

---

### Exchange Rate Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXCHANGE_RATES_FILE` | No | `./config/exchangeRates.json` | Path to exchange rates configuration file |
| `EXCHANGE_RATES_UPDATE_INTERVAL` | No | `3600000` | Interval to check for rate updates (milliseconds) |

**Example**:
```bash
EXCHANGE_RATES_FILE=./config/exchangeRates.json
EXCHANGE_RATES_UPDATE_INTERVAL=3600000  # 1 hour
```

---

### Monitoring and Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level: `error`, `warn`, `info`, `debug` |
| `ENABLE_METRICS` | No | `false` | Enable Prometheus metrics endpoint |
| `METRICS_PORT` | No | `9090` | Port for metrics endpoint |

**Example**:
```bash
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090
```

---

## Frontend Environment Variables

### API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API base URL |
| `VITE_WS_URL` | No | - | WebSocket URL for real-time updates |

**Example**:
```bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

### Wallet Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | No | - | WalletConnect project ID for wallet integration |

**Example**:
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

---

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_ENABLE_TESTNET` | No | `true` | Enable testnet chains |
| `VITE_ENABLE_MAINNET` | No | `false` | Enable mainnet chains |

**Example**:
```bash
VITE_ENABLE_TESTNET=true
VITE_ENABLE_MAINNET=false
```

---

## Contract Deployment Variables

### Hardhat Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Yes | Private key for deploying contracts |
| `ETHERSCAN_API_KEY` | No | API key for contract verification on Etherscan |
| `POLYGONSCAN_API_KEY` | No | API key for contract verification on PolygonScan |
| `ARBISCAN_API_KEY` | No | API key for contract verification on Arbiscan |
| `BASESCAN_API_KEY` | No | API key for contract verification on Basescan |
| `SNOWTRACE_API_KEY` | No | API key for contract verification on Snowtrace |
| `BSCSCAN_API_KEY` | No | API key for contract verification on BSCScan |

**Example**:
```bash
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY
```

---

## Example .env Files

### Backend .env Example

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://gasfountain:password123@localhost:5432/gasfountain?schema=public

# Blockchain Configuration
DISTRIBUTOR_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Treasury Contract Addresses
TREASURY_ADDRESS_114=0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63
TREASURY_ADDRESS_11155111=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_80002=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_421614=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_11155420=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_84532=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_4801=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_999999999=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_534351=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_43113=0x5b402676535a3ba75c851c14e1e249a4257d2265
TREASURY_ADDRESS_97=0x5b402676535a3ba75c851c14e1e249a4257d2265

# Optional: Custom RPC Endpoints
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Logging
LOG_LEVEL=info
```

---

### Frontend .env Example

```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Wallet Configuration
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Feature Flags
VITE_ENABLE_TESTNET=true
VITE_ENABLE_MAINNET=false
```

---

### Contracts .env Example

```bash
# Deployment Configuration
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Block Explorer API Keys (for verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY
ARBISCAN_API_KEY=YOUR_ARBISCAN_API_KEY
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
SNOWTRACE_API_KEY=YOUR_SNOWTRACE_API_KEY
BSCSCAN_API_KEY=YOUR_BSCSCAN_API_KEY

# RPC URLs (optional, for deployment)
COSTON2_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

---

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Copy example file
cp .env.example .env

# Edit with your values
nano .env

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Start the server
npm run dev
```

---

### 2. Frontend Setup

```bash
cd frontend

# Create .env file
touch .env

# Add configuration
echo "VITE_API_URL=http://localhost:3000" >> .env

# Install dependencies
npm install

# Start development server
npm run dev
```

---

### 3. Contracts Setup

```bash
cd contracts

# Copy example file
cp .env.example .env

# Edit with your deployer key
nano .env

# Install dependencies
npm install

# Deploy contracts
npm run deploy:all
```

---

## Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
VITE_API_URL=http://localhost:3000
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
VITE_API_URL=https://backend-production-6f62.up.railway.app
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
VITE_API_URL=https://backend-production-6f62.up.railway.app
ENABLE_METRICS=true
```

---

## Security Best Practices

### 1. Private Key Management

- **Never commit private keys to version control**
- Add `.env` to `.gitignore`
- Use different keys for testnet and mainnet
- Rotate keys regularly
- Use hardware wallets for production

### 2. Database Credentials

- Use strong passwords (minimum 16 characters)
- Restrict database access by IP
- Use SSL/TLS for database connections
- Rotate credentials periodically

### 3. API Keys

- Store API keys in environment variables
- Use different keys per environment
- Monitor API key usage
- Revoke unused keys

### 4. Production Deployment

- Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- Enable encryption at rest
- Use IAM roles instead of static credentials
- Implement key rotation policies

---

## Troubleshooting

### Issue: "Missing required environment variable"

**Solution**: Ensure all required variables are set in your `.env` file.

```bash
# Check which variables are missing
npm run check-env
```

---

### Issue: "Database connection failed"

**Solution**: Verify database credentials and connectivity.

```bash
# Test database connection
npm run test:db

# Check DATABASE_URL format
echo $DATABASE_URL
```

---

### Issue: "RPC connection timeout"

**Solution**: Check RPC endpoint availability or use alternative endpoints.

```bash
# Test RPC endpoint
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $COSTON2_RPC_URL
```

---

### Issue: "Invalid private key format"

**Solution**: Ensure private key starts with `0x` and is 64 hex characters.

```bash
# Correct format
DISTRIBUTOR_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Incorrect (missing 0x)
DISTRIBUTOR_PRIVATE_KEY=1234567890abcdef...
```

---

## Related Documentation

- [Treasury Addresses](./TREASURY_ADDRESSES.md)
- [Exchange Rate Configuration](./EXCHANGE_RATE_CONFIGURATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [User Guide](./USER_GUIDE.md)

---

## Support

For environment configuration issues:
- Check the example `.env` files in each directory
- Review the error logs for specific missing variables
- Ensure all required services (database, RPC endpoints) are accessible

---

