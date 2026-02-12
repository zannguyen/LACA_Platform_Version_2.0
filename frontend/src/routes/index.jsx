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
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../components/admin/AdminDashboard";
import UserManagement from "../components/admin/UserManagement";
import ContentModeration from "../components/admin/ContentModeration";
import MapManagement from "../components/admin/MapManagement";
import AdminAnalytics from "../components/admin/AdminAnalytics";
import FeedbackPage from "../pages/FeedbackPage";
import ReportPage from "../pages/ReportPage";
import ChatListPage from "../pages/ChatListPage";
import ChatDetailPage from "../pages/ChatDetailPage";
import DeleteAccountConfirmPage from "../pages/DeleteAccountConfirmPage";

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
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/chat" element={<ChatListPage />} />
      <Route path="/chat/detail" element={<ChatDetailPage />} />
      <Route
        path="/delete-account-confirm"
        element={<DeleteAccountConfirmPage />}
      />
      {/* Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="content" element={<ContentModeration />} />
        <Route path="map" element={<MapManagement />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Optional: route không tồn tại */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
