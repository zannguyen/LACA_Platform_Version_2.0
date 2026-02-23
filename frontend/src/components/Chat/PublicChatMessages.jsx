import React, { useEffect, useRef } from "react";
import "./PublicChat.css";

const PublicChatMessages = ({ messages, currentUserId, loading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="public-chat-messages-container">
        <div className="public-chat-loading">
          <i className="fa-solid fa-spinner fa-spin"></i> Đang tải tin nhắn...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="public-chat-messages-container">
        <div className="public-chat-empty">
          <i className="fa-regular fa-comments"></i>
          <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-chat-messages-container">
      {messages.map((msg, idx) => {
        const sender = msg.senderId;
        const senderName = sender?.fullname || sender?.username || "User";
        const senderAvatar = sender?.avatar;
        const isSent = String(sender?._id || sender) === String(currentUserId);

        return (
          <div
            key={msg._id || idx}
            className={`public-chat-message ${isSent ? "sent" : "received"}`}
          >
            {!isSent && (
              <div className="public-chat-message-avatar">
                {senderAvatar ? (
                  <img src={senderAvatar} alt={senderName} />
                ) : (
                  <i className="fa-solid fa-user"></i>
                )}
              </div>
            )}
            <div className="public-chat-message-content">
              {!isSent && (
                <div className="public-chat-message-sender">{senderName}</div>
              )}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Message"
                  className="public-chat-message-image"
                />
              )}
              {msg.text && (
                <div className="public-chat-message-text">{msg.text}</div>
              )}
              <div className="public-chat-message-time">
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
