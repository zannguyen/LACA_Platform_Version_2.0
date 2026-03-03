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
export const getNearbyPosts = async ({ lat, lng, limit = 100 }) => {
  const res = await api.get("/map/posts/nearby", { params: { lat, lng, limit } });
  return res.data;
};

// Get recommended topics for post creation
export const getRecommendedTopics = async (days = 7, limit = 5) => {
  const res = await api.get("/analysis/recommendations", {
    params: { days, limit },
  });
  return res.data.data || [];
};

// Get single post detail
export const getPostDetail = async (postId) => {
  const res = await api.get(`/posts/${postId}`);
  return res.data;
};

// ============================================
// REACTION APIs
// ============================================

/**
 * Thêm reaction vào bài viết
 * @param {string} postId - ID của bài viết
 * @param {string} type - Loại reaction: 'like', 'love', 'haha', 'wow', 'sad', 'angry', 'heart'
 * @param {number} lat - Vĩ độ của user (để kiểm tra khoảng cách)
 * @param {number} lng - Kinh độ của user
 */
export const addReaction = async (postId, type = "like", lat, lng) => {
  try {
    const res = await api.post("/reactions", { postId, type, lat, lng });
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể thả cảm xúc",
    };
  }
};

/**
 * Xóa reaction khỏi bài viết
 * @param {string} postId - ID của bài viết
 */
export const removeReaction = async (postId) => {
  try {
    const res = await api.delete(`/reactions/${postId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || "Không thể bỏ cảm xúc",
    };
  }
};

/**
 * Lấy số lượng reaction của bài viết
 * @param {string} postId - ID của bài viết
 */
export const getReactionCount = async (postId) => {
  try {
    const res = await api.get(`/reactions/count/${postId}`);
    return { success: true, total: res.data.total || 0 };
  } catch (err) {
    return { success: false, total: 0 };
  }
};

/**
 * Lấy trạng thái reaction của user hiện tại
 * @param {string} postId - ID của bài viết
 */
export const getReactionStatus = async (postId) => {
  try {
    const res = await api.get(`/reactions/status/${postId}`);
    return {
      success: true,
      reacted: res.data.reacted || false,
      type: res.data.type || null,
    };
  } catch (err) {
    return { success: false, reacted: false, type: null };
  }
};

export default api;
