import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PublicChat.css";

const PublicChatMessages = ({ messages, currentUserId, loading }) => {
  const messagesEndRef = useRef(null);
  const previousLengthRef = useRef(0);
  const navigate = useNavigate();
  const [avatarErrors, setAvatarErrors] = React.useState(new Set());
  const [newMessageKey, setNewMessageKey] = React.useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAvatarError = (senderId) => {
    setAvatarErrors((prev) => new Set([...prev, String(senderId)]));
  };

  const getSenderKey = (message) => {
    const sender = message?.senderId;
    if (!sender) return "";
    if (typeof sender === "object") return String(sender._id || "");
    return String(sender);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > previousLengthRef.current) {
      const latest = messages[messages.length - 1];
      setNewMessageKey(latest?._id || `msg-${messages.length - 1}`);
    }
    previousLengthRef.current = messages.length;
  }, [messages]);

  if (loading) {
    return (
      <div className="public-message-container">
        <div className="public-message-state public-message-state-loading">
          <i className="fa-solid fa-spinner fa-spin"></i> Đang tải tin nhắn...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="public-message-container">
        <div className="public-message-state public-message-state-empty">
          <i className="fa-regular fa-comments"></i>
          <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-message-container">
      {messages.map((msg, idx) => {
        const sender = msg.senderId;
        const senderName = sender?.fullname || sender?.username || "User";
        const senderAvatar = sender?.avatar;
        const senderId = sender?._id;
        const isSent = String(senderId || sender) === String(currentUserId);
        const currentSenderKey = getSenderKey(msg);
        const prevSenderKey = idx > 0 ? getSenderKey(messages[idx - 1]) : "";
        const nextSenderKey =
          idx < messages.length - 1 ? getSenderKey(messages[idx + 1]) : "";
        const isFirstInGroup = currentSenderKey !== prevSenderKey;
        const isLastInGroup = currentSenderKey !== nextSenderKey;

        return (
          <div
            key={msg._id || idx}
            className={`public-message-row ${isSent ? "me" : ""} ${!isFirstInGroup ? "grouped" : ""} ${newMessageKey === (msg._id || `msg-${idx}`) ? "is-new" : ""}`}
          >
            {!isSent &&
              (isLastInGroup ? (
                <div
                  className="public-message-avatar"
                  onClick={() => senderId && navigate(`/profile/${senderId}`)}
                  title="Xem trang cá nhân"
                >
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
              ) : (
                <div
                  className="public-message-avatar-spacer"
                  aria-hidden="true"
                />
              ))}
            <div className="public-message-content">
              {!isSent && isFirstInGroup && (
                <button
                  className="public-message-sender-name"
                  onClick={() => navigate(`/profile/${senderId}`)}
                >
                  {senderName}
                </button>
              )}
              {msg.image && (
                <img
                  src={msg.image}
                  alt="Message"
                  className={`public-message-image ${isFirstInGroup ? "group-start" : ""} ${isLastInGroup ? "group-end" : ""}`}
                />
              )}
              {msg.text && (
                <div
                  className={`public-message-bubble ${isSent ? "sent" : "received"} ${isFirstInGroup ? "group-start" : ""} ${isLastInGroup ? "group-end" : ""}`}
                >
                  {msg.text}
                </div>
              )}
              {isLastInGroup && (
                <div className="public-message-time">
                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default PublicChatMessages;
