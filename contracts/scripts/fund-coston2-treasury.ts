import hardhat, { network } from "hardhat";
import { ethers } from "ethers";

/**
 * Fund Coston2 Treasury with C2FLR
 * Sends 50 C2FLR from relayer wallet to Treasury contract
 */

const TREASURY_ADDRESS = "0xc031c437d6b915dbdc946dbd8613a1ac9dd75d63";
const AMOUNT_TO_SEND = "38"; // 38 C2FLR (leave 1 for gas)

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [sender] = await viem.getWalletClients();

  console.log("\n" + "=".repeat(70));
  console.log("FUNDING COSTON2 TREASURY");
  console.log("=".repeat(70));

  console.log("\nSender Address:", sender.account.address);
  console.log("Treasury Address:", TREASURY_ADDRESS);
  console.log("Amount to Send:", AMOUNT_TO_SEND, "C2FLR");

  // Check sender balance
  const senderBalance = await publicClient.getBalance({ address: sender.account.address });
  console.log("\nSender Balance:", ethers.formatEther(senderBalance), "C2FLR");

  const amountWei = ethers.parseEther(AMOUNT_TO_SEND);
  
  if (senderBalance < amountWei) {
    console.error("❌ Insufficient balance!");
    console.log("   Required:", ethers.formatEther(amountWei), "C2FLR");
    console.log("   Available:", ethers.formatEther(senderBalance), "C2FLR");
    process.exit(1);
  }

  // Check current Treasury balance
  const treasuryBalance = await publicClient.getBalance({ address: TREASURY_ADDRESS as `0x${string}` });
  console.log("\nCurrent Treasury Balance:", ethers.formatEther(treasuryBalance), "C2FLR");

  // Send transaction
  console.log("\n📤 Sending transaction...");
  
  const hash = await sender.sendTransaction({
    to: TREASURY_ADDRESS as `0x${string}`,
    value: amountWei,
  });

  console.log("✅ Transaction sent:", hash);
  console.log("   Waiting for confirmation...");

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("✅ Transaction confirmed!");
  console.log("   Block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());

  // Check new Treasury balance
  const newTreasuryBalance = await publicClient.getBalance({ address: TREASURY_ADDRESS as `0x${string}` });
  console.log("\nNew Treasury Balance:", ethers.formatEther(newTreasuryBalance), "C2FLR");
  console.log("Increase:", ethers.formatEther(newTreasuryBalance - treasuryBalance), "C2FLR");

  console.log("\n" + "=".repeat(70));
  console.log("✅ FUNDING COMPLETE");
  console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
