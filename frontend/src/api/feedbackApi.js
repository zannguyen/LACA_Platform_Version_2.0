import axios from "axios";

// Giả sử đường dẫn Backend của nhóm bạn là localhost:5000
// Sau này bạn chỉ cần đổi dòng này là xong
const API_URL = "http://localhost:4000/api";

const feedbackApi = {
  // Hàm gửi Feedback
  sendFeedback: async (data) => {
    try {
      // data sẽ gồm: { content: "...", userId: 1, type: "feedback" }
      const response = await axios.post(`${API_URL}/feedbacks`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Hàm gửi Report
  sendReport: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/reports`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default feedbackApi;
