// frontend/src/api/broadcastApi.js
import client from "./client";

const broadcastApi = {
  /**
   * Send broadcast notification to all active users
   * POST /api/notifications/admin/broadcast-all
   */
  sendBroadcastToAll: async (payload) => {
    const response = await client.post(
      "/notifications/admin/broadcast-all",
      payload
    );
    return response.data;
  },

  /**
   * Get broadcast history with pagination and filtering
   * GET /api/notifications/admin/broadcast-history
   */
  getBroadcastHistory: async (params = {}) => {
    const response = await client.get(
      "/notifications/admin/broadcast-history",
      { params }
    );
    return response.data;
  },

  /**
   * Get single broadcast details
   * GET /api/notifications/admin/broadcast-history/:id
   */
  getBroadcastDetails: async (broadcastId) => {
    const response = await client.get(
      `/notifications/admin/broadcast-history/${broadcastId}`
    );
    return response.data;
  },
};

export default broadcastApi;
