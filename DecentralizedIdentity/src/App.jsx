// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./Frontend/Auth";
import Dashboard from "./Frontend/Dashboard";
import PrivateRoute from "./Frontend/PrivateRoute";
import LoginWithEmail from "./Frontend/LoginWithEmail";
import EmailVerify from "./Frontend/EmailVerify";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            JSON.parse(localStorage.getItem("user")) ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Auth />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Email OTP routes */}
        <Route path="/email-otp" element={<LoginWithEmail />} />
        <Route path="/email-verify" element={<EmailVerify />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
