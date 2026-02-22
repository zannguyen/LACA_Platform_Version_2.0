import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Blocked.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export default function Blocked() {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const getAccessToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/users/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data?.data || []);
      }
    } catch (err) {
      console.error("Fetch blocked users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/users/unblock/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlockedUsers(blockedUsers.filter((u) => u._id !== userId));
      }
    } catch (err) {
      console.error("Unblock error:", err);
    }
  };

  return (
    <div className="blocked-page">
      <div className="blocked-header">
        <button className="blocked-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Blocked</h1>
      </div>

      <div className="blocked-list">
        {loading ? (
          <p className="blocked-loading">Loading...</p>
        ) : blockedUsers.length === 0 ? (
          <p className="blocked-empty">No blocked users</p>
        ) : (
          blockedUsers.map((user) => (
            <div key={user._id} className="blocked-user-card">
              <div className="blocked-card-top">
                <button
                  className="blocked-unblock-text"
                  onClick={() => unblockUser(user._id)}
                >
                  Unblock
                </button>
              </div>

              <div className="blocked-card-content">
                <img
                  src={user.profileImage || user.avatar || "/default-avatar.png"}
                  alt={user.username}
                  className="blocked-avatar"
                />

                <p className="blocked-user-name">
                  {user.fullname || user.username}
                </p>

                <button
                  className="blocked-close"
                  onClick={() => unblockUser(user._id)}
                  aria-label="Close"
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
