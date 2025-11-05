// scripts/deploy.js
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance (ETH):", ethers.formatEther(balance));

  if (balance === 0n) {
    throw new Error("❌ Deployer account has 0 ETH — make sure Hardhat node is running (npx hardhat node)");
  }

  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  console.log("📦 Deploying UserRegistry...");
  const contract = await UserRegistry.deploy();

  console.log("⏳ Waiting for deployment...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Contract deployed to:", address);
}

main().catch((error) => {
  console.error("❌ Deployment error:", error);
  process.exitCode = 1;
});
