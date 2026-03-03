import React, { useState, useEffect } from "react";
import { adminFeedbackApi } from "../../api/adminFeedbackApi";
import "./FeedbackManagement.css";

const FeedbackManagement = () => {
  const [activeTab, setActiveTab] = useState("feedback");
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, [activeTab, statusFilter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await adminFeedbackApi.getAll({
        type: activeTab,
        status: statusFilter || undefined,
      });
      setFeedbacks(res.data);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReply = (feedback) => {
    setSelectedFeedback(feedback);
    setReplyText(feedback.reply || "");
  };

  const handleCloseReply = () => {
    setSelectedFeedback(null);
    setReplyText("");
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedFeedback) return;

    setSending(true);
    try {
      await adminFeedbackApi.reply(selectedFeedback._id, {
        reply: replyText.trim(),
        sendEmail: true,
      });
      handleCloseReply();
      fetchFeedbacks();
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Gửi phản hồi thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (feedbackId) => {
    try {
      await adminFeedbackApi.markAsRead(feedbackId);
      fetchFeedbacks();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      new: { label: "Mới", class: "badge-new" },
      read: { label: "Đã đọc", class: "badge-read" },
      resolved: { label: "Đã giải quyết", class: "badge-resolved" },
    };
    const s = statusMap[status] || statusMap.new;
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="feedback-management">
      <div className="page-header">
        <h1>Quản lý Feedback & Report</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "feedback" ? "active" : ""}`}
          onClick={() => setActiveTab("feedback")}
        >
          Góp ý
        </button>
        <button
          className={`tab ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          Báo lỗi
        </button>
      </div>

      {/* Filter */}
      <div className="filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="new">Mới</option>
          <option value="read">Đã đọc</option>
          <option value="resolved">Đã giải quyết</option>
        </select>
      </div>

      {/* List */}
      <div className="feedback-list">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : feedbacks.length === 0 ? (
          <div className="empty">Không có dữ liệu</div>
        ) : (
          feedbacks.map((item) => (
            <div
              key={item._id}
              className={`feedback-item ${item.status === "new" ? "unread" : ""}`}
            >
              <div className="feedback-header">
                <div className="feedback-user">
                  <strong>{item.userId?.fullname || "Người dùng ẩn"}</strong>
                  <span className="email">{item.userEmail}</span>
                </div>
                <div className="feedback-meta">
                  {getStatusBadge(item.status)}
                  <span className="date">{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <div className="feedback-content">{item.content}</div>
              {item.reply && (
                <div className="feedback-reply">
                  <strong>Phản hồi:</strong> {item.reply}
                </div>
              )}
              <div className="feedback-actions">
                {item.status === "new" && (
                  <button
                    className="btn-mark-read"
                    onClick={() => handleMarkAsRead(item._id)}
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
                <button
                  className="btn-reply"
                  onClick={() => handleOpenReply(item)}
                >
                  Phản hồi
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={handleCloseReply}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Phản hồi {activeTab === "feedback" ? "góp ý" : "báo lỗi"}</h2>
              <button className="close-btn" onClick={handleCloseReply}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="original-feedback">
                <strong>Từ:</strong> {selectedFeedback.userId?.fullname || "Người dùng ẩn"} (
                {selectedFeedback.userEmail})
                <br />
                <strong>Nội dung:</strong>
                <p>{selectedFeedback.content}</p>
              </div>
              <div className="reply-form">
                <label>Phản hồi:</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nhập nội dung phản hồi..."
                  rows={5}
                />
                <p className="hint">
                  Email phản hồi sẽ được gửi đến địa chỉ email của người dùng.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseReply}>
                Hủy
              </button>
              <button
                className="btn-send"
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
              >
                {sending ? "Đang gửi..." : "Gửi phản hồi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
