import React, { useState } from "react";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { uploadJSON } from "../utils/ipfs";
import { encryptData, deriveKeyFromWallet } from "../utils/crypto";
import { getContract } from "../utils/contract";
import useFaceRecognition from "../Frontend/hooks/useFaceRecognition";

export default function Signup() {
  const { videoRef, startCamera, stopCamera, detectLiveness, captureFace } = useFaceRecognition();
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ name: "", email: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async () => {
    try {
      if (!window.ethereum) {
        setStatus("❌ MetaMask not detected.");
        return;
      }

      if (!form.name || !form.email) {
        setStatus("⚠️ Please enter your name and email first.");
        return;
      }

      setStatus("🔑 Connecting to wallet...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = await getContract();

      // ✅ Check if already registered
      setStatus("🔍 Checking existing registration...");
      const alreadyRegistered = await contract.isRegistered(address);
      if (alreadyRegistered) {
        setStatus("⚠️ User already registered. Please login instead.");
        return;
      }

      // 🎥 Start camera and detect liveness
      setStatus("🎥 Starting camera...");
      await startCamera();
      await new Promise((r) => setTimeout(r, 1000));

      setStatus("👁 Detecting liveness...");
      const live = await detectLiveness({ timeout: 6000, interval: 150 });
      if (!live) {
        setStatus("❌ Liveness detection failed. Try again.");
        stopCamera();
        return;
      }

      // 📸 Capture face
      setStatus("📸 Capturing face...");
      const descriptor = await captureFace();
      if (!descriptor) {
        setStatus("❌ Face capture failed. Try again.");
        stopCamera();
        return;
      }

      // 🔐 Encrypt face data
      setStatus("🔐 Deriving encryption key...");
      const key = await deriveKeyFromWallet();

      const faceHash = keccak256(toUtf8Bytes(descriptor.join(",")));
      const dataToEncrypt = {
        faceDescriptor: Array.from(descriptor),
        walletAddress: address,
        name: form.name,
        email: form.email,
        faceHash,
        createdAt: new Date().toISOString(),
      };

      setStatus("🧩 Encrypting face data...");
      const encrypted = await encryptData(key, dataToEncrypt);
      if (!encrypted || !encrypted.ciphertext) {
        setStatus("❌ Encryption failed.");
        stopCamera();
        return;
      }

      // 🛰 Upload encrypted data to IPFS
      setStatus("🛰 Uploading encrypted identity to IPFS...");
      const cid = await uploadJSON(encrypted);
      if (!cid) {
        setStatus("❌ IPFS upload failed.");
        stopCamera();
        return;
      }

      // ⛓ Register user on blockchain
      setStatus("⛓ Storing identity on blockchain...");
      const tx = await contract.registerUser(form.name, form.email, cid);
      await tx.wait();

      setStatus("✅ Registration successful! You can now login.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + err.message);
    } finally {
      stopCamera();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-purple-700">Signup</h1>

      <video ref={videoRef} autoPlay muted className="w-80 h-60 border rounded mb-3 shadow-lg" />

      <input
        type="text"
        name="name"
        placeholder="Full Name"
        onChange={handleChange}
        className="border p-2 rounded mb-2 w-64"
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
        className="border p-2 rounded mb-3 w-64"
      />

      <button
        onClick={handleSignup}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow-md transition"
      >
        Register Identity
      </button>

      <p className="mt-3 text-sm font-semibold text-gray-800">{status}</p>
    </div>
  );
}
