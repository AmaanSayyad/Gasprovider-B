import { ethers } from "ethers";

const TREASURY_ABI = [
  "function owner() view returns (address)"
];

async function main() {
  const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
  const treasuryAddress = "0x5B402676535a3bA75C851c14E1e249a4257D2265";
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const treasury = new ethers.Contract(treasuryAddress, TREASURY_ABI, provider);
  
  const owner = await treasury.owner();
  console.log("Treasury Owner:", owner);
  console.log("Backend Wallet:", "0x56b9768F769b88c861955ca2eA3EC1f91870d61c");
  
  if (owner.toLowerCase() === "0x56b9768F769b88c861955ca2eA3EC1f91870d61c".toLowerCase()) {
    console.log("✅ Backend wallet is the owner");
  } else {
    console.log("❌ Backend wallet is NOT the owner");
    console.log("Need to transfer ownership or redeploy");
  }
}

main().catch(console.error);
