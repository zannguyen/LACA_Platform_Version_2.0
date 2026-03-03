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
      };

      // Gọi API
      await feedbackApi.sendFeedback(data);

      // 3. Thành công
      alert("Gửi góp ý thành công! Cảm ơn bạn.");
      navigate("/");
    } catch (error) {
      // 4. Thất bại
      console.error("Lỗi gửi góp ý:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau!");
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
        <h2 className="page-title">Góp ý</h2>
      </div>

      <TextArea
        placeholder="Hãy chia sẻ góp ý của bạn để LACA cải thiện tốt hơn..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={15}
        disabled={isLoading} // Khóa ô nhập khi đang gửi
        style={{ minHeight: "300px" }}
      />

      <div style={{ marginTop: "20px" }}>
        {/* Nếu đang loading thì hiện chữ đang gửi..., ngược lại hiện GỬI */}
        <GradientButton
          text={isLoading ? "ĐANG GỬI..." : "GỬI"}
          onClick={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
