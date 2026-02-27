// src/components/report/ReportModal.jsx
import React, { useMemo, useState } from "react";
import { createReport } from "../../api/reportApi";
import "./ReportModal.css";

const MAX_REASON = 500;
const MAX_DESC = 1000;

const CATEGORIES = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Quấy rối" },
  { value: "inappropriate", label: "Không phù hợp" },
  { value: "false_info", label: "Thông tin sai" },
  { value: "other", label: "Khác" },
];

export default function ReportModal({
  open,
  onClose,
  targetType = "post",
  targetId,
}) {
  const [category, setCategory] = useState("spam");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const reasonTrim = useMemo(() => reason.trim(), [reason]);
  const descTrim = useMemo(() => description.trim(), [description]);

  const close = (ok) => {
    if (isSubmitting) return;
    setErr("");
    if (ok) {
      setCategory("spam");
      setReason("");
      setDescription("");
    }
    onClose?.(ok);
  };

  const submit = async () => {
    try {
      setErr("");

      if (!targetId) {
        setErr("Thiếu targetId.");
        return;
      }
      if (reasonTrim.length < 5) {
        setErr("Lý do phải ít nhất 5 ký tự.");
        return;
      }
      if (reasonTrim.length > MAX_REASON) {
        setErr(`Lý do tối đa ${MAX_REASON} ký tự.`);
        return;
      }
      if (descTrim.length > MAX_DESC) {
        setErr(`Mô tả tối đa ${MAX_DESC} ký tự.`);
        return;
      }

      setIsSubmitting(true);
      await createReport({
        targetType,
        targetId,
        category,
        reason: reasonTrim,
        description: descTrim,
      });

      close(true);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Báo cáo thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="report-modal-backdrop" onClick={() => close(false)}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <span className="report-modal-title">Báo cáo</span>
          <button
            type="button"
            className="report-modal-close"
            onClick={() => close(false)}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="report-field">
          <label>Loại vi phạm</label>
          <div className="report-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`chip ${category === c.value ? "active" : ""}`}
                onClick={() => setCategory(c.value)}
                disabled={isSubmitting}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="report-field">
          <label>Lý do (5-500 ký tự)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            maxLength={MAX_REASON}
            placeholder="Nhập lý do báo cáo..."
            disabled={isSubmitting}
          />
          <div className="report-counter">
            {reason.length}/{MAX_REASON}
          </div>
        </div>

        <div className="report-field">
          <label>Mô tả chi tiết (không bắt buộc)</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            placeholder="Mô tả chi tiết hơn..."
            disabled={isSubmitting}
            maxLength={MAX_DESC}
            className="report-desc"
          />
          <div className="report-counter">
            {description.length}/{MAX_DESC}
          </div>
        </div>

        {err && <div className="report-error">{err}</div>}

        <div className="report-actions">
          <button
            type="button"
            className="report-cancel-btn"
            onClick={() => close(false)}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="report-submit-btn"
            onClick={submit}
            disabled={isSubmitting || reasonTrim.length === 0}
          >
            {isSubmitting ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}
