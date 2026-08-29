#!/usr/bin/env node
/**
 * Derive public address from a private key provided via env.
 * Never embeds or prints a hardcoded key.
 *
 * Usage:
 *   RELAYER_PRIVATE_KEY=0x... node scripts/get-address-from-key.js
 *   # or with backend/.env present:
 *   node scripts/get-address-from-key.js
 */

const path = require("path");
const fs = require("fs");
const { Wallet } = require("ethers");

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

loadEnvFile(path.join(__dirname, "../.env"));
loadEnvFile(path.join(__dirname, "../env.flare.local"));
loadEnvFile(path.join(__dirname, "../.env.flare.local"));

const privateKey =
  process.env.RELAYER_PRIVATE_KEY ||
  process.env.DISTRIBUTOR_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

function isUsableKey(key) {
  return (
    typeof key === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(key) &&
    !/^0x0+$/.test(key)
  );
}

console.log("\n" + "=".repeat(70));
console.log("FLARE RELAYER / DISTRIBUTOR ADDRESS");
console.log("=".repeat(70));

if (!isUsableKey(privateKey)) {
  console.log(`
❌ No usable private key in environment.

Setup:
  1. cd backend
  2. cp .env.example .env   # or copy from .env.flare
  3. Set in .env (gitignored):
       DISTRIBUTOR_PRIVATE_KEY=0xYOUR_KEY
       RELAYER_PRIVATE_KEY=0xYOUR_KEY
       PRIVATE_KEY=0xYOUR_KEY
  4. Re-run: node scripts/get-address-from-key.js

Generate a new testnet key:
  node scripts/generate-relayer-key.js

Security:
  - NEVER commit .env or env.flare.local
  - NEVER hardcode keys in scripts
`);
  process.exit(1);
}

const wallet = new Wallet(privateKey);
console.log("\nPublic Address:");
console.log(wallet.address);
console.log("\nKey source: environment variable (value not printed)");
console.log("\nFund at: https://faucet.flare.network/ (Coston2)");
console.log("=".repeat(70) + "\n");
