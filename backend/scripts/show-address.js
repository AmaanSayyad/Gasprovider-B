#!/usr/bin/env node
/**
 * Show public address for the key in env (does not print the private key).
 *
 * Usage:
 *   node scripts/show-address.js
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
  process.env.DISTRIBUTOR_PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY;

function isUsableKey(key) {
  return (
    typeof key === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(key) &&
    !/^0x0+$/.test(key)
  );
}

console.log("\n" + "=".repeat(70));
console.log("OPERATOR WALLET ADDRESS (from env)");
console.log("=".repeat(70));

if (!isUsableKey(privateKey)) {
  console.error(
    "\n❌ Set DISTRIBUTOR_PRIVATE_KEY / RELAYER_PRIVATE_KEY / PRIVATE_KEY in backend/.env\n"
  );
  process.exit(1);
}

const wallet = new Wallet(privateKey);
console.log("\nPublic Address:");
console.log(wallet.address);
console.log("\n(Private key is read from env and is NOT printed.)");
console.log("\nFund Coston2 at: https://faucet.flare.network/");
console.log("Then run: node scripts/check-balance.js");
console.log("\n" + "=".repeat(70) + "\n");
