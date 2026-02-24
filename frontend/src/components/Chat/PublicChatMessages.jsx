import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PublicChat.css";

const PublicChatMessages = ({ messages, currentUserId, loading }) => {
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const [avatarErrors, setAvatarErrors] = React.useState(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAvatarError = (senderId) => {
    setAvatarErrors((prev) => new Set([...prev, String(senderId)]));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="message-container">
        <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
          <i className="fa-solid fa-spinner fa-spin"></i> Đang tải tin nhắn...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-container">
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <i className="fa-regular fa-comments" style={{ fontSize: 40, marginBottom: 10 }}></i>
          <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-container">
      {messages.map((msg, idx) => {
        const sender = msg.senderId;
        const senderName = sender?.fullname || sender?.username || "User";
        const senderAvatar = sender?.avatar;
        const senderId = sender?._id;
        const isSent = String(senderId || sender) === String(currentUserId);

        return (
          <div
            key={msg._id || idx}
            className={`message-row ${isSent ? "me" : ""}`}
          >
            {!isSent && (
              <div className="message-avatar">
                {senderAvatar && !avatarErrors.has(String(senderId)) ? (
                  <img
                    src={senderAvatar}
                    alt={senderName}
                    onError={() => handleAvatarError(senderId)}
                  />
                ) : (
                  <i className="fa-solid fa-user"></i>
                )}
              </div>
            )}
            <div className="message-content">
              {!isSent && (
                <button
                  className="message-sender-name"
                  onClick={() => navigate(`/profile/${senderId}`)}
                >
                  {senderName}
                </button>
              )}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Message"
                  className="message-image"
                />
              )}
              {msg.text && (
                <div className={`bubble ${isSent ? "sent" : "received"}`}>
                  {msg.text}
                </div>
              )}
              <div className="message-time">
                {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default PublicChatMessages;
