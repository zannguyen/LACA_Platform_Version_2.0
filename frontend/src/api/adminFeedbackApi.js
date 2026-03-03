// api/adminFeedbackApi.js
import apiClient from "./client";

export const adminFeedbackApi = {
  // Get all feedbacks with filters
  getAll: async ({ type, status, page = 1, limit = 20 } = {}) => {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (status) params.append("status", status);
    params.append("page", page);
    params.append("limit", limit);

    const res = await apiClient.get(`/admin/feedbacks?${params}`);
    return res.data;
  },

  // Get single feedback by ID
  getById: async (feedbackId) => {
    const res = await apiClient.get(`/admin/feedbacks/${feedbackId}`);
    return res.data;
  },

  // Reply to feedback
  reply: async (feedbackId, { reply, sendEmail = true }) => {
    const res = await apiClient.post(`/admin/feedbacks/${feedbackId}/reply`, {
      reply,
      sendEmail,
    });
    return res.data;
  },

  // Mark feedback as read
  markAsRead: async (feedbackId) => {
    const res = await apiClient.put(`/admin/feedbacks/${feedbackId}/read`);
    return res.data;
  },
};

export default adminFeedbackApi;
