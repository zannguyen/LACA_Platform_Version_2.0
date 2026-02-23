// frontend/src/components/admin/BroadcastHistory.jsx
import React, { useState, useEffect } from "react";
import broadcastApi from "../../api/broadcastApi";
import BroadcastDetailsModal from "./BroadcastDetailsModal";
import "./BroadcastNotification.css";

export default function BroadcastHistory({ refreshTrigger = 0 }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);

  const limit = 20;

  useEffect(() => {
    fetchBroadcasts();
  }, [page, status, refreshTrigger]);

  const fetchBroadcasts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await broadcastApi.getBroadcastHistory({
        page,
        limit,
        status: status !== "all" ? status : null,
      });

      if (response.success) {
        setBroadcasts(response.broadcasts || []);
        setTotalPages(response.totalPages || 1);
      } else {
        setError(response.message || "Failed to load broadcast history");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load broadcast history";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleViewDetails = (broadcast) => {
    setSelectedBroadcast(broadcast);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge ${status}`;
  };

  const statuses = ["all", "pending", "sending", "completed", "failed"];

  return (
    <div className="broadcast-history">
      <h2>📋 Broadcast History</h2>

      {error && <div className="alert error">{error}</div>}

      <div className="history-filters">
        {statuses.map((s) => (
          <button
            key={s}
            className={`filter-btn ${status === s ? "active" : ""}`}
            onClick={() => handleStatusFilter(s)}
            disabled={loading}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#999" }}>
          <div className="loading-spinner" style={{ display: "inline-block" }}></div>
          <p>Loading broadcasts...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">📭</div>
          <p>No broadcasts found</p>
        </div>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Sent By</th>
                <th>Recipients</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast._id}>
                  <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {broadcast.title}
                  </td>
                  <td>{broadcast.adminId?.fullname || "Unknown"}</td>
                  <td>
                    {broadcast.deliveredCount} / {broadcast.recipientCount}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(broadcast.status)}>
                      {broadcast.status}
                    </span>
                  </td>
                  <td>{formatDate(broadcast.sentAt)}</td>
                  <td>
                    <button
                      style={{
                        padding: "6px 12px",
                        background: "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                      onClick={() => handleViewDetails(broadcast)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
              >
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={page === p ? "active" : ""}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {selectedBroadcast && (
        <BroadcastDetailsModal
          broadcast={selectedBroadcast}
          onClose={() => setSelectedBroadcast(null)}
        />
      )}
    </div>
  );
}
