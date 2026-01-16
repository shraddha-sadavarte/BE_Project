import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import useFaceRecognition from "../Frontend/hooks/useFaceRecognition";
import { getContract } from "../utils/contract";
import { fetchJSONFromCID } from "../utils/ipfs";
import { deriveKeyFromWallet, decryptData } from "../utils/crypto";
import { recordLoginOnChain } from "../utils/recordLoginOnChain";
import { logAnomalyOnChain } from "../utils/logAnomalyOnChain";

// ✅ Face vector similarity (cosine)
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};


export default function Login() {
  const { videoRef, startCamera, stopCamera, detectLiveness, captureFace } = useFaceRecognition();
  const [status, setStatus] = useState("");
  const [faceReady, setFaceReady] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [emojiState, setEmojiState] = useState("neutral");
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const navigate = useNavigate();

  // ✅ Initialize wallet & contract once
  useEffect(() => {
    const initBlockchain = async () => {
      try {
        if (!window.ethereum) {
          setStatus("❌ MetaMask not detected");
          return;
        }
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const accountAddr = await signer.getAddress();
        const contractInstance = await getContract();

        setAccount(accountAddr);
        setContract(contractInstance);
        setStatus("✅ Blockchain connected");

       // console.log("Wallet connected:", accountAddr);
      } catch (err) {
        console.error("Blockchain init error:", err);
        setStatus("❌ Blockchain connection failed");
      }
    };
    initBlockchain();
  }, []);

  //stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };  
  }, []);

  const handleDetectFace = async () => {
    try {
      if (!account || !contract) {
        setStatus("❌ Blockchain not ready yet");
        return;
      }

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

      if (!decrypted.walletAddress || decrypted.walletAddress.toLowerCase() !== account.toLowerCase()) {
        setStatus("❌ Wallet address mismatch — unauthorized user!");
        await logAnomalyOnChain(0, "Wallet mismatch");
        return;
      }

      

      // Simulate similarity
      // ✅ REAL FACE MATCHING
      const storedDescriptor = decrypted.faceDescriptor;

      if (!storedDescriptor) {
        setStatus("❌ Face data not found. Please re-register.");
        return;
      }

      //this is also updated code
      const euclideanDistance = (a, b) =>
      Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));

 
      //updated code to use euclidean distance for mismatch check
      const distance = euclideanDistance(
        decrypted.faceDescriptor,
        liveDescriptor
      );

      if (distance > 0.6) {
        setStatus("❌ Face mismatch — access denied");
        await logAnomalyOnChain(distance, "Face mismatch");
        return;
      }

      // const similarity = cosineSimilarity(liveDescriptor, storedDescriptor);
      // const similarityPercent = Number((similarity * 100).toFixed(2));

      //update code for above two lines
      // Convert distance to similarity score (face-api standard)
      const similarity = Math.max(0, 1 - distance); 
      const similarityPercent = Number((similarity * 100).toFixed(2));

      //updated code to handle NaN case
      if (isNaN(similarityPercent)) {
        throw new Error("Invalid face similarity calculation");
      }


      localStorage.setItem("loginConfidence", similarityPercent);

      // Reject unauthorized face
      if (distance > 0.6) {
        setStatus(`❌ Face mismatch — unauthorized user (${similarityPercent}%)`);
        await logAnomalyOnChain(similarityPercent, "Face mismatch");
        return;
      }


      localStorage.setItem("loginConfidence", similarityPercent);

      //this is previous original code
      // ❌ Reject unauthorized face
      // if (similarity < 0.75) {
      //   setStatus(`❌ Face mismatch — unauthorized user (${similarityPercent}%)`);
      //   await logAnomalyOnChain(0, "Face mismatch");
      //   return;
      // }

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
