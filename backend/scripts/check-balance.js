#!/usr/bin/env node
/**
 * Check relayer/distributor balance on Coston2.
 * Reads key from env only — never hardcode secrets.
 *
 * Usage:
 *   DISTRIBUTOR_PRIVATE_KEY=0x... node scripts/check-balance.js
 *   # or with backend/.env loaded:
 *   node -r dotenv/config scripts/check-balance.js
 */

const path = require("path");
const fs = require("fs");
const { Wallet, JsonRpcProvider } = require("ethers");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// Prefer backend/.env (gitignored), then env.flare.local
loadEnvFile(path.join(__dirname, "../.env"));
loadEnvFile(path.join(__dirname, "../env.flare.local"));
loadEnvFile(path.join(__dirname, "../.env.flare.local"));

const privateKey =
  process.env.DISTRIBUTOR_PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

const rpcUrl =
  process.env.COSTON2_RPC_URL ||
  "https://coston2-api.flare.network/ext/C/rpc";

function isUsableKey(key) {
  return (
    typeof key === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(key) &&
    !/^0x0+$/.test(key)
  );
}

async function checkBalance() {
  console.log("\n" + "=".repeat(70));
  console.log("RELAYER / DISTRIBUTOR BALANCE (Coston2)");
  console.log("=".repeat(70));

  if (!isUsableKey(privateKey)) {
    console.error(
      "\n❌ No private key in env.\n" +
        "Set DISTRIBUTOR_PRIVATE_KEY (or RELAYER_PRIVATE_KEY / PRIVATE_KEY) in backend/.env\n"
    );
    process.exit(1);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);

  console.log("\nAddress:", wallet.address);
  console.log("Network: Coston2 Testnet");
  console.log("RPC:", rpcUrl);
  console.log("\nChecking balance...\n");

  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    const balanceInC2FLR = Number(balance) / 1e18;

    console.log("Balance:", balanceInC2FLR.toFixed(4), "C2FLR");

    if (balanceInC2FLR === 0) {
      console.log("\n⚠️  Balance 0. Fund at: https://faucet.flare.network/");
    } else if (balanceInC2FLR < 1) {
      console.log("\n⚠️  Balance low — consider topping up.");
    } else {
      console.log("\n✅ Balance looks usable for testnet.");
    }

    console.log("\n" + "=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n" + "=".repeat(70) + "\n");
    process.exit(1);
  }
}

checkBalance();
