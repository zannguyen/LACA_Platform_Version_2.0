// frontend/src/api/userApi.js
import api from "./client";

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

const userApi = {
  getMyProfile: ({ page = 1, limit = 10 } = {}) =>
    api.get(`/user/me/profile${buildQuery({ page, limit })}`),

  updateMyProfile: (body) => api.put(`/user/me/profile`, body),

  getUserProfile: ({ userId, page = 1, limit = 10 } = {}) => {
    if (!userId) return Promise.reject(new Error("Missing userId for getUserProfile"));
    return api.get(`/user/${userId}/profile${buildQuery({ page, limit })}`);
  },
};

export default userApi;
