// frontend/src/Frontend/EmailVerify.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../utils/firebase";
import { signInWithEmailLink, isSignInWithEmailLink } from "firebase/auth";

export default function EmailVerify() {
  const [status, setStatus] = useState("Verifying...");
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmailLink = async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem("emailForSignIn");
          if (!email) {
            email = window.prompt("Please enter your email for verification");
          }
          await signInWithEmailLink(auth, email, window.location.href);

          window.localStorage.removeItem("emailForSignIn");

          // Save minimal session
          localStorage.setItem(
            "user",
            JSON.stringify({ email, verifiedVia: "email-link" })
          );
          setStatus("✅ Email verified successfully! Redirecting...");
          setTimeout(() => navigate("/dashboard"), 1500);
        } else {
          setStatus("❌ Invalid or expired verification link.");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ Error: " + err.message);
      }
    };
    verifyEmailLink();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-3">Email Verification</h1>
      <p>{status}</p>
    </div>
  );
}
