import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import PublicChatMessages from "../components/Chat/PublicChatMessages";
import PublicChatParticipants from "../components/Chat/PublicChatParticipants";
import PublicChatInput from "../components/Chat/PublicChatInput";
import * as publicChatApi from "../api/publicChatApi";
import "../components/Chat/PublicChat.css";

const PublicChatPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [postInfo, setPostInfo] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const currentUserId = JSON.parse(localStorage.getItem("user") || "{}")?._id;

  // Join public chat and fetch initial data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        setError("");

        // Join public chat
        const conversation = await publicChatApi.joinPublicChat(postId);

        // Fetch all messages
        const msgs = await publicChatApi.getPublicMessages(postId);
        setMessages(msgs);

        // Fetch participants
        const parts = await publicChatApi.getPublicParticipants(postId);
        setParticipants(parts);

        // Extract post info from first message or store it
        if (msgs.length > 0 && msgs[0].postId) {
          setPostInfo({ _id: msgs[0].postId });
        }
      } catch (err) {
        console.error("Initialize chat error:", err);
        setError(err?.response?.data?.message || "Không thể tải chat");
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    // Join Socket.IO room for this post
    if (socket) {
      socket.emit("join_post_chat", postId);
    }

    return () => {
      // Leave Socket.IO room when component unmounts
      if (socket) {
        socket.emit("leave_post_chat", postId);
      }
    };
  }, [postId, socket]);

  // Socket.IO listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleUserJoined = (user) => {
      console.log("User joined:", user);
      // Refresh participants
      publicChatApi.getPublicParticipants(postId).then(setParticipants);
    };

    const handleUserLeft = (data) => {
      console.log("User left:", data);
      // Refresh participants
      publicChatApi.getPublicParticipants(postId).then(setParticipants);
    };

    const handleParticipantsUpdated = (parts) => {
      setParticipants(parts);
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("participants_updated", handleParticipantsUpdated);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("participants_updated", handleParticipantsUpdated);
    };
  }, [socket, postId]);

  const handleSendMessage = async ({ text, image }) => {
    try {
      setSending(true);
      await publicChatApi.sendPublicMessage(postId, text, image);
      // Message will be added via Socket.IO event
    } catch (err) {
      console.error("Send message error:", err);
      alert("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleLeaveChat = async () => {
    try {
      await publicChatApi.leavePublicChat(postId);
      navigate(-1);
    } catch (err) {
      console.error("Leave chat error:", err);
      alert("Không thể rời khỏi chat");
    }
  };

  return (
    <div className="mobile-wrapper">
      <div className="public-chat-wrapper">
        {/* Header */}
        <div className="public-chat-header">
          <button className="public-chat-back-btn" onClick={handleLeaveChat}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="public-chat-post-info">
            <div className="public-chat-post-title">
              Bình luận bài viết
            </div>
          </div>
          <button
            className="public-chat-participants-btn"
            onClick={() => setShowParticipantsModal(true)}
            title="Xem người tham gia"
          >
            <i className="fa-solid fa-users"></i>
            <span className="public-chat-participants-count">{participants.length}</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ padding: "var(--space-md)", color: "var(--error)", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Main content */}
        <div className="public-chat-content">
          <div className="public-chat-messages-area">
            <PublicChatMessages
              messages={messages}
              currentUserId={currentUserId}
              loading={loading}
            />
            <PublicChatInput onSendMessage={handleSendMessage} loading={sending} />
          </div>
        </div>

        {/* Participants Modal */}
        {showParticipantsModal && (
          <div className="public-chat-modal-overlay" onClick={() => setShowParticipantsModal(false)}>
            <div className="public-chat-modal" onClick={(e) => e.stopPropagation()}>
              <div className="public-chat-modal-header">
                <h3>Người tham gia ({participants.length})</h3>
                <button
                  className="public-chat-modal-close"
                  onClick={() => setShowParticipantsModal(false)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="public-chat-modal-content">
                {participants.length === 0 ? (
                  <div className="public-chat-modal-empty">Chưa có ai tham gia</div>
                ) : (
                  participants.map((participant) => (
                    <div key={participant._id} className="public-chat-modal-participant">
                      <div className="public-chat-modal-avatar">
                        {participant.avatar ? (
                          <img src={participant.avatar} alt={participant.username} />
                        ) : (
                          <i className="fa-solid fa-user"></i>
                        )}
                      </div>
                      <div className="public-chat-modal-info">
                        <div className="public-chat-modal-name-wrapper">
                          <div className="public-chat-modal-name">
                            {participant.fullname || participant.username}
                          </div>
                          {participant.role === "post_owner" && (
                            <span className="public-chat-role-badge">Chủ bài viết</span>
                          )}
                        </div>
                        <div className="public-chat-modal-username">
                          @{participant.username}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicChatPage;
