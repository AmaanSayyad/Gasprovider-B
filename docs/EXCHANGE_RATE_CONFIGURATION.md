# Exchange Rate Configuration

> **Flare Summer Signal · Track 1** — Pay FXRP/C2FLR on Coston2 → native gas on destination chains (FTSO + FDC + treasuries).


## Overview

The Gas Provider Treasury Demo System uses hardcoded exchange rates for calculating gas distributions. This simplified approach allows the demo to function without external oracle dependencies while maintaining realistic pricing calculations.

**Configuration File**: `backend/src/config/exchangeRates.json`

---

## Rate Structure

The exchange rate configuration consists of two main sections:

### 1. Token Rates

Token rates define the USD value of supported deposit tokens:

```json
{
  "tokens": {
    "USDC": 1.0,
    "USDT": 1.0,
    "FLR": 0.02,
    "WFLR": 0.02
  }
}
```

**Token Rate Format**:
- **Key**: Token symbol (string)
- **Value**: USD price per token (number)

### 2. Chain Rates

Chain rates define the USD value of native tokens on each supported blockchain:

```json
{
  "chains": {
    "114": {
      "chainId": 114,
      "name": "Coston2",
      "nativeSymbol": "C2FLR",
      "usdPrice": 0.02
    }
  }
}
```

**Chain Rate Format**:
- **chainId**: Numeric chain identifier
- **name**: Human-readable chain name
- **nativeSymbol**: Symbol of the native token
- **usdPrice**: USD price per native token

---

## Complete Configuration Example

Here's the complete `exchangeRates.json` structure:

```json
{
  "$schema": "./exchangeRatesSchema.json",
  "version": 1,
  "lastUpdated": "2024-12-06T00:00:00Z",
  "tokens": {
    "USDC": 1.0,
    "USDT": 1.0,
    "FLR": 0.02,
    "WFLR": 0.02
  },
  "chains": {
    "1": {
      "chainId": 1,
      "name": "Ethereum",
      "nativeSymbol": "ETH",
      "usdPrice": 2000
    },
    "56": {
      "chainId": 56,
      "name": "BNB Chain",
      "nativeSymbol": "BNB",
      "usdPrice": 300
    },
    "137": {
      "chainId": 137,
      "name": "Polygon",
      "nativeSymbol": "MATIC",
      "usdPrice": 0.8
    },
    "43114": {
      "chainId": 43114,
      "name": "Avalanche",
      "nativeSymbol": "AVAX",
      "usdPrice": 25
    },
    "42161": {
      "chainId": 42161,
      "name": "Arbitrum",
      "nativeSymbol": "ETH",
      "usdPrice": 2000
    },
    "10": {
      "chainId": 10,
      "name": "Optimism",
      "nativeSymbol": "ETH",
      "usdPrice": 2000
    },
    "14": {
      "chainId": 14,
      "name": "Flare",
      "nativeSymbol": "FLR",
      "usdPrice": 0.02
    },
    "114": {
      "chainId": 114,
      "name": "Coston2",
      "nativeSymbol": "C2FLR",
      "usdPrice": 0.02
    }
  }
}
```

---

## Schema Validation

The configuration file uses JSON Schema for validation. The schema is defined in `backend/src/config/exchangeRatesSchema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "lastUpdated", "tokens", "chains"],
  "properties": {
    "version": {
      "type": "integer",
      "description": "Configuration version number"
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp of last update"
    },
    "tokens": {
      "type": "object",
      "description": "Token symbol to USD price mapping",
      "additionalProperties": {
        "type": "number",
        "minimum": 0
      }
    },
    "chains": {
      "type": "object",
      "description": "Chain ID to chain configuration mapping",
      "additionalProperties": {
        "type": "object",
        "required": ["chainId", "name", "nativeSymbol", "usdPrice"],
        "properties": {
          "chainId": {
            "type": "integer"
          },
          "name": {
            "type": "string"
          },
          "nativeSymbol": {
            "type": "string"
          },
          "usdPrice": {
            "type": "number",
            "minimum": 0
          }
        }
      }
    }
  }
}
```

---

## How Exchange Rates Are Used

### 1. Deposit Value Calculation

When a user deposits tokens, the system calculates the USD value:

```typescript
// Example: User deposits 100 USDC
const depositAmount = 100;
const tokenRate = exchangeRates.tokens.USDC; // 1.0
const usdValue = depositAmount * tokenRate; // 100 USD
```

### 2. Gas Amount Calculation

The system then calculates how much native gas to distribute on each chain:

```typescript
// Example: Distribute to Ethereum (ETH price = $2000)
const chainRate = exchangeRates.chains[1].usdPrice; // 2000
const gasAmount = usdValue / chainRate; // 100 / 2000 = 0.05 ETH
```

### 3. Multi-Chain Distribution

For multi-chain distributions, the USD value is split according to user preferences:

```typescript
// Example: Split 100 USD across 2 chains (50% each)
const usdPerChain = 100 * 0.5; // 50 USD per chain

// Ethereum: 50 / 2000 = 0.025 ETH
// Polygon: 50 / 0.8 = 62.5 MATIC
```

---

## Updating Exchange Rates

### Manual Update Process

