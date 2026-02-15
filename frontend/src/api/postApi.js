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

// Upload media -> POST /api/upload
export const uploadMedia = async (fileBlob) => {
  const formData = new FormData();
  formData.append("file", fileBlob, fileBlob?.name || "upload");

  const res = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Create post -> POST /api/posts
export const createPost = async (payload) => {
  // payload: { content, type, mediaUrl, placeId }
  const res = await api.post("/posts", payload);
  return res.data;
};

// Delete post -> DELETE /api/posts/:postId
export const deletePost = async (postId) => {
  const res = await api.delete(`/posts/${postId}`);
  return res.data;
};

// Nearby posts
export const getNearbyPosts = async ({ lat, lng }) => {
  const res = await api.get("/map/posts/nearby", { params: { lat, lng } });
  return res.data;
};

export default api;
