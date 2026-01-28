// src/api/authApi.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api"; // chỉnh theo backend bạn

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== AUTH (login/register/verify OTP signup)
export const authApi = {
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Registration failed");
    return data;
  },

  verifyOtp: async ({ otpToken, otpCode }) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otpToken, otpCode }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "OTP verification failed");
    return data;
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Login failed");

    if (data.accessToken) {
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  getToken: () => localStorage.getItem("token"),

  isAuthenticated: () => !!localStorage.getItem("token"),
};

// ===== FORGOT PASSWORD =====

// 1) gửi OTP reset (backend đã có)
export const sendOTP = async (email) => {
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
};

// 2) resend OTP: gọi lại endpoint send OTP (đỡ phải làm route mới)
export const resendOTP = async (email) => {
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
};

// 3) verify OTP reset (chỉ dùng khi backend đã thêm route này)
export const verifyOTP = async (otpToken, otpCode) => {
  const res = await apiClient.post("/auth/forgot-password/verify-otp", {
    otpToken,
    otpCode,
  });
  return res.data;
};

// 4) reset password
// - Nếu backend bạn đã update resetPassword nhận otpCode thì giữ như dưới
// - Nếu chưa update thì bỏ otpCode ra (mình ghi 2 lựa chọn)

export const resetPassword = async ({
  otpToken,
  otpCode,
  password,
  confirmPassword,
}) => {
  const res = await apiClient.post("/auth/reset-password", {
    otpToken,
    otpCode, // chỉ gửi nếu backend có verify otpCode
    password,
    confirmPassword,
  });
  return res.data;
};
