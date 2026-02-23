import client from "./client";

const analysisApi = {
  /**
   * Analyze a post
   * POST /api/analysis/analyze/:postId
   */
  analyzePost: async (postId) => {
    const response = await client.post(`/analysis/analyze/${postId}`);
    return response.data.data;
  },

  /**
   * Get analysis for a post
   * GET /api/analysis/post/:postId
   */
  getPostAnalysis: async (postId) => {
    const response = await client.get(`/analysis/post/${postId}`);
    return response.data.data;
  },

  /**
   * Get trending topics
   * GET /api/analysis/trending?days=7&limit=10
   */
  getTrendingTopics: async (days = 7, limit = 10) => {
    const response = await client.get("/analysis/trending", {
      params: { days, limit },
    });
    return response.data.data;
  },

  /**
   * Get recommended topics for current user
   * GET /api/analysis/recommendations?days=7&limit=5
   */
  getRecommendedTopics: async (days = 7, limit = 5) => {
    const response = await client.get("/analysis/recommendations", {
      params: { days, limit },
    });
    return response.data.data;
  },
};

export default analysisApi;
