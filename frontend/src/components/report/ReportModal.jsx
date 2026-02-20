// src/components/report/ReportModal.jsx
import React, { useMemo, useState } from "react";
import GradientButton from "../ui/GradientButton";
import TextArea from "../ui/TextArea";
import { createReport } from "../../api/reportApi";
import "./ReportModal.css";

const MAX_REASON = 500;
const MAX_DESC = 1000;

const CATEGORIES = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "false_info", label: "False info" },
  { value: "other", label: "Other" },
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
        setErr("Reason phải ít nhất 5 ký tự.");
        return;
      }
      if (reasonTrim.length > MAX_REASON) {
        setErr(`Reason tối đa ${MAX_REASON} ký tự.`);
        return;
      }
      if (descTrim.length > MAX_DESC) {
        setErr(`Description tối đa ${MAX_DESC} ký tự.`);
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
      setErr(e?.response?.data?.message || e?.message || "Report failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="report-modal-backdrop" onClick={() => close(false)}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-title">Report</div>
          <button
            type="button"
            className="report-modal-close"
            onClick={() => close(false)}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="report-field">
          <label>Category</label>
          <div className="report-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`chip chip-${c.value} ${
                  category === c.value ? "active" : ""
                }`}
                onClick={() => setCategory(c.value)}
                disabled={isSubmitting}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="report-field">
          <label>Reason (5–500)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
            maxLength={MAX_REASON}
            placeholder="Ví dụ: Bài đăng spam quảng cáo..."
            disabled={isSubmitting}
          />
          <div className="report-counter">
            {reason.length}/{MAX_REASON}
          </div>
        </div>

        <div className="report-field">
          <label>Description (optional, ≤ 1000)</label>
          <TextArea
            rows={7}
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
          <GradientButton
            text={isSubmitting ? "SENDING..." : "SUBMIT"}
            onClick={submit}
            disabled={isSubmitting || reasonTrim.length === 0}
          />

          <button
            type="button"
            className="report-cancel-icon"
            onClick={() => close(false)}
            disabled={isSubmitting}
            aria-label="Cancel"
            title="Cancel"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
