import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ethers } from "ethers";
import { getContract } from "../utils/contract";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [confidence, setConfidence] = useState(0);
  const [loginHistory, setLoginHistory] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [userData, setUserData] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) return;

    (async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = await getContract();

      const history = await contract.getLoginHistory(user.account);
      setLoginHistory(
        history.map((h) => ({
          confidence: Number(h.confidence),
          timestamp: new Date(Number(h.timestamp) * 1000).toLocaleString(),
        }))
      );

      const anomalyData = await contract.getAllAnomalies();
      const userAnomalies = anomalyData.filter(
        (a) => a.user.toLowerCase() === user.account.toLowerCase()
      );
      setAnomalies(
        userAnomalies.map((a) => ({
          confidence: Number(a.confidence),
          reason: a.reason,
          timestamp: new Date(Number(a.timestamp) * 1000).toLocaleString(),
        }))
      );

      const details = await contract.getUser(user.account);
      setUserData({
        name: details[0],
        email: details[1],
        active: details[4],
        registeredAt: new Date(Number(details[5]) * 1000).toLocaleString(),
        lastUpdated: new Date(Number(details[6]) * 1000).toLocaleString(),
      });

      const storedConfidence = Number(localStorage.getItem("loginConfidence"));
      const safeConfidence = isNaN(storedConfidence)
        ? 0
        : Math.min(100, Math.max(0, storedConfidence));

      setConfidence(safeConfidence);
    })();
  }, [user?.account]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleRevoke = async () => {
    if (!window.ethereum) return;
    try {
      setRevoking(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = await getContract();
      const tx = await contract.revokeUser();
      await tx.wait();
      alert("Identity revoked successfully!");
      setUserData((prev) => ({ ...prev, active: false }));
    } catch (err) {
      alert("Failed to revoke: " + err.message);
    } finally {
      setRevoking(false);
    }
  };

  const data = [
    { name: "Matched", value: confidence },
    { name: "Remaining", value: 100 - confidence },
  ];
  const COLORS = ["#4CAF50", "#E0E0E0"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm">
          Dashboard
        </h1>
        <p className="text-gray-600 mt-2 text-lg">Manage your identity and monitor activity</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* User Details Card */}
        {userData && (
          <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 flex items-center">
              <span className="mr-3">👤</span> User Details
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Name:</span>
                <span className="text-gray-700">{userData.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Email:</span>
                <span className="text-gray-700">{userData.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Wallet:</span>
                <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg text-gray-700 break-all">{user.account}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Registered At:</span>
                <span className="text-gray-700">{userData.registeredAt}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Last Updated:</span>
                <span className="text-gray-700">{userData.lastUpdated}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="font-semibold text-blue-600">Status:</span>
                <span className={`font-medium ${userData.active ? 'text-green-600' : 'text-red-600'}`}>
                  {userData.active ? '✅ Active' : '❌ Revoked'}
                </span>
              </div>
            </div>
            {userData.active && (
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="mt-6 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revoking ? "Revoking..." : "Revoke Identity 🔒"}
              </button>
            )}
          </div>
        )}

        {/* Pie Chart Card */}
        <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 flex flex-col items-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 flex items-center">
            <span className="mr-3">📊</span> Confidence Level
          </h2>
          <PieChart width={300} height={300}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
          </PieChart>
          <p className="mt-4 text-gray-600 text-center">Current login confidence: {confidence.toFixed(1)}%</p>
        </div>
      </div>

      {/* Login History Table */}
      <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 flex items-center">
          <span className="mr-3">📅</span> Login History
        </h2>
        {loginHistory.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <tr>
                  <th className="p-4 border border-gray-300 text-left">#</th>
                  <th className="p-4 border border-gray-300 text-left">Date & Time</th>
                  <th className="p-4 border border-gray-300 text-left">Confidence (%)</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors duration-200 even:bg-gray-25">
                    <td className="border border-gray-300 p-4">{i + 1}</td>
                    <td className="border border-gray-300 p-4">{log.timestamp}</td>
                    <td className="border border-gray-300 p-4 font-semibold text-green-600">{log.confidence.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No login history found.</p>
        )}
      </div>

      {/* Anomaly Logs Table */}
      <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-red-600 flex items-center">
          <span className="mr-3">⚠️</span> Anomaly Logs
        </h2>
        {anomalies.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
                <tr>
                  <th className="p-4 border border-gray-300 text-left">Date & Time</th>
                  <th className="p-4 border border-gray-300 text-left">Confidence (%)</th>
                  <th className="p-4 border border-gray-300 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors duration-200 even:bg-gray-25">
                    <td className="border border-gray-300 p-4">{a.timestamp}</td>
                    <td className="border border-gray-300 p-4 font-semibold text-red-600">{a.confidence.toFixed(1)}</td>
                    <td className="border border-gray-300 p-4">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No anomalies detected.</p>
        )}
      </div>

      {/* Logout Button */}
      <div className="text-center">
        <button
          onClick={handleLogout}
          className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
        >
          Logout 🚪
        </button>
      </div>
    </div>
  );
}
