import { api } from "./client";

const chatApi = {
  // Gửi tin nhắn
  sendMessage: (receiverId, text, image = "") =>
    api.post("/chat/send", { receiverId, text, image }),

  // Lấy tin nhắn với 1 người
  getMessages: (receiverId) => api.get(`/chat/${receiverId}`),

  // Lấy danh sách cuộc trò chuyện
  getConversations: () => api.get("/chat"),
};

export default chatApi;
