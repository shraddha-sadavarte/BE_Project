import { ethers } from "ethers";
import { getContract } from "./contract";

export async function recordLoginOnChain(confidence) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract();
    const tx = await contract.recordLogin(confidence);
    await tx.wait();
    console.log("✅ Login recorded on-chain:", confidence);
  } catch (err) {
    console.error("❌ Failed to record login:", err.message);
  }
}
