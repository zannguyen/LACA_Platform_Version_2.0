import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GradientButton from "../ui/GradientButton";
import TextArea from "../ui/TextArea";
import "./FeedbackPage.css";
import feedbackApi from "../../api/feedbackApi";
import { authApi } from "../../api/authApi";

const MAX_LEN = 1000;

const TOPICS = [
  { key: "feature", label: "Tính năng" },
  { key: "bug", label: "Lỗi" },
  { key: "ui", label: "Giao diện" },
  { key: "ux", label: "Trải nghiệm" },
  { key: "other", label: "Khác" },
];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("feature");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const trimmed = useMemo(() => content.trim(), [content]);
  const topicLabel = useMemo(
    () => TOPICS.find((t) => t.key === topic)?.label || "Góp ý",
    [topic]
  );

  const getCurrentUserId = () => {
    const u = authApi.getCurrentUser?.();
    if (u?._id) return u._id;
    if (u?.id) return u.id;

    const token = authApi.getToken?.();
    if (!token) return "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      return payload?.userID || payload?.userId || payload?._id || "";
    } catch {
      return "";
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    setError("");

    if (!trimmed) {
      setError("Bạn hãy nhập nội dung góp ý trước khi gửi.");
      return;
    }

    setIsLoading(true);
    try {
      // Nếu user chưa login/thiếu userId thì fallback 1 để tránh crash (giữ behavior cũ).
      const userId = getCurrentUserId() || 1;

      const finalContent = `[${topicLabel}] ${trimmed}`;

      await feedbackApi.sendFeedback({
        userId,
        content: finalContent,
        type: "feedback",
        createdAt: new Date().toISOString(),
      });

      setSuccess(true);
      setContent("");
    } catch (e) {
      console.error("Lỗi gửi feedback:", e);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Có lỗi xảy ra, vui lòng thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  };
//check 
  return (
    <div className="feedback-page">
      <div className="fb-header">
        <button
          className="fb-back"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="fb-title">Feedback</div>
        <div className="fb-spacer" />
      </div>

      <div className="fb-content">
        <div className="fb-card">
          <div className="fb-hero">
            <div className="fb-hero-icon" aria-hidden="true">
              <i className="fa-regular fa-paper-plane"></i>
            </div>
            <div className="fb-hero-text">
              <div className="fb-hero-title">Góp ý để LACA tốt hơn</div>
              <div className="fb-hero-sub">
                Nói với tụi mình điều bạn muốn cải thiện — càng cụ thể càng dễ
                làm.
              </div>
            </div>
          </div>

          <div className="fb-field">
            <div className="fb-label">Chủ đề</div>
            <div className="fb-chips">
              {TOPICS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`fb-chip ${topic === t.key ? "active" : ""}`}
                  onClick={() => setTopic(t.key)}
                  disabled={isLoading}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fb-field">
            <div className="fb-label">Nội dung góp ý</div>
            <TextArea
              placeholder="Ví dụ: Mình muốn có chức năng ... / Mình gặp lỗi khi ..."
              value={content}
              onChange={(e) => {
                setSuccess(false);
                setError("");
                setContent(String(e.target.value || "").slice(0, MAX_LEN));
              }}
              rows={10}
              disabled={isLoading}
              maxLength={MAX_LEN}
              className="fb-textarea"
            />

            <div className="fb-meta">
              <div className="fb-counter">
                {content.length}/{MAX_LEN}
              </div>
              <div className="fb-tip">
                Tránh nhập mật khẩu/OTP hoặc thông tin nhạy cảm.
              </div>
            </div>
          </div>

          {error && <div className="fb-alert error">{error}</div>}
          {success && (
            <div className="fb-alert success">
              <b>Đã gửi!</b> Cảm ơn bạn — tụi mình đã nhận được góp ý.
            </div>
          )}

          <div className="fb-actions">
            <GradientButton
              text={isLoading ? "ĐANG GỬI..." : "GỬI FEEDBACK"}
              onClick={handleSubmit}
              disabled={isLoading || trimmed.length === 0}
            />

            <button
              type="button"
              className="fb-secondary"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
