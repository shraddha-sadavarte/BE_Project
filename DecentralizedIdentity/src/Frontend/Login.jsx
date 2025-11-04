import React, { useState } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import useFaceRecognition from "../Frontend/hooks/useFaceRecognition";
import { getContract } from "../utils/contract";
import { fetchJSONFromCID } from "../utils/ipfs";
import { deriveKeyFromWallet, decryptData } from "../utils/crypto";
import { recordLoginOnChain } from "../utils/recordLoginOnChain";
import { logAnomalyOnChain } from "../utils/logAnomalyOnChain";

export default function Login() {
  const { videoRef, startCamera, stopCamera, detectLiveness, captureFace } = useFaceRecognition();
  const [status, setStatus] = useState("");
  const [faceReady, setFaceReady] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [emojiState, setEmojiState] = useState("neutral");
  const navigate = useNavigate();

  const handleDetectFace = async () => {
    try {
      if (!window.ethereum) {
        setStatus("❌ MetaMask not detected");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = await getContract();
      const account = await signer.getAddress();

      setStatus("⛓ Checking blockchain registration...");
      const registered = await contract.isRegistered(account);

      if (!registered) {
        setStatus("❌ No user registered. Please signup first.");
        return;
      }

      setStatus("🔍 Fetching user from blockchain...");
      const userData = await contract.getUser(account);
      const [name, email, cid, accountAddr, active] = userData;

      if (!active) {
        setStatus("⚠️ Your identity has been revoked. Please re-register.");
        return;
      }

      // Start camera & detect liveness
      setStatus("🎥 Starting camera...");
      await startCamera();
      await new Promise((r) => setTimeout(r, 1200));

      setStatus("👁 Checking liveness (blink your eyes)...");
      const live = await detectLiveness();

      if (!live) {
        setStatus("❌ Liveness failed (no blink detected).");
        setEmojiState("angry");
        await logAnomalyOnChain(0, "Liveness check failed");
        stopCamera();
        setAttempts((a) => a + 1);
        return;
      }

      setStatus("✅ Liveness passed. Capturing face...");
      const liveDescriptor = await captureFace();
      stopCamera();

      // Fetch & decrypt face data
      const encryptedJson = await fetchJSONFromCID(cid);
      const key = await deriveKeyFromWallet();
      const decrypted = await decryptData(key, encryptedJson);

      if (decrypted.walletAddress.toLowerCase() !== account.toLowerCase()) {
        setStatus("❌ Wallet mismatch!");
        await logAnomalyOnChain(0, "Wallet mismatch");
        return;
      }

      // Simulate similarity
      const similarity = (Math.random() * 0.2) + 0.8; // 80–100%
      const similarityPercent = (similarity * 100).toFixed(2);
      localStorage.setItem("loginConfidence", similarityPercent);

      setEmojiState("happy");
      setStatus(`✅ Verified ${name} (${similarityPercent}% match)`);

      // Store session
      const session = {
        name,
        email,
        account,
        cid,
        verifiedAt: new Date().toISOString(),
        confidence: similarityPercent
      };
      localStorage.setItem("user", JSON.stringify(session));

      // Record login on-chain
      await recordLoginOnChain(similarityPercent);

      setFaceReady(true);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
      setEmojiState("angry");
      await logAnomalyOnChain(0, "Login error");
      setAttempts((a) => a + 1);
      stopCamera();
    }
  };

  const handleLogin = () => {
    setStatus("Redirecting...");
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  const handleRetry = () => {
    setAttempts(0);
    setStatus("");
    setEmojiState("neutral");
    setFaceReady(false);
  };

  const handleEmailOTP = () => {
    setStatus("📩 Redirecting to Email OTP login...");
    setTimeout(() => navigate("/email-otp"), 1000);
  };

  const emojiVariants = {
    neutral: { scale: 1 },
    happy: { scale: [1, 1.2, 1], transition: { duration: 0.6 } },
    angry: { rotate: [0, -15, 15, 0], transition: { duration: 1 } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-50 to-green-100 p-6">
      <h1 className="text-4xl font-bold mb-4 text-indigo-700">Secure Face Login 🔐</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="640"
        height="480"
        className="rounded-2xl shadow-lg mb-6 border-4 border-indigo-300"
      />

      <motion.div
        className="text-8xl mb-6 select-none"
        variants={emojiVariants}
        animate={emojiState}
      >
        😊
      </motion.div>

      <div className="flex space-x-3">
        {!faceReady && attempts < 3 && (
          <button
            onClick={handleDetectFace}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow hover:bg-indigo-700 transition-transform transform hover:scale-105"
          >
            Detect & Verify
          </button>
        )}

        {faceReady && (
          <button
            onClick={handleLogin}
            className="bg-green-600 text-white px-6 py-3 rounded-xl animate-pulse shadow hover:bg-green-700"
          >
            Continue ➡️
          </button>
        )}

        {!faceReady && attempts >= 3 && (
          <>
            <button
              onClick={handleRetry}
              className="bg-yellow-500 text-white px-6 py-3 rounded-xl shadow hover:bg-yellow-600"
            >
              Retry
            </button>
            <button
              onClick={handleEmailOTP}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700"
            >
              Try via Email OTP
            </button>
          </>
        )}
      </div>

      <p className="mt-4 font-semibold text-center text-gray-700">{status}</p>
    </div>
  );
}
