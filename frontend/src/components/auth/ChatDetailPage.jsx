import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import chatApi from "../../api/chatApi";
import "./Chat.css";

const ChatDetailPage = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("User");
  const [loading, setLoading] = useState(true);

  // Lấy receiver ID từ localStorage
  useEffect(() => {
    const id = localStorage.getItem("chatReceiverId");
    const name = localStorage.getItem("chatReceiverName");
    if (id) {
      setReceiverId(id);
      setReceiverName(name || "User");
      fetchMessages(id);
    } else {
      setLoading(false);
    }
  }, []);

  // Setup Socket.IO
  useEffect(() => {
    const newSocket = io("http://localhost:4000", {
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      const userId = localStorage.getItem("userId") || "user_" + Math.random().toString(36).substr(2, 9);
      newSocket.emit("setup", { _id: userId });
    });

    newSocket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  // Lấy danh sách tin nhắn
  const fetchMessages = async (id) => {
    try {
      setLoading(true);
      const response = await chatApi.getMessages(id);
      setMessages(response.data);
    } catch (error) {
      console.error("Lỗi lấy tin nhắn:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async () => {
    if (!messageText.trim() || !receiverId) return;

    try {
      await chatApi.sendMessage(receiverId, messageText);
      setMessageText("");
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  return (
    <div
      className="auth-form"
      style={{ position: "relative", minHeight: "80vh" }}
    >
      {/* Header: User + Status */}
      <div className="page-header" style={{ borderBottom: "1px solid #ccc" }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div
          className="avatar-circle"
          style={{ width: "40px", height: "40px" }}
        ></div>
        <div className="chat-header-info">
          <span style={{ fontWeight: "bold" }}>{receiverName}</span>
          <span className="status-text">Online</span>
        </div>
      </div>

      {/* Khu vực nội dung tin nhắn */}
      <div className="message-container">
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Đang tải tin nhắn...</p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "#999" }}>
            Chưa có cuộc trò chuyện
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message-row ${msg.isSent ? "me" : ""}`}
            >
              {!msg.isSent && (
                <div
                  className="avatar-circle"
                  style={{ width: "30px", height: "30px", marginRight: "8px" }}
                ></div>
              )}
              {msg.image ? (
                <div className="message-image">
                  <img src={msg.image} alt="Message" style={{ maxWidth: "200px" }} />
                </div>
              ) : (
                <div className={`bubble ${msg.isSent ? "sent" : "received"}`}>
                  {msg.text}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Thanh nhập liệu ở dưới cùng */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="input-rounded"
          placeholder="Nhập tin nhắn..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button className="send-btn-circle" onClick={handleSendMessage}>
          ↑
        </button>
      </div>
    </div>
  );
};

export default ChatDetailPage;
