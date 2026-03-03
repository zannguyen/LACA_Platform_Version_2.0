import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, getRecentActivity } from "../../api/admin.api";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeLocations: 0,
    pendingReviews: 0,
    totalPosts: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Activity detail modal
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, activityRes] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(5),
      ]);

      // ✅ SAFE SET STATS
      if (statsRes?.success && statsRes?.data) {
        setStats({
          totalUsers: statsRes.data.totalUsers ?? 0,
          activeLocations: statsRes.data.activeLocations ?? 0,
          pendingReviews: statsRes.data.pendingReviews ?? 0,
          totalPosts: statsRes.data.totalPosts ?? 0,
        });
      } else {
        setError(statsRes?.message || "Failed to load dashboard stats");
      }

      // ✅ SAFE SET ACTIVITY
      if (activityRes?.success && Array.isArray(activityRes.data)) {
        setRecentActivity(activityRes.data);
      } else {
        setRecentActivity([]);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <p className="error-text">{error}</p>
          <button className="btn-retry" onClick={fetchDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="btn-refresh" onClick={fetchDashboardData}>
          ⟳
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">
              {(stats.totalUsers ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-label">Active Locations</div>
            <div className="stat-value">
              {(stats.activeLocations ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending Reviews</div>
            <div className="stat-value">
              {(stats.pendingReviews ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-label">Total Posts</div>
            <div className="stat-value">
              {(stats.totalPosts ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
        </div>

        <div className="activity-list">
          {recentActivity.length === 0 ? (
            <div className="empty-state">No recent activity</div>
          ) : (
            recentActivity.map((activity, index) => (
              <div
                key={activity.id || index}
                className="activity-item"
                onClick={() => setSelectedActivity(activity)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedActivity(activity)}
              >
                <div className="activity-avatar">
                  {activity?.user?.avatar ? (
                    <img
                      src={activity.user.avatar}
                      alt={activity.user.name}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {activity?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>

                <div className="activity-content">
                  <div className="activity-user">
                    {activity?.user?.name || "Unknown"}
                  </div>
                  <div className="activity-action">
                    {activity?.action || "-"}
                  </div>
                  <div className="activity-location">
                    {activity?.location || "-"}
                  </div>
                </div>

                <div className="activity-time">
                  {formatTimestamp(activity?.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tags/Categories Management Quick Link */}
      <div className="quick-actions-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <button
            className="quick-action-card"
            onClick={() => navigate("/admin/tags")}
          >
            <div className="quick-action-icon">🏷️</div>
            <div className="quick-action-title">Manage Tags & Categories</div>
            <div className="quick-action-desc">Create, edit, and manage tags and categories</div>
          </button>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content activity-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Activity Details</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedActivity(null)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="modal-body">
              {/* User Info */}
              <div className="detail-section">
                <div className="detail-label">User</div>
                <div className="detail-user">
                  <div className="detail-avatar">
                    {selectedActivity?.user?.avatar ? (
                      <img src={selectedActivity.user.avatar} alt={selectedActivity.user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {selectedActivity?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="detail-user-info">
                    <div className="detail-user-name">
                      {selectedActivity?.user?.name || "Unknown"}
                    </div>
                    <div className="detail-user-email">
                      {selectedActivity?.user?.email || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="detail-section">
                <div className="detail-label">Action</div>
                <div className="detail-value">
                  {selectedActivity?.action || "-"}
                </div>
              </div>

              {/* Location */}
              <div className="detail-section">
                <div className="detail-label">Location</div>
                <div className="detail-value">
                  {selectedActivity?.location || "-"}
                </div>
              </div>

              {/* Timestamp */}
              <div className="detail-section">
                <div className="detail-label">Time</div>
                <div className="detail-value">
                  {selectedActivity?.timestamp
                    ? new Date(selectedActivity.timestamp).toLocaleString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>

              {/* Additional Details */}
              {selectedActivity?.details && (
                <div className="detail-section">
                  <div className="detail-label">Additional Details</div>
                  <div className="detail-value detail-details">
                    {Object.entries(selectedActivity.details).map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <span className="detail-key">{key}:</span>
                        <span className="detail-value-text">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IP Address */}
              {selectedActivity?.ipAddress && (
                <div className="detail-section">
                  <div className="detail-label">IP Address</div>
                  <div className="detail-value">
                    {selectedActivity.ipAddress}
                  </div>
                </div>
              )}

              {/* Device/Browser Info */}
              {selectedActivity?.device && (
                <div className="detail-section">
                  <div className="detail-label">Device</div>
                  <div className="detail-value">
                    {selectedActivity.device}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-close"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
