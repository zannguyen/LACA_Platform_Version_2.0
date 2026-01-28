import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import Map from "../pages/Map";
import Home from "../pages/HomePage";
import UserProfile from "../pages/UserProfilePage";
import Camera from "../pages/CameraPage";
import CameraPost from "../pages/CameraPostPage";
import StrangerProfile from "../pages/StrangerProfilePage";
import Notification from "../pages/NotificationPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root -> login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* App pages */}
      <Route path="/home" element={<Home />} />
      <Route path="/map" element={<Map />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/camera" element={<Camera />} />
      <Route path="/camera-post" element={<CameraPost />} />
      <Route path="/stranger_profile/:id" element={<StrangerProfile />} />
      <Route path="/notification" element={<Notification />} />

      {/* Optional: route không tồn tại */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
