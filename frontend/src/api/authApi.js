// src/api/authApi.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

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

export const authApi = {
  register: async (userData) => {
    const res = await apiClient.post("/auth/register", userData);
    return res.data;
  },

  verifyOtp: async ({ otpToken, otpCode }) => {
    const res = await apiClient.post("/auth/verify-otp", { otpToken, otpCode });
    return res.data;
  },

  login: async (credentials) => {
    const res = await apiClient.post("/auth/login", credentials);
    const data = res.data;

    // backend bạn trả: { success, message, accessToken, user }
    if (data?.accessToken) {
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("authToken", data.accessToken); // optional cho chắc
    }

    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user)); // ✅ có role
    }

    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  getToken: () =>
    localStorage.getItem("token") || localStorage.getItem("authToken"),

  isAuthenticated: () =>
    !!(localStorage.getItem("token") || localStorage.getItem("authToken")),
};

// ===== FORGOT PASSWORD =====
export const sendOTP = async (email) => {
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
};

export const resendOTP = async (email) => {
  const res = await apiClient.post("/auth/forgot-password", { email });
  return res.data;
};

export const verifyOTP = async (otpToken, otpCode) => {
  const res = await apiClient.post("/auth/forgot-password/verify-otp", {
    otpToken,
    otpCode,
  });
  return res.data;
};

export const resetPassword = async ({
  otpToken,
  otpCode,
  password,
  confirmPassword,
}) => {
  const res = await apiClient.post("/auth/reset-password", {
    otpToken,
    otpCode,
    password,
    confirmPassword,
  });
  return res.data;
};
