// frontend/src/components/admin/BroadcastNotification.jsx
import React, { useState } from "react";
import broadcastApi from "../../api/broadcastApi";
import "./BroadcastNotification.css";

export default function BroadcastNotification({ onBroadcastSent = null }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const titleMax = 200;
  const bodyMax = 1000;

  const titleLength = title.length;
  const bodyLength = body.length;

  const isFormValid = title.trim().length > 0;

  const handleReset = () => {
    setTitle("");
    setBody("");
    setLink("");
    setError("");
    setSuccess("");
  };

  const handleSendClick = () => {
    if (!isFormValid) {
      setError("Title is required");
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || null,
      };

      const response = await broadcastApi.sendBroadcastToAll(payload);

      if (response.success) {
        setSuccess(
          `Broadcast sent successfully to ${response.data?.recipientCount || 0} users`
        );
        handleReset();

        if (onBroadcastSent) {
          onBroadcastSent(response.data);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.message || "Failed to send broadcast");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send broadcast";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="broadcast-compose">
      <h2>📢 Compose Broadcast</h2>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, titleMax))}
          placeholder="Enter notification title"
          maxLength={titleMax}
          disabled={loading}
        />
        <div
          className={`char-counter ${
            titleLength > titleMax * 0.9 ? "warning" : ""
          }`}
        >
          {titleLength} / {titleMax}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="body">Message</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, bodyMax))}
          placeholder="Enter notification message (optional)"
          maxLength={bodyMax}
          disabled={loading}
        />
        <div
          className={`char-counter ${bodyLength > bodyMax * 0.9 ? "warning" : ""}`}
        >
          {bodyLength} / {bodyMax}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="link">Link (optional)</label>
        <input
          id="link"
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="e.g., /home, /posts/123"
          disabled={loading}
        />
      </div>

      <div className="preview-section">
        <h3>Preview</h3>
        <div className="notification-preview">
          {title.trim() ? (
            <>
              <div className="notification-preview-title">{title}</div>
              {body.trim() && (
                <div className="notification-preview-body">{body}</div>
              )}
            </>
          ) : (
            <div className="notification-preview-empty">
              Your notification will appear here
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button
          className="btn-send"
          onClick={handleSendClick}
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Sending...
            </>
          ) : (
            "Send to All Users"
          )}
        </button>
        <button
          className="btn-reset"
          onClick={handleReset}
          disabled={loading}
        >
          Clear
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay" onClick={() => setShowConfirmation(false)}>
          <div
            className="confirmation-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>⚠️ Confirm Broadcast</h3>
            <p>
              You are about to send this notification to all active users. This
              action cannot be undone.
            </p>

            <div className="confirmation-preview">
              <div className="confirmation-preview-title">{title}</div>
              {body.trim() && (
                <div className="confirmation-preview-body">{body}</div>
              )}
            </div>

            <div className="confirmation-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmSend}
                disabled={loading}
              >
                {loading ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
