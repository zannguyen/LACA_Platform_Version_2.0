// frontend/src/api/interestApi.js
import api from "./client";

const interestApi = {
  // Lấy tất cả sở thích có sẵn
  getAllInterests: async () => {
    const res = await api.get("/interests");
    return res.data?.data || res.data || [];
  },

  // Lấy sở thích của người dùng hiện tại
  getMyInterests: async () => {
    const res = await api.get("/interests/me/interests");
    return res.data?.data || res.data || [];
  },

  // Cập nhật sở thích của người dùng hiện tại
  updateMyInterests: async (interestIds) => {
    const res = await api.put("/interests/me/interests", { interestIds });
    return res.data?.data || res.data || [];
  },

  // Lấy sở thích của người dùng khác
  getUserInterests: async (userId) => {
    const res = await api.get(`/interests/user/${userId}`);
    return res.data?.data || res.data || [];
  },
};

export default interestApi;
