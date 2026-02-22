// frontend/src/api/interestApi.js
import api from "./client";

const interestApi = {
  // Lấy tất cả sở thích có sẵn
  getAllInterests: () => api.get("/interests"),

  // Lấy sở thích của người dùng hiện tại
  getMyInterests: () => api.get("/interests/me/interests"),

  // Cập nhật sở thích của người dùng hiện tại
  updateMyInterests: (interestIds) =>
    api.put("/interests/me/interests", { interestIds }),

  // Lấy sở thích của người dùng khác
  getUserInterests: (userId) => api.get(`/interests/user/${userId}`),
};

export default interestApi;