1. **Edit the Configuration File**:
   ```bash
   cd backend/src/config
   nano exchangeRates.json
   ```

2. **Update Token or Chain Rates**:
   ```json
   {
     "tokens": {
       "USDC": 1.0,
       "USDT": 1.0,
       "FLR": 0.025  // Updated from 0.02
     }
   }
   ```

3. **Update Version and Timestamp**:
   ```json
   {
     "version": 2,
     "lastUpdated": "2024-12-07T10:30:00Z"
   }
   ```

4. **Validate the Configuration**:
   ```bash
   npm run validate-config
   ```

5. **Restart the Backend** (if not using hot-reload):
   ```bash
   npm run restart
   ```

### Hot-Reload Support

The system supports hot-reloading of exchange rates without restarting:

```typescript
// The PriceCalculator service watches for file changes
// and automatically reloads the configuration
```

To trigger a reload without restart:
```bash
# Simply save the exchangeRates.json file
# The system will detect changes and reload
```

---

## Adding New Tokens

To add support for a new token:

1. **Add Token Rate**:
   ```json
   {
     "tokens": {
       "USDC": 1.0,
       "USDT": 1.0,
       "FLR": 0.02,
       "WFLR": 0.02,
       "DAI": 1.0  // New token
     }
   }
   ```

2. **Update Frontend Token List**:
   ```typescript
   // frontend/src/data/tokens.ts
   export const SUPPORTED_TOKENS = [
     { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
     { symbol: 'USDT', name: 'Tether', decimals: 6 },
     { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 }, // New
   ];
   ```

3. **Test the Integration**:
   ```bash
   npm run test:price-calculator
   ```

---

## Adding New Chains

To add support for a new blockchain:

1. **Add Chain Rate**:
   ```json
   {
     "chains": {
       "8453": {
         "chainId": 8453,
         "name": "Base",
         "nativeSymbol": "ETH",
         "usdPrice": 2000
       }
     }
   }
   ```

2. **Deploy Treasury Contract** to the new chain

3. **Update Chain Configuration**:
   ```typescript
   // backend/src/config/chains.ts
   export const SUPPORTED_CHAINS = {
     8453: {
       name: 'Base',
       rpcUrl: process.env.BASE_RPC_URL,
       treasuryAddress: process.env.TREASURY_ADDRESS_8453,
     }
   };
   ```

4. **Update Frontend Chain List**:
   ```typescript
   // frontend/src/data/chains.ts
   export const CHAINS = [
     { id: 8453, name: 'Base', icon: '/base-icon.png' }
   ];
   ```

---

## Best Practices

### 1. Regular Updates

- Update rates at least weekly for demo purposes
- For production, integrate with live oracle feeds (FTSO, Chainlink, etc.)

### 2. Version Control

- Always increment the `version` number when updating rates
- Update the `lastUpdated` timestamp
- Keep a changelog of rate changes

### 3. Validation

- Always validate the JSON structure before deploying
- Test calculations with new rates before going live
- Monitor for calculation errors after updates

### 4. Backup

- Keep backups of previous rate configurations
- Document the reason for rate changes
- Test rollback procedures

---

## Testing Exchange Rates

### Unit Tests

Test the price calculator with various rates:

```bash
cd backend
npm run test -- priceCalculator.test.ts
```

### Integration Tests

Test end-to-end calculations:

```bash
npm run test:integration
```

### Manual Testing

Test specific calculations:

```typescript
// Test in Node.js REPL
const { PriceCalculator } = require('./src/services/priceCalculator');
const calculator = new PriceCalculator();

// Test USDC deposit
const usdValue = calculator.getUsdValue('USDC', 100);
console.log('USD Value:', usdValue); // Should be 100

// Test ETH distribution
const ethAmount = calculator.getNativeAmount(1, 100);
console.log('ETH Amount:', ethAmount); // Should be 0.05 (100/2000)
```

---

## Troubleshooting

### Issue: Rates Not Updating

**Solution**:
1. Check file permissions on `exchangeRates.json`
2. Verify JSON syntax is valid
3. Restart the backend service
4. Check logs for configuration errors

### Issue: Calculation Errors

**Solution**:
1. Verify rate values are positive numbers
2. Check for missing chain or token entries
3. Ensure chainId matches exactly
4. Review calculation logic in PriceCalculator

### Issue: Schema Validation Fails

**Solution**:
1. Validate JSON against schema
2. Ensure all required fields are present
3. Check data types match schema
4. Verify no extra/invalid fields

---

## Migration to Live Oracles

When transitioning from hardcoded rates to live oracle feeds:

1. **Implement Oracle Integration**:
   ```typescript
   // Use FTSO on Flare
   import { FtsoService } from './services/ftso';
   
   const ftso = new FtsoService();
   const ethPrice = await ftso.getPrice('ETH/USD');
   ```

2. **Add Fallback Logic**:
   ```typescript
   // Fall back to hardcoded rates if oracle fails
   let price;
   try {
     price = await oracle.getPrice(token);
   } catch (error) {
     price = exchangeRates.tokens[token];
   }
   ```

3. **Update Configuration**:
   ```json
   {
     "useOracle": true,
     "oracleProvider": "FTSO",
     "fallbackRates": { /* hardcoded rates */ }
   }
   ```

---
