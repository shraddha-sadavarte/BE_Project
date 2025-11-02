import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [confidence, setConfidence] = useState(0);
  const [level, setLevel] = useState("Unknown");
  const [color, setColor] = useState("gray");
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const storedConfidence = localStorage.getItem("loginConfidence");
    if (storedConfidence) {
      const conf = parseFloat(storedConfidence);
      setConfidence(conf);

      if (conf < 30) {
        setLevel("Rejected ❌ (Too Low Confidence)");
        setColor("red");
      } else if (conf < 50) {
        setLevel("Very Low ⚠️ (Unsafe Match)");
        setColor("orange");
      } else if (conf < 80) {
        setLevel("Medium Match ⚠️");
        setColor("yellow");
      } else {
        setLevel("High Match ✅");
        setColor("green");
      }
    }
  }, []);

  const data = [
    { name: "Matched", value: confidence },
    { name: "Remaining", value: 100 - confidence },
  ];
  const COLORS = [color, "#E0E0E0"];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("loginConfidence");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 p-6 animate-fade-in">
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 drop-shadow-lg animate-bounce">
        Welcome to Dashboard 🎉
      </h1>

      {user ? (
        <div className="bg-white bg-opacity-90 backdrop-blur-lg shadow-2xl rounded-3xl p-8 w-full max-w-lg text-center border border-gray-200 hover:shadow-3xl transition-all duration-500 ease-in-out transform hover:scale-105">
          <div className="mb-6">
            <p className="text-xl mb-2 text-gray-700">
              Hello, <strong className="text-indigo-600">{user.name}</strong> ({user.email})
            </p>
            <p className="text-sm text-gray-500 font-mono bg-gray-100 rounded-lg p-2 inline-block">
              Wallet: {user.account}
            </p>
          </div>

          <h2 className="text-3xl font-bold mb-4 text-gray-800">Face Recognition Accuracy</h2>
          <p
            className={`text-2xl font-bold mb-6 px-4 py-2 rounded-full inline-block ${
              color === "green"
                ? "text-green-700 bg-green-100 border-2 border-green-300"
                : color === "yellow"
                ? "text-yellow-700 bg-yellow-100 border-2 border-yellow-300"
                : color === "orange"
                ? "text-orange-700 bg-orange-100 border-2 border-orange-300"
                : "text-red-700 bg-red-100 border-2 border-red-300"
            } animate-pulse`}
          >
            {confidence.toFixed(2)}% - {level}
          </p>

          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 shadow-inner hover:shadow-lg transition-shadow duration-300">
              <PieChart width={280} height={280}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 'bold' }} />
              </PieChart>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ease-in-out"
          >
            Logout 🚪
          </button>
        </div>
      ) : (
        <p className="text-lg text-gray-600 bg-white bg-opacity-80 rounded-lg p-4 shadow-md">
          No user data found. Please login.
        </p>
      )}
    </div>
  );
}
