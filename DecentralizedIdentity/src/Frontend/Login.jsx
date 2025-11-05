// frontend/src/Login.jsx
import React, { useState } from "react";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { useNavigate } from "react-router-dom";
import useFaceRecognition from "../Frontend/hooks/useFaceRecognition";
import { getContract } from "../utils/contract";
import { fetchJSONFromCID } from "../utils/ipfs";
import { deriveKeyFromWallet, decryptData } from "../utils/crypto";

export default function Login() {
  const { videoRef, startCamera, stopCamera, detectLiveness, captureFace } = useFaceRecognition();
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  // Helper: normalize descriptor
  const normalize = (arr) => {
    const mag = Math.sqrt(arr.reduce((sum, v) => sum + v * v, 0));
    return arr.map((v) => v / mag);
  };

  // Helper: cosine similarity
  const cosineSimilarity = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return (dot / (magA * magB)) || 0;
  };

  const handleDetectFace = async () => {
    try {
      if (!window.ethereum) {
        setStatus("❌ MetaMask not detected");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });

      const contract = await getContract();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      setStatus("⛓ Fetching registered user from blockchain...");
      const userData = await contract.getUser(account);

      if (!userData || !userData.faceHashOrIPFS || userData.faceHashOrIPFS === "") {
        setStatus("❌ No user registered. Please signup first.");
        return;
      }

      const cid = userData.faceHashOrIPFS;
      const name = userData.name;
      const email = userData.email;

      // Start camera + liveness
      setStatus("🎥 Starting camera...");
      await startCamera();
      await new Promise((r) => setTimeout(r, 1000));

      setStatus("👁 Checking liveness...");
      const passed = await detectLiveness({ timeout: 6000, interval: 150 });
      if (!passed) {
        setStatus("❌ Liveness failed. Try again.");
        stopCamera();
        return;
      }

      // Capture live face
      setStatus("📸 Capturing live face...");
      const liveDescriptor = await captureFace();
      if (!liveDescriptor) {
        setStatus("❌ Face capture failed.");
        stopCamera();
        return;
      }

      // Fetch stored user data from IPFS
      setStatus("📡 Fetching encrypted user data from IPFS...");
      const encryptedJson = await fetchJSONFromCID(cid);

      let key;
      try {
        key = await deriveKeyFromWallet();
      } catch {
        setStatus("❌ Wallet signature required to decrypt identity.");
        stopCamera();
        return;
      }

      const decrypted = await decryptData(key, encryptedJson);
      console.log(decrypted);
      if (!decrypted.walletAddress || decrypted.walletAddress.toLowerCase() !== account.toLowerCase()) {
        setStatus("❌ Wallet address mismatch — unauthorized user!");
        stopCamera();
        return;
      }

      //hash verification (integrity)
      const liveHash = keccak256(toUtf8Bytes(liveDescriptor.join(",")));
      if (liveHash !== decrypted.faceHash) {
          setStatus("❌ Face hash mismatch — identity tampered or not same person!");
          stopCamera();
          return;
      }

      // Normalize both before comparing
      const storedFace = normalize(decrypted.faceDescriptor);
      const liveFace = normalize(liveDescriptor);

      const similarity = cosineSimilarity(storedFace, liveFace);
      const similarityPercent = (similarity * 100).toFixed(2);

      console.log("Stored face (first 5):", storedFace.slice(0, 5));
      console.log("Live face (first 5):", liveFace.slice(0, 5));
      console.log("Similarity:", similarityPercent, "%");

      localStorage.setItem("loginConfidence", similarityPercent);

      // Reject if below threshold
      if (similarity < 0.6) {
        setStatus(`❌ Face mismatch — unauthorized login attempt! (Similarity: ${similarityPercent}%)`);
        stopCamera();
        return;
      }

      // Save verified user
      const userSession = {
        name,
        email,
        account,
        cid,
        verifiedAt: new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(userSession));

      setStatus(`✅ Verified ${name} with ${similarityPercent}% similarity`);
      stopCamera();
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
      stopCamera();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-4">Login</h1>

      <video ref={videoRef} autoPlay muted className="w-80 h-60 border rounded mb-3" />

      <button
        onClick={handleDetectFace}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        Detect & Verify
      </button>

      <p className="mt-3 font-bold text-center">{status}</p>
    </div>
  );
}
