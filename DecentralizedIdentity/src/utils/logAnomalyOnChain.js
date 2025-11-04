import { ethers } from "ethers";
import { getContract } from "./contract";

export async function logAnomalyOnChain(confidence, reason) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = await getContract();
    const tx = await contract.logAnomaly(confidence, reason);
    await tx.wait();
    console.log("✅ Anomaly logged:", confidence, reason);
  } catch (err) {
    console.error("❌ Failed to log anomaly:", err.message);
  }
}
