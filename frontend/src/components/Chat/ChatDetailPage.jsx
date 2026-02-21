import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import chatApi from "../../api/chatApi";
import "./Chat.css";

const SOCKET_URL = "http://localhost:4000";

const ChatDetailPage = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("User");
  const [conversationId, setConversationId] = useState("");
  const conversationIdRef = useRef("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [toast, setToast] = useState("");
  const messageEndRef = useRef(null);

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

  const normalizeMessage = (msg, userId) => {
    const senderId = msg?.senderId?._id || msg?.senderId;
    return { ...msg, isSent: String(senderId || "") === String(userId || "") };
  };

  const initials = useMemo(
    () => (receiverName || "User").trim().charAt(0).toUpperCase(),
    [receiverName],
  );

  const receiverOnline = useMemo(
    () => onlineUsers.has(String(receiverId || "")),
    [onlineUsers, receiverId],
  );

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ✅ load receiver từ localStorage
  useEffect(() => {
    const me = getCurrentUserId();
    setCurrentUserId(me);

    const id = localStorage.getItem("chatReceiverId");
    const name = localStorage.getItem("chatReceiverName") || "User";

    if (!id) {
      navigate("/chat"); // nếu không có receiver => quay về list
      return;
    }

    setReceiverId(id);
    setReceiverName(name);
  }, [navigate]);

  // fetch messages
  useEffect(() => {
    if (!receiverId) return;
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getMessages(receiverId);
        const me = getCurrentUserId();
        const normalized = (response.data || []).map((m) =>
          normalizeMessage(m, me),
        );
        const first = response.data?.[0];
        if (first?.conversationId) {
          setConversationId(String(first.conversationId));
        }
        setMessages(normalized);
        await chatApi.markRead(receiverId);
        setMessages((prev) =>
          prev.map((m) => (m.isSent ? m : { ...m, isRead: true })),
        );
      } catch (err) {
        console.error("Lỗi lấy tin nhắn:", err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [receiverId]);

  // socket
  useEffect(() => {
    if (!currentUserId) return;

    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      s.emit("setup", { _id: currentUserId });
    });

    s.on("online_users", (users) => {
      setOnlineUsers(new Set((users || []).map((u) => String(u))));
    });

    s.on("user_status", ({ userId, status }) => {
      const key = String(userId || "");
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === "online") next.add(key);
        if (status === "offline") next.delete(key);
        return next;
      });
    });

    s.on("receive_message", (data) => {
      const senderId = data?.senderId?._id || data?.senderId;
      if (String(senderId || "") === String(receiverId || "")) {
        if (!conversationIdRef.current && data?.conversationId) {
          setConversationId(String(data.conversationId));
        }
        setMessages((prev) => [...prev, normalizeMessage(data, currentUserId)]);
        chatApi.markRead(receiverId).catch(() => {});
      } else {
        showToast("Có tin nhắn mới");
      }
    });

    s.on("messages_read", ({ conversationId: readConversationId }) => {
      if (!readConversationId) return;
      if (
        conversationIdRef.current &&
        String(readConversationId) !== String(conversationIdRef.current)
      ) {
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.isSent ? { ...m, isRead: true } : m)),
      );
    });

    setSocket(s);
    return () => s.close();
  }, [currentUserId, receiverId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !receiverId) return;

    try {
      const response = await chatApi.sendMessage(
        receiverId,
        messageText.trim(),
      );
      const me = getCurrentUserId();
      const normalized = normalizeMessage(response.data, me);

      setMessages((prev) => [...prev, normalized]);
      setMessageText("");

      // nếu backend bạn phát socket ở server thì ok,
      // nếu muốn FE emit thêm thì:
      // socket?.emit("send_message", normalized);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    }
  };

  return (
    <div className="auth-form chat-detail-page">
      <div className="page-header" style={{ borderBottom: "1px solid #ccc" }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <div className="avatar-circle" style={{ width: 40, height: 40 }}>
          {initials}
        </div>

        <div className="chat-header-info">
          <span style={{ fontWeight: "bold" }}>{receiverName}</span>
          <span className="status-text">
            {receiverOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="message-container">
        {loading ? (
          <p style={{ textAlign: "center", padding: 20 }}>
            Đang tải tin nhắn...
          </p>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20, color: "#999" }}>
            Chưa có cuộc trò chuyện
          </p>
        ) : (
          messages.map((msg, idx) => {
            const isLatest = idx === messages.length - 1;
            const showUnread = msg.isSent && isLatest && msg.isRead === false;

            return (
              <div
                key={msg._id || msg.createdAt || idx}
                className={`message-row ${msg.isSent ? "me" : ""}`}
              >
                {!msg.isSent && (
                  <div
                    className="avatar-circle"
                    style={{ width: 30, height: 30, marginRight: 8 }}
                  />
                )}

                <div className="message-content">
                  {msg.image ? (
                    <div className="message-image">
                      <img
                        src={msg.image}
                        alt="Message"
                        style={{ maxWidth: 200 }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`bubble ${msg.isSent ? "sent" : "received"}`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {showUnread && <div className="message-status">Unread</div>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messageEndRef} />
      </div>

      <div className="chat-input-bar">
        <input
          type="text"
          className="input-rounded"
          placeholder="Nhập tin nhắn..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button className="send-btn-circle" onClick={handleSendMessage}>
          ↑
        </button>
      </div>

      {toast && <div className="chat-toast">{toast}</div>}
    </div>
  );
};

export default ChatDetailPage;
