import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import chatApi from "../../api/chatApi";
import { SOCKET_URL } from "../../config/socket";
import "./Chat.css";

const ChatDetailPage = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("User");
  const [receiverAvatar, setReceiverAvatar] = useState(null);
  const [conversationId, setConversationId] = useState("");
  const conversationIdRef = useRef("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [toast, setToast] = useState("");
  const messageEndRef = useRef(null);
  const previousLengthRef = useRef(0);
  const [avatarErrors, setAvatarErrors] = useState(new Set());
  const [newMessageKey, setNewMessageKey] = useState(null);

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

        // Extract receiver avatar from first message if available
        if (
          first?.senderId?.avatar &&
          String(first.senderId._id) !== String(me)
        ) {
          setReceiverAvatar(first.senderId.avatar);
        } else if (
          first?.senderId?.avatar &&
          String(first.senderId._id) === String(me)
        ) {
          // If first message is from current user, look for receiver's message
          const receiverMsg = response.data?.find(
            (m) => String(m.senderId._id) !== String(me),
          );
          if (receiverMsg?.senderId?.avatar) {
            setReceiverAvatar(receiverMsg.senderId.avatar);
          }
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

  useEffect(() => {
    if (messages.length > previousLengthRef.current) {
      const latest = messages[messages.length - 1];
      setNewMessageKey(
        latest?._id || latest?.createdAt || `msg-${messages.length - 1}`,
      );
    }
    previousLengthRef.current = messages.length;
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
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <div
          className="avatar-circle chat-header-avatar"
          onClick={() => receiverId && navigate(`/profile/${receiverId}`)}
          title="Xem trang cá nhân"
        >
          {receiverAvatar ? (
            <img
              src={receiverAvatar}
              alt={receiverName}
              className="chat-header-avatar-image"
              onError={() => setReceiverAvatar(null)}
            />
          ) : (
            initials
          )}
        </div>

        <div className="chat-header-info">
          <span className="chat-header-name">{receiverName}</span>
          <span className="status-text">
            {receiverOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="message-container">
        {loading ? (
          <p className="chat-list-state">Đang tải tin nhắn...</p>
        ) : messages.length === 0 ? (
          <p className="chat-list-state chat-list-empty">
            Chưa có cuộc trò chuyện
          </p>
        ) : (
          messages.map((msg, idx) => {
            const isLatest = idx === messages.length - 1;
            const showUnread = msg.isSent && isLatest && msg.isRead === false;
            const senderInfo = msg.senderId;
            const senderName =
              typeof senderInfo === "object"
                ? senderInfo.fullname || senderInfo.username
                : "User";
            const senderAvatar =
              typeof senderInfo === "object" ? senderInfo.avatar : null;
            const senderId =
              typeof senderInfo === "object" ? senderInfo._id : senderInfo;
            const currentSenderKey = getSenderKey(msg);
            const prevSenderKey =
              idx > 0 ? getSenderKey(messages[idx - 1]) : "";
            const nextSenderKey =
              idx < messages.length - 1 ? getSenderKey(messages[idx + 1]) : "";
            const isFirstInGroup = currentSenderKey !== prevSenderKey;
            const isLastInGroup = currentSenderKey !== nextSenderKey;

            return (
              <div
                key={msg._id || msg.createdAt || idx}
                className={`message-row ${msg.isSent ? "me" : ""} ${!isFirstInGroup ? "grouped" : ""} ${newMessageKey === (msg._id || msg.createdAt || `msg-${idx}`) ? "is-new" : ""}`}
              >
                {!msg.isSent &&
                  (isLastInGroup ? (
                    <div
                      className="avatar-circle message-avatar-circle"
                      onClick={() =>
                        senderId && navigate(`/profile/${senderId}`)
                      }
                      title="Xem trang cá nhân"
                    >
                      {senderAvatar && !avatarErrors.has(String(senderId)) ? (
                        <img
                          src={senderAvatar}
                          alt={senderName}
                          className="chat-header-avatar-image"
                          onError={() => handleAvatarError(senderId)}
                        />
                      ) : (
                        senderName.charAt(0).toUpperCase()
                      )}
                    </div>
                  ) : (
                    <div className="message-avatar-spacer" aria-hidden="true" />
                  ))}

                <div className="message-content">
                  {!msg.isSent && isFirstInGroup && (
                    <button
                      className="message-sender-name"
                      onClick={() => navigate(`/profile/${senderId}`)}
                    >
                      {senderName}
                    </button>
                  )}
                  {msg.image ? (
                    <div
                      className={`message-image ${isFirstInGroup ? "group-start" : ""} ${isLastInGroup ? "group-end" : ""}`}
                    >
                      <img src={msg.image} alt="Message" />
                    </div>
                  ) : (
                    <div
                      className={`bubble ${msg.isSent ? "sent" : "received"} ${isFirstInGroup ? "group-start" : ""} ${isLastInGroup ? "group-end" : ""}`}
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
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>

      {toast && <div className="chat-toast">{toast}</div>}
    </div>
  );
};

export default ChatDetailPage;
