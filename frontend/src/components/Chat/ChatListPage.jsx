import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import chatApi from "../../api/chatApi";
import { SOCKET_URL } from "../../config/socket";
import "./Chat.css";

const ChatListPage = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [toast, setToast] = useState("");
  const conversationsRef = useRef([]);

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

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  const onlineIds = useMemo(
    () => new Set(Array.from(onlineUsers).map((u) => String(u))),
    [onlineUsers],
  );

  useEffect(() => {
    setCurrentUserId(getCurrentUserId());
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getConversations();
        const data = response.data || [];
        conversationsRef.current = data;
        setConversations(data);
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
      const conversationId = String(data?.conversationId || "");
      const senderId = data?.senderId?._id || data?.senderId;

      setConversations((prev) => {
        const next = prev.map((conv) =>
          String(conv._id) === conversationId
            ? {
                ...conv,
                lastMessage: {
                  text: data?.text || (data?.image ? "Đã gửi một ảnh" : ""),
                  sender: senderId,
                  isRead: false,
                  createdAt: data?.createdAt || new Date().toISOString(),
                },
                updatedAt: data?.createdAt || new Date().toISOString(),
              }
            : conv,
        );
        conversationsRef.current = next;
        return next;
      });

      const conv = conversationsRef.current.find(
        (c) => String(c._id) === conversationId,
      );
      const other = conv ? getOtherParticipant(conv.participants) : null;
      const name = getUserLabel(other);
      showToast(`Tin nhắn mới từ ${name}`);
    });

    s.on("messages_read", ({ conversationId }) => {
      if (!conversationId) return;
      setConversations((prev) => {
        const next = prev.map((conv) =>
          String(conv._id) === String(conversationId)
            ? {
                ...conv,
                lastMessage: {
                  ...conv.lastMessage,
                  isRead: true,
                },
              }
            : conv,
        );
        conversationsRef.current = next;
        return next;
      });
    });

    return () => s.close();
  }, [currentUserId]);

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
          <i className="fa-solid fa-arrow-left"></i>
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

            const me = currentUserId;
            const lastSender = conv.lastMessage?.sender;
            const isUnread =
              lastSender &&
              String(lastSender) !== String(me) &&
              conv.lastMessage?.isRead === false;

            const lastMessageTime =
              conv.lastMessage?.createdAt || conv.updatedAt || null;

            const avatarStyle = other?.avatar
              ? {
                  backgroundImage: `url(${other.avatar})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined;

            const isOnline = onlineIds.has(String(other?._id || ""));

            return (
              <div
                key={conv._id}
                className="chat-item"
                onClick={() => handleChatClick(conv)}
              >
                <div className="avatar-wrap">
                  <div className="avatar-circle" style={avatarStyle}>
                    {!other?.avatar && getInitials(other)}
                  </div>
                  <span className={`status-dot ${isOnline ? "online" : ""}`} />
                </div>

                <div className="chat-info">
                  <h4 className="chat-name">{getUserLabel(other)}</h4>
                  <p className="chat-preview">
                    {lastMessageText || "Không có tin nhắn"}
                  </p>
                </div>

                <div className="chat-meta">
                  <span className="chat-time">
                    {lastMessageTime
                      ? new Date(lastMessageTime).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                  {isUnread && <span className="chat-unread-dot" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {toast && <div className="chat-toast">{toast}</div>}
    </div>
  );
};

export default ChatListPage;
