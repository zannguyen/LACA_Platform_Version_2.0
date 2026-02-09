// src/api/postApi.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Tự gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Upload media -> /api/upload
export const uploadMedia = async (fileBlob) => {
  const formData = new FormData();

  // multer của bạn đang dùng upload.single("file") => field name phải là "file"
  // Nếu bạn đang gửi blob, nên đặt filename cho chắc
  formData.append("file", fileBlob, fileBlob?.name || "upload");

  const res = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

// Create post -> /api/posts (cần auth)
export const createPost = async ({ content, type, mediaUrl }) => {
  const res = await api.post("/posts", {
    content,
    type,
    mediaUrl,
  });

  return res.data;
};

// Get nearby posts (no pagination)
export const getNearbyPosts = async ({ lat, lng }) => {
  const res = await api.get("/map/posts/nearby", {
    params: { lat, lng },
  });

  // API của bạn: data là array
  return res.data;
};
