// frontend/src/components/admin/BroadcastDetailsModal.jsx
import React from "react";
import "./BroadcastNotification.css";

export default function BroadcastDetailsModal({ broadcast, onClose }) {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  const deliveryPercentage = broadcast.recipientCount
    ? Math.round((broadcast.deliveredCount / broadcast.recipientCount) * 100)
    : 0;

  return (
    <div className="confirmation-overlay" onClick={onClose}>
      <div
        className="confirmation-dialog"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>📬 Broadcast Details</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Title
            </label>
            <p style={{ margin: "4px 0 0 0", fontSize: "16px", fontWeight: "600", color: "#333" }}>
              {broadcast.title}
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Message
            </label>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666", lineHeight: "1.5" }}>
              {broadcast.body || "-"}
            </p>
          </div>

          {broadcast.link && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
                Link
              </label>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#667eea" }}>
                {broadcast.link}
              </p>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Sent By
            </label>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#333" }}>
              {broadcast.adminId?.fullname || "Unknown"}
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Status
            </label>
            <p style={{ margin: "4px 0 0 0" }}>
              <span className={`status-badge ${broadcast.status}`}>
                {broadcast.status}
              </span>
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Sent At
            </label>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#333" }}>
              {formatDate(broadcast.sentAt)}
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
              Delivery Status
            </label>
            <div style={{ margin: "8px 0 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", color: "#333" }}>
                  {broadcast.deliveredCount} / {broadcast.recipientCount} users
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#667eea" }}>
                  {deliveryPercentage}%
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#f0f0f0",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${deliveryPercentage}%`,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    transition: "width 0.3s ease",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {broadcast.errorMessage && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
                Error
              </label>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#f44336" }}>
                {broadcast.errorMessage}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            className="btn-cancel"
            onClick={onClose}
            style={{ flex: "none" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
