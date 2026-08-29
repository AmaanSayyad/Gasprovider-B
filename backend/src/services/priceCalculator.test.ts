/**
 * Tests for PriceCalculator service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PriceCalculator } from './priceCalculator';
import * as path from 'path';

describe('PriceCalculator', () => {
  let calculator: PriceCalculator;

  beforeEach(() => {
    // Use the test configuration
    const configPath = path.join(__dirname, '../config/exchangeRates.json');
    calculator = new PriceCalculator(configPath);
  });

  describe('getUsdValue', () => {
    it('should calculate USD value for USDC correctly', () => {
      // 100 USDC (with 18 decimals)
      const amount = BigInt('100000000000000000000');
      const usdValue = calculator.getUsdValue('USDC', amount);
      
      expect(usdValue).toBe(100);
    });

    it('should calculate USD value for FLR correctly', () => {
      // 1000 FLR (with 18 decimals)
      const amount = BigInt('1000000000000000000000');
      const usdValue = calculator.getUsdValue('FLR', amount);
      
      // 1000 FLR * $0.02 = $20
      expect(usdValue).toBe(20);
    });

    it('should handle case-insensitive token symbols', () => {
      const amount = BigInt('100000000000000000000');
      const usdValueUpper = calculator.getUsdValue('USDC', amount);
      const usdValueLower = calculator.getUsdValue('usdc', amount);
      
      expect(usdValueUpper).toBe(usdValueLower);
    });

    it('should throw error for unsupported token', () => {
      const amount = BigInt('100000000000000000000');
      
      expect(() => calculator.getUsdValue('INVALID', amount)).toThrow(
        'Exchange rate not found for token: INVALID'
      );
    });
  });

  describe('getNativeAmount', () => {
    it('should calculate native amount for Ethereum correctly', () => {
      // $2000 USD worth of ETH at $2000/ETH = 1 ETH
      const nativeAmount = calculator.getNativeAmount(1, 2000);
      
      expect(nativeAmount).toBe(BigInt('1000000000000000000'));
    });

    it('should calculate native amount for Polygon correctly', () => {
      // $8 USD worth of MATIC at $0.8/MATIC = 10 MATIC
      const nativeAmount = calculator.getNativeAmount(137, 8);
      
      expect(nativeAmount).toBe(BigInt('10000000000000000000'));
    });

    it('should calculate native amount for Flare correctly', () => {
      // $1 USD worth of FLR at $0.02/FLR = 50 FLR
      const nativeAmount = calculator.getNativeAmount(14, 1);
      
      expect(nativeAmount).toBe(BigInt('50000000000000000000'));
    });

    it('should throw error for unsupported chain', () => {
      expect(() => calculator.getNativeAmount(999999, 100)).toThrow(
        'Exchange rate not found for chain: 999999'
      );
    });
  });

  describe('calculateDistributions', () => {
    it('should calculate distributions for multiple chains correctly', () => {
      // 100 USDC to be distributed
      const sourceAmount = BigInt('100000000000000000000');
      const destinationChains = [1, 137, 14]; // Ethereum, Polygon, Flare
      const allocationPercentages = [50, 30, 20]; // 50%, 30%, 20%

      const distributions = calculator.calculateDistributions(
        'USDC',
        sourceAmount,
        destinationChains,
        allocationPercentages
      );

      expect(distributions).toHaveLength(3);

      // Chain 1 (Ethereum): $50 / $2000 = 0.025 ETH
      expect(distributions[0].chainId).toBe(1);
      expect(distributions[0].amount).toBe(BigInt('25000000000000000'));

      // Chain 137 (Polygon): $30 / $0.8 = 37.5 MATIC
      expect(distributions[1].chainId).toBe(137);
      expect(distributions[1].amount).toBe(BigInt('37500000000000000000'));

      // Chain 14 (Flare): $20 / $0.02 = 1000 FLR
      expect(distributions[2].chainId).toBe(14);
      expect(distributions[2].amount).toBe(BigInt('1000000000000000000000'));
    });

    it('should throw error if percentages do not sum to 100', () => {
      const sourceAmount = BigInt('100000000000000000000');
      const destinationChains = [1, 137];
      const allocationPercentages = [50, 40]; // Only 90%

      expect(() =>
        calculator.calculateDistributions(
          'USDC',
          sourceAmount,
          destinationChains,
          allocationPercentages
        )
      ).toThrow('Allocation percentages must sum to 100');
    });

    it('should throw error if arrays have different lengths', () => {
      const sourceAmount = BigInt('100000000000000000000');
      const destinationChains = [1, 137, 14];
      const allocationPercentages = [50, 50]; // Wrong length

      expect(() =>
        calculator.calculateDistributions(
          'USDC',
          sourceAmount,
          destinationChains,
          allocationPercentages
        )
      ).toThrow('Destination chains and allocation percentages must have same length');
    });
  });

  describe('getExchangeRate', () => {
    it('should return correct rate for USDC', () => {
      const rate = calculator.getExchangeRate('USDC');
      expect(rate).toBe(1.0);
    });

    it('should return correct rate for FLR', () => {
      const rate = calculator.getExchangeRate('FLR');
      expect(rate).toBe(0.02);
    });

    it('should handle case-insensitive symbols', () => {
      const rateUpper = calculator.getExchangeRate('USDC');
      const rateLower = calculator.getExchangeRate('usdc');
      expect(rateUpper).toBe(rateLower);
    });
  });

  describe('getChainExchangeRate', () => {
    it('should return correct rate for Ethereum', () => {
      const rate = calculator.getChainExchangeRate(1);
      expect(rate).toBe(2000);
    });

    it('should return correct rate for Polygon', () => {
      const rate = calculator.getChainExchangeRate(137);
      expect(rate).toBe(0.8);
    });
  });

  describe('utility methods', () => {
    it('should return supported tokens', () => {
      const tokens = calculator.getSupportedTokens();
      expect(tokens).toContain('USDC');
      expect(tokens).toContain('USDT');
      expect(tokens).toContain('FLR');
      expect(tokens).toContain('WFLR');
    });

    it('should return supported chains', () => {
      const chains = calculator.getSupportedChains();
      expect(chains).toContain(1);
      expect(chains).toContain(56);
      expect(chains).toContain(137);
      expect(chains).toContain(43114);
      expect(chains).toContain(42161);
      expect(chains).toContain(10);
      expect(chains).toContain(14);
    });

    it('should check if token is supported', () => {
      expect(calculator.isTokenSupported('USDC')).toBe(true);
      expect(calculator.isTokenSupported('usdc')).toBe(true);
      expect(calculator.isTokenSupported('INVALID')).toBe(false);
    });

    it('should check if chain is supported', () => {
      expect(calculator.isChainSupported(1)).toBe(true);
      expect(calculator.isChainSupported(14)).toBe(true);
      expect(calculator.isChainSupported(999999)).toBe(false);
    });
  });

  describe('reloadExchangeRates', () => {
    it('should reload rates from file', () => {
      // This test verifies the method doesn't throw
      expect(() => calculator.reloadExchangeRates()).not.toThrow();
    });
  });

  describe('getAllExchangeRates', () => {
    it('should return all exchange rates', () => {
      const rates = calculator.getAllExchangeRates();
      
      expect(rates.tokens).toBeDefined();
      expect(rates.chains).toBeDefined();
      expect(rates.version).toBeDefined();
      expect(rates.lastUpdated).toBeDefined();
    });
  });
});
