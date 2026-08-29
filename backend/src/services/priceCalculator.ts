/**
 * Price Calculator Service
 *
 * USD rates come from the static exchangeRates.json table.
 */

import * as fs from "fs";
import * as path from "path";

export interface ExchangeRates {
  version: number;
  lastUpdated: string;
  tokens: {
    [symbol: string]: number;
  };
  chains: {
    [chainId: string]: {
      chainId: number;
      name: string;
      nativeSymbol: string;
      usdPrice: number;
    };
  };
}

export interface ChainDistribution {
  chainId: number;
  recipient: string;
  amount: bigint;
  token?: string;
}

export type PriceSource = "static";

function tokenDecimals(token: string): number {
  const t = token.toUpperCase();
  // FXRP / FTestXRP use 6 decimals (XRP-style UBA). USDC/USDT also 6.
  if (t === "USDC" || t === "USDT" || t === "FXRP" || t === "FTESTXRP" || t === "XRP") {
    return 6;
  }
  if (t === "FBTC" || t === "BTC" || t === "FDOGE" || t === "DOGE" || t === "FLTC" || t === "LTC") {
    return 8;
  }
  return 18;
}

/**
 * PriceCalculator — static USD rates from exchangeRates.json.
 */
export class PriceCalculator {
  private exchangeRates: ExchangeRates;
  private configPath: string;
  private lastPriceSource: PriceSource = "static";

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.join(__dirname, "../config/exchangeRates.json");
    this.exchangeRates = this.loadExchangeRates();
  }

  private loadExchangeRates(): ExchangeRates {
    try {
      const configData = fs.readFileSync(this.configPath, "utf-8");
      const rates = JSON.parse(configData) as ExchangeRates;
      if (!rates.version || !rates.tokens || !rates.chains) {
        throw new Error("Invalid exchange rates configuration");
      }
      return rates;
    } catch (error) {
      console.error("Failed to load exchange rates:", error);
      throw new Error(`Failed to load exchange rates from ${this.configPath}`);
    }
  }

  public reloadExchangeRates(): void {
    this.exchangeRates = this.loadExchangeRates();
  }

  public getLastPriceSource(): PriceSource {
    return this.lastPriceSource;
  }

  public getUsdValue(token: string, amount: bigint): number {
    const tokenUpper = token.toUpperCase();
    const rate = this.exchangeRates.tokens[tokenUpper];
    if (rate === undefined) {
      throw new Error(`Exchange rate not found for token: ${token}`);
    }
    const decimals = tokenDecimals(tokenUpper);
    const tokenAmount = Number(amount) / 10 ** decimals;
    return tokenAmount * rate;
  }

  public getNativeAmount(chainId: number, usdValue: number): bigint {
    const chainConfig = this.exchangeRates.chains[chainId.toString()];
    if (!chainConfig) {
      throw new Error(`Exchange rate not found for chain: ${chainId}`);
    }
    const nativePrice = chainConfig.usdPrice;
    if (nativePrice <= 0) {
      throw new Error(`Invalid price for chain ${chainId}: ${nativePrice}`);
    }
    const nativeAmount = usdValue / nativePrice;
    return BigInt(Math.floor(nativeAmount * 1e18));
  }

  public calculateDistributions(
    sourceToken: string,
    sourceAmount: bigint,
    destinationChains: number[],
    allocationPercentages: number[]
  ): ChainDistribution[] {
    if (destinationChains.length !== allocationPercentages.length) {
      throw new Error(
        "Destination chains and allocation percentages must have same length"
      );
    }
    const totalPercentage = allocationPercentages.reduce((sum, pct) => sum + pct, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Allocation percentages must sum to 100, got ${totalPercentage}`);
    }

    const totalUsdValue = this.getUsdValue(sourceToken, sourceAmount);
    const distributions: ChainDistribution[] = [];
    for (let i = 0; i < destinationChains.length; i++) {
      const chainId = destinationChains[i];
      const percentage = allocationPercentages[i];
      const chainUsdValue = (totalUsdValue * percentage) / 100;
      distributions.push({
        chainId,
        recipient: "",
        amount: this.getNativeAmount(chainId, chainUsdValue),
      });
    }
    return distributions;
  }

  public getExchangeRate(token: string): number {
    const rate = this.exchangeRates.tokens[token.toUpperCase()];
    if (rate === undefined) {
      throw new Error(`Exchange rate not found for token: ${token}`);
    }
    return rate;
  }

  public getChainExchangeRate(chainId: number): number {
    const chainConfig = this.exchangeRates.chains[chainId.toString()];
    if (!chainConfig) {
      throw new Error(`Exchange rate not found for chain: ${chainId}`);
    }
    return chainConfig.usdPrice;
  }

  public updateExchangeRates(rates: ExchangeRates): void {
    if (!rates.version || !rates.tokens || !rates.chains) {
      throw new Error("Invalid exchange rates: missing required fields");
    }
    rates.version = this.exchangeRates.version + 1;
    rates.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.configPath, JSON.stringify(rates, null, 2), "utf-8");
    this.exchangeRates = rates;
  }

  public getAllExchangeRates(): ExchangeRates {
    return {
      ...this.exchangeRates,
      tokens: { ...this.exchangeRates.tokens },
      chains: { ...this.exchangeRates.chains },
    };
  }

  public getSupportedTokens(): string[] {
    return Object.keys(this.exchangeRates.tokens);
  }

  public getSupportedChains(): number[] {
    return Object.keys(this.exchangeRates.chains).map((id) => parseInt(id, 10));
  }

  public isTokenSupported(token: string): boolean {
    return this.exchangeRates.tokens[token.toUpperCase()] !== undefined;
  }

  public isChainSupported(chainId: number): boolean {
    return this.exchangeRates.chains[chainId.toString()] !== undefined;
  }
}

let priceCalculatorInstance: PriceCalculator | null = null;

export function getPriceCalculator(): PriceCalculator {
  if (!priceCalculatorInstance) {
    priceCalculatorInstance = new PriceCalculator();
  }
  return priceCalculatorInstance;
}

export function resetPriceCalculator(): void {
  priceCalculatorInstance = null;
}
