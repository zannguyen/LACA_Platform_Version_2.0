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
        <h1>Blocked Users</h1>
      </div>

      <div className="blocked-list">
        {loading ? (
          <p className="blocked-loading">Loading...</p>
        ) : blockedUsers.length === 0 ? (
          <p className="blocked-empty">No blocked users</p>
        ) : (
          blockedUsers.map((user) => (
            <div key={user._id} className="blocked-item">
              <div className="blocked-user-info">
                <img
                  src={user.avatar || "/default-avatar.png"}
                  alt={user.username}
                  className="blocked-avatar"
                />
                <div>
                  <p className="blocked-name">
                    {user.fullname || user.username}
                  </p>
                  <p className="blocked-username">@{user.username}</p>
                </div>
              </div>
              <button
                className="blocked-unblock-btn"
                onClick={() => unblockUser(user._id)}
              >
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
