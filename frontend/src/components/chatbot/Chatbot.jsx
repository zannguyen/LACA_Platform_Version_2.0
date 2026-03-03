// src/components/chatbot/Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Chatbot.css";
import chatbotLogo from "../../assets/images/logochatbot.jpg";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const QUICK_REPLIES = [
  { label: "Tìm quán cafe", icon: "fa-mug-hot" },
  { label: "Cách đăng bài", icon: "fa-pen-to-square" },
  { label: "Gợi ý địa điểm", icon: "fa-location-dot" },
  { label: "Liên hệ hỗ trợ", icon: "fa-headset" },
];

// Queue system for rate limiting
let requestQueue = [];
let isProcessing = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { message, location, resolve, reject } = requestQueue[0];

    // Wait if needed to respect rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    try {
      const response = await axios.post(
        `${API_URL}/chatbot/message`,
        {
          message,
          location: location || null
        },
        { headers: { "Content-Type": "application/json" } }
      );

      lastRequestTime = Date.now();
      const botText = response.data?.data?.message || "Xin lỗi, có lỗi xảy ra.";
      requestQueue.shift();
      resolve(botText);
    } catch (error) {
      console.error("API Error:", error.response?.status || error.message);

      // If rate limited, wait and retry
      if (error.response?.status === 429) {
        console.log("Rate limited, waiting 3s...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue; // Retry same request
      }

      requestQueue.shift();
      reject(error);
    }
  }

  isProcessing = false;
};

const sendToBackend = (message, location) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ message, location, resolve, reject });
    processQueue();
  });
};

export default function Chatbot({ isOpen, onClose, userLocation, userPreferences = [], showLocationWarning = false }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Xin chào! 👋 Tôi là trợ lý của LACA. Bạn cần hỗ trợ gì hôm nay?\n\nTôi có thể giúp bạn:\n📍 Tìm địa điểm gần bạn\n❓ Hướng dẫn sử dụng app\n📊 Xem thống kê\n📝 Cách đăng bài viết",
      time: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text = inputText) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: text.trim(),
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    // Show thinking message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "bot",
        text: "⏳ Đang xử lý...",
        time: new Date(),
      },
    ]);

    try {
      const botText = await sendToBackend(text.trim(), userLocation);

      setMessages((prev) => [
        ...prev.filter((msg) => !msg.text.includes("Đang xử lý")),
        {
          id: Date.now() + 2,
          type: "bot",
          text: botText,
          time: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.text.includes("Đang xử lý")),
        {
          id: Date.now() + 3,
          type: "bot",
          text: "Xin lỗi, tôi đang gặp chút trục trặc kỹ thuật. Bạn vui lòng thử lại sau nhé! 😅\n\nNếu cần hỗ trợ gấp, liên hệ: support@laca.app",
          time: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="chatbot-backdrop" onClick={onClose}>
      <div className="chatbot-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-avatar">
            <img src={chatbotLogo} alt="Chatbot" />
          </div>
          <div className="chatbot-header-info">
            <h3>Trợ lý LACA</h3>
            <span>AI-powered</span>
          </div>
          <button className="chatbot-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chatbot-message ${msg.type === "user" ? "user" : "bot"}`}
            >
              {msg.type === "bot" && (
                <div className="chatbot-avatar">
                  <img src={chatbotLogo} alt="Chatbot" />
                </div>
              )}
              <div className="chatbot-bubble">
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                <span className="chatbot-time">{formatTime(msg.time)}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="chatbot-quick-replies">
            {QUICK_REPLIES.map((reply, index) => (
              <button
                key={index}
                className="quick-reply-btn"
                onClick={() => sendMessage(reply.label)}
              >
                <i className={`fa-solid ${reply.icon}`}></i>
                {reply.label}
              </button>
            ))}
          </div>
        )}

        {/* Location Warning */}
        {showLocationWarning && (
          <div className="chatbot-location-warning">
            <i className="fa-solid fa-location-crosshairs"></i>
            <span>Đang lấy vị trí của bạn...</span>
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="chatbot-send"
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || loading}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

// Floating button component
export function ChatbotFloatingButton({ onClick }) {
  return (
    <button className="chatbot-floating-btn" onClick={onClick}>
      <img src={chatbotLogo} alt="Chatbot" />
    </button>
  );
}
