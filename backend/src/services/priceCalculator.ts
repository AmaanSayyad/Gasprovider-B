/**
 * Price Calculator Service
 *
 * Flare Summer Signal: prices deposits using Flare FTSO feeds when available,
 * with static exchangeRates.json as fallback so the Treasury demo never hard-fails.
 */

import * as fs from "fs";
import * as path from "path";
import { FTSOPriceService } from "./ftso";

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

export type PriceSource = "ftso" | "fallback";

const TOKEN_FEED_ENV: Record<string, string> = {
  FLR: "FTSO_FEED_ID_FLR_USD",
  C2FLR: "FTSO_FEED_ID_FLR_USD",
  WFLR: "FTSO_FEED_ID_FLR_USD",
  FXRP: "FTSO_FEED_ID_XRP_USD",
  XRP: "FTSO_FEED_ID_XRP_USD",
  ETH: "FTSO_FEED_ID_ETH_USD",
  USDC: "FTSO_FEED_ID_USDC_USD",
  USDT: "FTSO_FEED_ID_USDT_USD",
  FBTC: "FTSO_FEED_ID_BTC_USD",
  BTC: "FTSO_FEED_ID_BTC_USD",
  FDOGE: "FTSO_FEED_ID_DOGE_USD",
  DOGE: "FTSO_FEED_ID_DOGE_USD",
  FLTC: "FTSO_FEED_ID_LTC_USD",
  LTC: "FTSO_FEED_ID_LTC_USD",
  MON: "", // no FTSO feed — keep JSON / static
};

const NATIVE_FEED_BY_SYMBOL: Record<string, string> = {
  // Only map natives that have a real FTSO feed — never borrow ETH for MATIC/AVAX/MON
  ETH: "FTSO_FEED_ID_ETH_USD",
  C2FLR: "FTSO_FEED_ID_FLR_USD",
  FLR: "FTSO_FEED_ID_FLR_USD",
};

const DEFAULT_FEEDS: Record<string, string> = {
  FTSO_FEED_ID_FLR_USD: "0x01464c522f55534400000000000000000000000000",
  FTSO_FEED_ID_XRP_USD: "0x015852502f55534400000000000000000000000000",
  FTSO_FEED_ID_ETH_USD: "0x014554482f55534400000000000000000000000000",
  FTSO_FEED_ID_USDC_USD: "0x01555344432f555344000000000000000000000000",
  FTSO_FEED_ID_USDT_USD: "0x01555344542f555344000000000000000000000000",
  FTSO_FEED_ID_BTC_USD: "0x014254432f55534400000000000000000000000000",
  FTSO_FEED_ID_DOGE_USD: "0x01444f47452f555344000000000000000000000000",
  FTSO_FEED_ID_LTC_USD: "0x014c54432f55534400000000000000000000000000",
};

function getFeedId(envKey: string): string {
  return process.env[envKey] || DEFAULT_FEEDS[envKey] || "";
}

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
 * PriceCalculator — FTSO-first with JSON fallback
 */
export class PriceCalculator {
  private exchangeRates: ExchangeRates;
  private configPath: string;
  private ftso: FTSOPriceService | null = null;
  private lastPriceSource: PriceSource = "fallback";
  private lastFtsoRefreshAt = 0;

  constructor(configPath?: string, ftso?: FTSOPriceService | null) {
    this.configPath =
      configPath || path.join(__dirname, "../config/exchangeRates.json");
    this.exchangeRates = this.loadExchangeRates();
    this.ftso = ftso ?? this.createFtsoFromEnv();
  }

  private createFtsoFromEnv(): FTSOPriceService | null {
    if (process.env.ENABLE_FTSO === "false") {
      console.warn("⚠️ ENABLE_FTSO=false — using static exchange rates only");
      return null;
    }

    const rpcUrl =
      process.env.COSTON2_RPC_URL ||
      process.env.FLARE_RPC_URL ||
      "https://coston2-api.flare.network/ext/C/rpc";

    // Lazy-init: resolve FtsoV2 via FlareContractRegistry on first refresh
    // (constructor can't be async). Placeholder address until resolved.
    try {
      const placeholder =
        process.env.FTSO_V2_ADDRESS ||
        process.env.FTSO_V2_ADDRESS_COSTON2 ||
        "0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d";
      const service = new FTSOPriceService(rpcUrl, placeholder);
      // Kick off registry resolution in background
      void this.resolveFtsoAddress(service, rpcUrl);
      console.log("✅ PriceCalculator FTSO init (registry resolve pending)", {
        rpcUrl,
      });
      return service;
    } catch (error) {
      console.warn("⚠️ Failed to init FTSO for PriceCalculator:", error);
      return null;
    }
  }

