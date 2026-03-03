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
  const [pendingDelete, setPendingDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("private"); // "private" or "public"
  const conversationsRef = useRef([]);
  const pendingDeleteTimeoutRef = useRef(null);
  const pendingDeleteIntervalRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (pendingDeleteTimeoutRef.current) {
        clearTimeout(pendingDeleteTimeoutRef.current);
      }
      if (pendingDeleteIntervalRef.current) {
        clearInterval(pendingDeleteIntervalRef.current);
      }
    };
  }, []);

  const handleChatClick = (conversation) => {
    const other = getOtherParticipant(conversation.participants);
    if (!other?._id) return;

    localStorage.setItem("chatReceiverId", other._id);
    localStorage.setItem("chatReceiverName", getUserLabel(other));

    navigate("/chat/detail");
  };

  const removeConversationFromState = (conversationId) => {
    setConversations((prev) => {
      const next = prev.filter(
        (conv) => String(conv._id) !== String(conversationId),
      );
      conversationsRef.current = next;
      return next;
    });
  };

  const markConversationReadInState = (conversationId) => {
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
  };

  const syncConversationRead = async (conversationId) => {
    try {
      await chatApi.markConversationRead(conversationId);
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc conversation:", err);
    }
  };

  const restoreConversationToState = (conversation, originalIndex) => {
    setConversations((prev) => {
      const exists = prev.some(
        (conv) => String(conv._id) === String(conversation._id),
      );
      if (exists) return prev;

      const next = [...prev];
      const insertIndex = Math.max(0, Math.min(originalIndex, next.length));
      next.splice(insertIndex, 0, conversation);
      conversationsRef.current = next;
      return next;
    });
  };

  const clearPendingDeleteTimers = () => {
    if (pendingDeleteTimeoutRef.current) {
      clearTimeout(pendingDeleteTimeoutRef.current);
      pendingDeleteTimeoutRef.current = null;
    }
    if (pendingDeleteIntervalRef.current) {
      clearInterval(pendingDeleteIntervalRef.current);
      pendingDeleteIntervalRef.current = null;
    }
  };

  const commitDeleteConversation = async (pending) => {
    try {
      await chatApi.deleteConversation(pending.conversation._id);
      showToast(
        pending.isPublic ? "Đã rời cuộc trò chuyện" : "Đã xóa đoạn chat",
      );
    } catch (err) {
      console.error("Lỗi xóa cuộc trò chuyện:", err);
      restoreConversationToState(pending.conversation, pending.originalIndex);
      showToast("Không thể xóa đoạn chat");
    }
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;

    clearPendingDeleteTimers();
    restoreConversationToState(
      pendingDelete.conversation,
      pendingDelete.originalIndex,
    );
    setPendingDelete(null);
    showToast("Đã hoàn tác xóa đoạn chat");
  };

  const handleDeleteConversation = async (conversation, event) => {
    event.stopPropagation();

    if (pendingDelete) {
      showToast("Hoàn tác hoặc chờ xóa đoạn chat trước đó");
      return;
    }

    const isPublic = conversation?.type === "public";
    const actionLabel = isPublic ? "rời khỏi" : "xóa";
    const confirmed = window.confirm(
      `Bạn có chắc muốn ${actionLabel} đoạn chat này không?`,
    );
    if (!confirmed) return;

    const originalIndex = conversationsRef.current.findIndex(
      (conv) => String(conv._id) === String(conversation._id),
    );

    removeConversationFromState(conversation._id);

    const pending = {
      conversation,
      isPublic,
      originalIndex,
      secondsLeft: 5,
    };

    setPendingDelete(pending);

    pendingDeleteIntervalRef.current = setInterval(() => {
      setPendingDelete((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          secondsLeft: Math.max(prev.secondsLeft - 1, 0),
        };
      });
    }, 1000);

    pendingDeleteTimeoutRef.current = setTimeout(async () => {
      clearPendingDeleteTimers();
      setPendingDelete(null);
      await commitDeleteConversation(pending);
    }, 5000);
  };

  const handleOpenPrivateConversation = (conversation) => {
    markConversationReadInState(conversation._id);
    syncConversationRead(conversation._id);
    handleChatClick(conversation);
  };

  const handleOpenPublicConversation = (conversation, postIdStr) => {
    if (!postIdStr) return;
    markConversationReadInState(conversation._id);
    syncConversationRead(conversation._id);
    navigate(`/chat/public/${postIdStr}`);
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
                  onClick={() => handleOpenPrivateConversation(conv)}
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
                    <button
                      type="button"
                      className="chat-delete-btn"
                      onClick={(event) => handleDeleteConversation(conv, event)}
                      aria-label="Xóa đoạn chat"
                      title="Xóa đoạn chat"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
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
                  onClick={() => handleOpenPublicConversation(conv, postIdStr)}
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
                    <button
                      type="button"
                      className="chat-delete-btn"
                      onClick={(event) => handleDeleteConversation(conv, event)}
                      aria-label="Xóa đoạn chat"
                      title="Rời khỏi đoạn chat"
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </button>
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

      {pendingDelete && (
        <div className="chat-undo-toast" role="status" aria-live="polite">
          <span>
            Đã {pendingDelete.isPublic ? "rời tạm" : "xóa tạm"} đoạn chat
          </span>
          <button type="button" onClick={handleUndoDelete}>
            Hoàn tác ({pendingDelete.secondsLeft}s)
          </button>
        </div>
      )}

      {toast && <div className="chat-toast">{toast}</div>}
    </div>
  );
};

export default ChatListPage;
