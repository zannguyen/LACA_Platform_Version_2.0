import React, { useState } from "react";
import "./PublicChat.css";

const PublicChatInput = ({ onSendMessage, loading }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");

  const handleSend = () => {
    if (!text.trim() && !image.trim()) return;
    onSendMessage({ text, image });
    setText("");
    setImage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="public-chat-input-container">
      <textarea
        className="public-chat-input"
        placeholder="Nhập tin nhắn..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        rows="3"
      />
      <div className="public-chat-input-footer">
        <span className="char-count">{text.length}/500</span>
        <button
          className="public-chat-send-btn"
          onClick={handleSend}
          disabled={loading || (!text.trim() && !image.trim())}
        >
          {loading ? "Đang gửi..." : "Gửi"}
        </button>
      </div>
    </div>
  );
};

export default PublicChatInput;
