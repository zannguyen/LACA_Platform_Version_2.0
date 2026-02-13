import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import chatApi from "../../api/chatApi";
import "./Chat.css";

const ChatListPage = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCurrentUserId = () => {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        return user?._id || "";
      } catch {
        return "";
      }
    }

    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) return storedUserId;

    const token =
      localStorage.getItem("token") || localStorage.getItem("authToken");
    if (!token) return "";

    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      return payload?.userID || payload?.userId || payload?._id || "";
    } catch {
      return "";
    }
  };

  const getOtherParticipant = (participants) => {
    const me = getCurrentUserId();
    return (
      participants?.find((p) => String(p._id) !== String(me)) ||
      participants?.[0]
    );
  };

  const getUserLabel = (user) =>
    user?.fullname || user?.username || user?.email || "User";
  const getInitials = (user) =>
    getUserLabel(user).trim().charAt(0).toUpperCase();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getConversations();
        setConversations(response.data || []);
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
    const other = getOtherParticipant(conversation.participants);
    if (!other?._id) return;

    localStorage.setItem("chatReceiverId", other._id);
    localStorage.setItem("chatReceiverName", getUserLabel(other));

    navigate("/chat/detail");
  };

  return (
    <div className="auth-form">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="page-title">Chat</h2>
      </div>

      <div className="chat-list">
        {loading ? (
          <p style={{ textAlign: "center", padding: 20 }}>Đang tải...</p>
        ) : error ? (
          <p style={{ textAlign: "center", padding: 20, color: "red" }}>
            {error}
          </p>
        ) : conversations.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            Chưa có cuộc trò chuyện
          </p>
        ) : (
          conversations.map((conv) => {
            const other = getOtherParticipant(conv.participants);
            const lastMessageText =
              conv.lastMessage?.text ||
              (conv.lastMessage?.image ? "Đã gửi một ảnh" : "");

            const lastMessageTime =
              conv.lastMessage?.createdAt || conv.updatedAt || null;

            const avatarStyle = other?.avatar
              ? {
                  backgroundImage: `url(${other.avatar})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined;

            return (
              <div
                key={conv._id}
                className="chat-item"
                onClick={() => handleChatClick(conv)}
              >
                <div className="avatar-circle" style={avatarStyle}>
                  {!other?.avatar && getInitials(other)}
                </div>

                <div className="chat-info">
                  <h4 className="chat-name">{getUserLabel(other)}</h4>
                  <p className="chat-preview">
                    {lastMessageText || "Không có tin nhắn"}
                  </p>
                </div>

                <span className="chat-time">
                  {lastMessageTime
                    ? new Date(lastMessageTime).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatListPage;
