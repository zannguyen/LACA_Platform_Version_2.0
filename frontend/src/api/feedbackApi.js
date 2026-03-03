import apiClient from "./client";

const feedbackApi = {
  // Hàm gửi Feedback
  sendFeedback: async (data) => {
    const response = await apiClient.post("/feedbacks", data);
    return response.data;
  },
};

export default feedbackApi;
