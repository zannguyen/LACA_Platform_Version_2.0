import React, { useState } from "react";
import "./PublicChat.css";

const PublicChatInput = ({ onSendMessage, loading }) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage({ text, image: "" });
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="public-chat-input-bar">
      <div className="public-chat-input-shell">
        <i className="fa-regular fa-face-smile public-chat-input-icon"></i>
        <input
          type="text"
          className="public-chat-input-rounded"
          placeholder="Nhập tin nhắn thân thiện..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
      </div>
      <button
        className="public-chat-send-btn-circle"
        onClick={handleSend}
        disabled={loading || !text.trim()}
        aria-label="Gửi tin nhắn"
      >
        <i className="fa-solid fa-paper-plane"></i>
      </button>
    </div>
  );
};

export default PublicChatInput;
