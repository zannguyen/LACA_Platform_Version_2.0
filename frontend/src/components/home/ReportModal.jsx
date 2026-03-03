import React, { useState } from "react";
import { createReport } from "../../api/reportApi";
import "./ReportModal.css";

const REPORT_CATEGORIES = [
  { value: "spam", label: "Spam / Quảng cáo" },
  { value: "harassment", label: "Quấy rối / Lăng mạ" },
  { value: "inappropriate", label: "Nội dung không phù hợp" },
  { value: "false_info", label: "Thông tin sai sự thật" },
  { value: "other", label: "Lý do khác" },
];

export default function ReportModal({ isOpen, onClose, target, targetType = "post" }) {
  const [category, setCategory] = useState("spam");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do báo cáo");
      return;
    }

    if (reason.trim().length < 5) {
      setError("Lý do báo cáo phải có ít nhất 5 ký tự");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createReport({
        targetId: target._id,
        targetType,
        reason: reason.trim(),
        category,
        description: description.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error("Report error:", err);
      setError(err.response?.data?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategory("spam");
    setReason("");
    setDescription("");
    setSuccess(false);
    setError("");
    onClose();
  };

  const getTargetInfo = () => {
    if (!target) return "";

    if (targetType === "post") {
      const content = target.content?.substring(0, 50) || "bài đăng";
      return content + (target.content?.length > 50 ? "..." : "");
    }

    if (targetType === "user") {
      return target.fullname || target.username || "người dùng";
    }

    if (targetType === "place") {
      return target.name || "địa điểm";
    }

    return "nội dung";
  };

  return (
    <div className="report-modal-backdrop" onClick={handleClose}>
      <div className="report-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>Báo cáo {targetType === "post" ? "bài đăng" : targetType === "user" ? "người dùng" : "địa điểm"}</h3>
          <button className="report-modal-close" onClick={handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {success ? (
          <div className="report-modal-success">
            <div className="success-icon">
              <i className="fa-solid fa-check-circle"></i>
            </div>
            <h4>Cảm ơn bạn!</h4>
            <p>Báo cáo của bạn đã được gửi đi. Chúng tôi sẽ xem xét sớm nhất có thể.</p>
          </div>
        ) : (
          <form className="report-modal-form" onSubmit={handleSubmit}>
            <div className="report-target-info">
              <span className="label">Báo cáo:</span>
              <span className="target-name">{getTargetInfo()}</span>
            </div>

            <div className="form-group">
              <label>Danh mục *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select"
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Lý do báo cáo *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Mô tả chi tiết lý do báo cáo..."
                className="form-textarea"
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Thông tin bổ sung (không bắt buộc)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm thông tin khác có thể giúp chúng tôi xem xét..."
                className="form-textarea"
                rows={2}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="report-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
