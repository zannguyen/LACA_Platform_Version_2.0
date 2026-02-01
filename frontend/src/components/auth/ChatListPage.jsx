import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatApi";
import "./Chat.css";

const ChatListPage = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy danh sách cuộc trò chuyện
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getConversations();
        setConversations(response.data);
        setError(null);
      } catch (err) {
        console.error("Lỗi lấy danh sách chat:", err);
        setError("Không thể tải danh sách chat");
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const handleChatClick = (conversation) => {
    // Lưu receiver ID vào localStorage để dùng ở ChatDetailPage
    const receiverId = conversation.participants.find(p => p._id !== localStorage.getItem("userId"))?._id;
    const receiverName = conversation.participants.find(p => p._id !== localStorage.getItem("userId"))?.username;
    localStorage.setItem("chatReceiverId", receiverId);
    localStorage.setItem("chatReceiverName", receiverName || "User");
    navigate("/chat/detail");
  };

  return (
    <div className="auth-form">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="page-title">Chat</h2>
      </div>

      {/* Danh sách Chat */}
      <div className="chat-list">
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Đang tải...</p>
        ) : error ? (
          <p style={{ textAlign: "center", padding: "20px", color: "red" }}>{error}</p>
        ) : conversations.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Chưa có cuộc trò chuyện</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className="chat-item"
              onClick={() => handleChatClick(conv)}
            >
              {/* Avatar tròn xám */}
              <div className="avatar-circle"></div>

              <div className="chat-info">
                <h4 className="chat-name">
                  {conv.participants[0]?.username || "User"}
                </h4>
                <p className="chat-preview">
                  {conv.lastMessage?.text || "Không có tin nhắn"}
                </p>
              </div>

              <span className="chat-time">
                {new Date(conv.lastMessage?.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatListPage;