  private async resolveFtsoAddress(
    service: FTSOPriceService,
    rpcUrl: string
  ): Promise<void> {
    try {
      const { resolveFtsoV2Address } = await import("../utils/flareRegistry");
      const address = await resolveFtsoV2Address(rpcUrl);
      service.setFtsoV2Address(address);
    } catch (error) {
      console.warn(
        "⚠️ Could not resolve FtsoV2 via registry — keeping env/default:",
        (error as Error).message
      );
    }
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

  private ftsoPriceToNumber(price: { value: bigint | number | string; decimals: number }): number {
    const raw =
      typeof price.value === "bigint"
        ? Number(price.value)
        : typeof price.value === "string"
          ? Number(price.value)
          : price.value;
    const decimals = Number(price.decimals) || 0;
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return raw / 10 ** decimals;
  }

  public reloadExchangeRates(): void {
    this.exchangeRates = this.loadExchangeRates();
  }

  public getLastPriceSource(): PriceSource {
    return this.lastPriceSource;
  }

  /**
   * Refresh in-memory USD rates from Flare FTSO (best-effort).
   * Falls back to JSON rates per symbol/chain if a feed fails.
   */
  public async refreshFromFtso(force = false): Promise<PriceSource> {
    if (!this.ftso) {
      this.lastPriceSource = "fallback";
      return "fallback";
    }

    const now = Date.now();
    if (!force && now - this.lastFtsoRefreshAt < 15_000) {
      return this.lastPriceSource;
    }

    let anyFtso = false;
    const nextTokens = { ...this.exchangeRates.tokens };
    const nextChains = { ...this.exchangeRates.chains };

    for (const symbol of Object.keys(nextTokens)) {
      const envKey = TOKEN_FEED_ENV[symbol.toUpperCase()];
      if (!envKey) continue;
      // Skip MON FTSO — no dedicated feed; keep JSON
      if (symbol.toUpperCase() === "MON") continue;
      const feedId = getFeedId(envKey);
      if (!feedId) continue;
      try {
        const price = await this.ftso.getPrice(feedId);
        const usd = this.ftsoPriceToNumber(price);
        if (usd > 0) {
          nextTokens[symbol.toUpperCase()] = usd;
          anyFtso = true;
        }
      } catch (error) {
        console.warn(`FTSO token price miss for ${symbol}:`, (error as Error).message);
      }
    }

    // Ensure FXRP/C2FLR exist even if missing from JSON
    for (const [symbol, envKey] of Object.entries(TOKEN_FEED_ENV)) {
      if (nextTokens[symbol] !== undefined) continue;
      if (symbol === "MON" || symbol === "MATIC") continue;
      const feedId = getFeedId(envKey);
      if (!feedId || !this.ftso) continue;
      try {
        const price = await this.ftso.getPrice(feedId);
        const usd = this.ftsoPriceToNumber(price);
        if (usd > 0) {
          nextTokens[symbol] = usd;
          anyFtso = true;
        }
      } catch {
        /* keep missing */
      }
    }

    for (const [chainId, config] of Object.entries(nextChains)) {
      const sym = config.nativeSymbol.toUpperCase();
      const feedEnv = NATIVE_FEED_BY_SYMBOL[sym];
      if (feedEnv) {
        const feedId = getFeedId(feedEnv);
        if (feedId) {
          try {
            const price = await this.ftso.getPrice(feedId);
            const usd = this.ftsoPriceToNumber(price);
            if (usd > 0) {
              nextChains[chainId] = { ...config, usdPrice: usd };
              anyFtso = true;
              continue;
            }
          } catch (error) {
            console.warn(
              `FTSO chain price miss for ${config.name}:`,
              (error as Error).message
            );
          }
        }
      }
      // No dedicated FTSO feed — sync from token table or keep JSON
      const tokenPx = nextTokens[sym] ?? nextTokens[sym === "TBNB" ? "BNB" : sym];
      if (typeof tokenPx === "number" && tokenPx > 0 && tokenPx < 500) {
        // Guard: never treat a stolen ETH price (~$1000+) as MON/MATIC
        if (sym === "MON" || sym === "MATIC" || sym === "POL" || sym === "AVAX" || sym === "TBNB") {
          nextChains[chainId] = { ...config, usdPrice: tokenPx };
        }
      }
    }

    this.exchangeRates = {
      ...this.exchangeRates,
      tokens: nextTokens,
      chains: nextChains,
      lastUpdated: new Date().toISOString(),
    };
    this.lastFtsoRefreshAt = now;
    this.lastPriceSource = anyFtso ? "ftso" : "fallback";
    console.log(
      `💱 Prices refreshed via ${this.lastPriceSource.toUpperCase()}`,
      {
        tokens: Object.keys(nextTokens).length,
        chains: Object.keys(nextChains).length,
      }
    );
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
