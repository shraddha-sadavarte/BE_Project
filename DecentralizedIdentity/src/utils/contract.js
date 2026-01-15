// frontend/src/utils/contract.js
import { ethers } from "ethers";
import UserRegistry from "../../artifacts/contracts/UserRegistry.sol/UserRegistry.json"


const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"



/**
 * Returns a contract instance connected to the signer
 */
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);   
    await provider.send("eth_requestAccounts", []); // request accounts
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    console.log("✅ Wallet connected:", address);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, UserRegistry.abi, signer);
    return contract;
  } catch (err) {
    console.error("Failed to connect to contract:", err);
    throw err;
  }
}
export async function getReadContract() {
  try {
    // For local Hardhat network: default provider (e.g., localhost:8545)
    // For Sepolia/testnet: you can also use Alchemy/Infura endpoint here.
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, UserRegistry.abi, provider);
    return contract;
  } catch (err) {
    console.error("❌ Failed to create read-only contract:", err);
    throw err;
  }
}
/**
 * Register user on-chain
 */
export async function registerUser(name, email, faceDescriptor) {
  try {
    const contract = await getContract();
    const tx = await contract.registerUser(name, email, faceDescriptor);
    await tx.wait();
    console.log("User registered successfully:", name);
  } catch (err) {
    console.error("Register failed:", err);
    throw err;
  }
}

/**
 * Fetch user from contract by address
 */
export async function getUser(address) {
  try {
    const contract = await getContract();
    const user = await contract.getUser(address);
    return user; // { name, email, faceHashOrIPFS, account }
  } catch (err) {
    console.error("Failed to fetch user:", err);
    throw err;
  }
}
