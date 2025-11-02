import React, { useState } from "react";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "../utils/firebase" // your initialized firebase.js
import { getReadContract } from "../utils/contract";

export default function LoginWithEmail() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    setStatus("");
    setSending(true);

    try {
      // ✅ Step 1: Get contract instance
      const contract = await getReadContract();

      // ✅ Step 2: Loop through all registered users to check email existence
      // NOTE: You can also store a mapping from email → address in Solidity for faster lookup
      let found = false;

      // Try each of first 20 addresses from connected provider
      for (let i = 0; i < 20; i++) {
        try {
          const address = await window.ethereum.request({
            method: "eth_accounts",
          });
          const userData = await contract.getUser(address[0]);
          if (
            userData.email &&
            userData.email.toLowerCase() === email.toLowerCase()
          ) {
            found = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!found) {
        setStatus("❌ Email not found in blockchain registry. Please sign up first.");
        setSending(false);
        return;
      }

      // ✅ Step 3: Prepare Firebase action settings
      const actionCodeSettings = {
        url: "http://localhost:5173/email-verify", // or your prod URL
        handleCodeInApp: true,
      };

      // ✅ Step 4: Send email sign-in link
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      setStatus("📩 Sign-in link sent to your email. Please check your inbox!");
    } catch (err) {
      console.error("Error sending link:", err);
      setStatus("❌ Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Login via Email</h1>

      <form
        onSubmit={handleSendLink}
        className="flex flex-col space-y-4 bg-white p-6 rounded-xl shadow-lg w-96"
      >
        <input
          type="email"
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={sending}
          className={`${
            sending ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white py-2 rounded transition`}
        >
          {sending ? "Sending..." : "Send Sign-In Link"}
        </button>
      </form>

      <p className="mt-4 text-center font-semibold">{status}</p>
    </div>
  );
}
