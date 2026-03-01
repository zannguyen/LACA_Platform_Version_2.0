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

<<<<<<< HEAD
  getMyAccountSettings: () => api.get(`/user/me/account-settings`),

  updateMyAccountSettings: (body) => api.put(`/user/me/account-settings`, body),

=======
>>>>>>> 35abd7ff928f681dd73c98791f17bcc19dce34f9
  getUserProfile: ({ userId, page = 1, limit = 10 } = {}) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for getUserProfile"));
    return api.get(`/user/${userId}/profile${buildQuery({ page, limit })}`);
  },

  // Follow / Unfollow
  followUser: (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for followUser"));
    return api.post(`/user/${userId}/follow`);
  },

  unfollowUser: (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for unfollowUser"));
    return api.delete(`/user/${userId}/follow`);
  },

  getFollowStatus: (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for getFollowStatus"));
    return api.get(`/user/${userId}/follow-status`);
  },

  // Block / Unblock
  getBlockedUsers: () => api.get("/user/blocked"),

  blockUser: (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for blockUser"));
    return api.post(`/user/${userId}/block`);
  },

  unblockUser: (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for unblockUser"));
    return api.delete(`/user/${userId}/block`);
  },

  // Preferred Tags (Sở thích)
  getMyPreferredTags: async () => {
    const res = await api.get("/user/me/preferred-tags");
    return res.data?.data || res.data || [];
  },

  updateMyPreferredTags: async (tagIds) => {
    const res = await api.put("/user/me/preferred-tags", { tagIds });
    return res.data?.data || res.data || [];
  },

  getUserPreferredTags: async (userId) => {
    if (!userId)
      return Promise.reject(new Error("Missing userId for getUserPreferredTags"));
    const res = await api.get(`/user/${userId}/preferred-tags`);
    return res.data?.data || res.data || [];
  },

  // Search users by username, fullname or email
  searchUsers: (query) => {
    if (!query || query.trim().length === 0) {
      return Promise.resolve({ data: [] });
    }
    return api.get(`/chat/search${buildQuery({ query: query.trim() })}`);
  },
};

export default userApi;
