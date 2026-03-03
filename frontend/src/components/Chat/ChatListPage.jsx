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
  const [activeTab, setActiveTab] = useState("private"); // "private" or "public"
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

  // Filter conversations by type
  const filteredConversations = useMemo(() => {
    if (activeTab === "private") {
      return conversations.filter((conv) => conv.type !== "public");
    } else {
      const publicConvs = conversations.filter(
        (conv) => conv.type === "public",
      );
      console.log(
        `Tab "Công khai" - filtered ${publicConvs.length} conversations from ${conversations.length} total`,
      );
      return publicConvs;
    }
  }, [conversations, activeTab]);

  useEffect(() => {
    setCurrentUserId(getCurrentUserId());
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await chatApi.getConversations();
        console.log("ChatList API response:", response);
        const data = response.data || [];
        console.log("ChatList conversations data:", data);
        console.log(
          "Public conversations:",
          data.filter((c) => c.type === "public"),
        );
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
    <div className="auth-form chat-list-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="page-title">Chat</h2>
      </div>

      {/* Tabs */}
      <div className="chat-tabs">
        <button
          className={`chat-tab ${activeTab === "private" ? "active" : ""}`}
          onClick={() => setActiveTab("private")}
        >
          <i className="fa-solid fa-user"></i> Riêng tư
        </button>
        <button
          className={`chat-tab ${activeTab === "public" ? "active" : ""}`}
          onClick={() => setActiveTab("public")}
        >
          <i className="fa-solid fa-users"></i> Công khai
        </button>
      </div>

      <div className="chat-list">
        {loading ? (
          <div className="chat-list-state-wrap">
            <div className="chat-list-state-card">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p className="chat-list-state">Đang tải cuộc trò chuyện...</p>
            </div>
          </div>
        ) : error ? (
          <div className="chat-list-state-wrap">
            <div className="chat-list-state-card chat-list-state-card-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <p className="chat-list-state chat-list-error">{error}</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="chat-list-state-wrap">
            <div className="chat-list-state-card">
              <i
                className={`fa-solid ${
                  activeTab === "private" ? "fa-user-group" : "fa-comments"
                }`}
              ></i>
              <p className="chat-list-state chat-list-empty">
                {activeTab === "private"
                  ? "Chưa có cuộc trò chuyện riêng tư"
                  : "Chưa có cuộc trò chuyện công khai"}
              </p>
              <span className="chat-list-state-note">
                {activeTab === "private"
                  ? "Khi có tin nhắn mới, cuộc trò chuyện sẽ xuất hiện tại đây."
                  : "Tham gia trò chuyện công khai để xem nội dung ở đây."}
              </span>
            </div>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            if (activeTab === "private") {
              // Private chat rendering
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
                  className={`chat-item ${isUnread ? "is-unread" : ""}`}
                  onClick={() => handleChatClick(conv)}
                >
                  <div className="avatar-wrap">
                    <div className="avatar-circle" style={avatarStyle}>
                      {!other?.avatar && getInitials(other)}
                    </div>
                    <span
                      className={`status-dot ${isOnline ? "online" : ""}`}
                    />
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
                        ? new Date(lastMessageTime).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : ""}
                    </span>
                    {isUnread && <span className="chat-unread-dot" />}
                  </div>
                </div>
              );
            } else {
              // Public chat rendering
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

              // Convert postId to string for navigation
              // Handle both populated object {_id, content} and raw ID
              const postIdStr = conv.postId?._id
                ? String(conv.postId._id)
                : conv.postId
                  ? String(conv.postId)
                  : "";

              console.log("Rendering public chat:", {
                _id: conv._id,
                postId: postIdStr,
                postIdType: typeof conv.postId,
                title: conv.title,
              });

              return (
                <div
                  key={conv._id}
                  className={`chat-item ${isUnread ? "is-unread" : ""}`}
                  onClick={() =>
                    postIdStr && navigate(`/chat/public/${postIdStr}`)
                  }
                >
                  <div className="avatar-wrap">
                    <div
                      className="avatar-circle"
                      style={{ background: "var(--primary)" }}
                    >
                      <i className="fa-solid fa-comments"></i>
                    </div>
                  </div>

                  <div className="chat-info">
                    <h4 className="chat-name">{conv.title || "Cộng đồng"}</h4>
                    <p className="chat-preview">
                      {lastMessageText || "Không có tin nhắn"}
                    </p>
                  </div>

                  <div className="chat-meta">
                    <span className="chat-time">
                      {lastMessageTime
                        ? new Date(lastMessageTime).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : ""}
                    </span>
                    {isUnread && <span className="chat-unread-dot" />}
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {toast && <div className="chat-toast">{toast}</div>}
    </div>
  );
};

export default ChatListPage;
