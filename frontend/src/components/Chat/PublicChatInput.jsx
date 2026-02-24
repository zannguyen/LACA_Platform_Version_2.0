import React, { useState } from "react";
import "./PublicChat.css";
import "./Chat.css";

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
    <div className="chat-input-bar">
      <input
        type="text"
        className="input-rounded"
        placeholder="Nhập tin nhắn..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        className="send-btn-circle"
        onClick={handleSend}
        disabled={loading || !text.trim()}
      >
        ↑
      </button>
    </div>
  );
};

export default PublicChatInput;
