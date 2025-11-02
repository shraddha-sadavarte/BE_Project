import React, { useState } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import useFaceRecognition from "../Frontend/hooks/useFaceRecognition"
import { getContract } from "../utils/contract";
import { fetchJSONFromCID } from "../utils/ipfs";
import { deriveKeyFromWallet, decryptData } from "../utils/crypto";

export default function Login() {
  const {
    videoRef,
    startCamera,
    stopCamera,
    detectLiveness,
    captureFace,
    facing,
  } = useFaceRecognition();

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
      const contract = await getContract();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      setStatus("⛓ Fetching registered user...");
      const userData = await contract.getUser(account);
      console.log("User data:", userData);

      if (!userData || !userData.faceHashOrIPFS || userData.faceHashOrIPFS === "") {
        setStatus("❌ No user registered. Please signup first.");
        return;
      }

      const { faceHashOrIPFS: cid, name, email } = userData;

      setStatus("🎥 Starting camera...");
      await startCamera();
      await new Promise((r) => setTimeout(r, 1000));

      setStatus("👁 Checking liveness (blink your eyes)...");
      const live = await detectLiveness();

      if (!live) {
        setStatus("❌ Liveness failed (no blink detected).");
        setEmojiState("angry");
        stopCamera();
        setAttempts((a) => a + 1);
        return;
      }

      setStatus("✅ Liveness passed. Capturing face...");
      const liveDescriptor = await captureFace();
      stopCamera();

      // --- Simulated verification for now ---
      const encryptedJson = await fetchJSONFromCID(cid);
      const key = await deriveKeyFromWallet();
      const decrypted = await decryptData(key, encryptedJson);

      if (decrypted.walletAddress.toLowerCase() !== account.toLowerCase()) {
        setStatus("❌ Wallet mismatch!");
        return;
      }

      // Simulated 90% match
      const similarity = 0.9;
      const similarityPercent = (similarity * 100).toFixed(2);
      localStorage.setItem("loginConfidence", similarityPercent);

      setEmojiState("happy");
      setStatus(`✅ Verified ${name} (${similarityPercent}% match). Click OK to login.`);

      const session = {
        name,
        email,
        account,
        cid,
        verifiedAt: new Date().toISOString(),
      };
      localStorage.setItem("user", JSON.stringify(session));
      setFaceReady(true);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
      setEmojiState("angry");
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

  // 🎭 Emoji Animations
  const emojiVariants = {
    neutral: facing
      ? { rotate: 0, scale: 1 }
      : {
          rotateY: [0, 180, 0],
          transition: { duration: 1.2, ease: "easeInOut" },
        },
    happy: {
      rotate: [0, 5, -5, 0],
      scale: [1, 1.2, 1],
      transition: { duration: 0.6 },
    },
    angry: {
      rotate: [0, -15, 15, -15, 15, 0],
      transition: { duration: 1 },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-4">Login</h1>

      {/* 👁 Live Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width="640"
        height="480"
        className="rounded-2xl shadow-lg mb-6"
      />

      {/* 😐 Animated Emoji */}
      <motion.div
        className="text-8xl mb-6"
        variants={emojiVariants}
        animate={emojiState}
        data-emoji-state={emojiState}  // Added for CSS state-specific effects
      >
        😊
      </motion.div>

      {/* Buttons */}
      <div className="flex space-x-3">
        {!faceReady && attempts < 3 && (
          <button
            onClick={handleDetectFace}
            className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
          >
            Detect & Verify
          </button>
        )}

        {faceReady && (
          <button
            onClick={handleLogin}
            className="bg-indigo-600 text-white px-4 py-2 rounded animate-pulse"
          >
            OK
          </button>
        )}

        {!faceReady && attempts >= 3 && (
          <>
            <button
              onClick={handleRetry}
              className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600"
            >
              Retry
            </button>
            <button
              onClick={handleEmailOTP}
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
            >
              Try via Email OTP
            </button>
          </>
        )}
      </div>

      <p className="mt-4 font-semibold text-center">{status}</p>
    </div>
  );
}
