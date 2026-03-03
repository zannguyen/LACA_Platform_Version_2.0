import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import "./Blocked.css";

export default function Blocked() {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const res = await userApi.getBlockedUsers();
      setBlockedUsers(res?.data?.data || []);
    } catch (err) {
      console.error("Fetch blocked users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId) => {
    try {
      await userApi.unblockUser(userId);
      setBlockedUsers((prev) =>
        prev.filter((u) => String(u.blockedUserId) !== String(userId)),
      );
    } catch (err) {
      console.error("Unblock error:", err);
    }
  };

  const confirmUnblock = (userId) => {
    const ok = window.confirm("Bạn có muốn bỏ chặn người dùng này không?");
    if (!ok) return;
    unblockUser(userId);
  };

  return (
    <div className="blocked-page">
      <div className="blocked-header">
        <button className="blocked-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Đã chặn</h1>
      </div>

      <div className="blocked-list">
        {loading ? (
          <p className="blocked-loading">Đang tải...</p>
        ) : blockedUsers.length === 0 ? (
          <p className="blocked-empty">Không có người dùng bị chặn</p>
        ) : (
          blockedUsers.map((user) => (
            <div key={user.blockedUserId} className="blocked-user-card">
              <div className="blocked-card-top">
                <button
                  className="blocked-unblock-text"
                  onClick={() => unblockUser(user.blockedUserId)}
                >
                  Bỏ chặn
                </button>
              </div>

              <div className="blocked-card-content">
                <img
                  src={user.avatar || "/default-avatar.png"}
                  alt={user.username || user.fullname || "user"}
                  className="blocked-avatar"
                />

                <p className="blocked-user-name">
                  {user.fullname || user.username}
                </p>

                <button
                  className="blocked-close"
                  onClick={() => confirmUnblock(user.blockedUserId)}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
