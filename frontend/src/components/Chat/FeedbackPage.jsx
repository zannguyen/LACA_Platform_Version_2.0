import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GradientButton from "../ui/GradientButton";
import TextArea from "../ui/TextArea";
import "./FeedbackPage.css";
import feedbackApi from "../../api/feedbackApi";

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");

  // Thêm state để làm hiệu ứng Loading (xoay xoay)
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // 1. Kiểm tra nếu chưa nhập gì thì không gửi
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung góp ý!");
      return;
    }

    // 2. Bắt đầu gửi
    setIsLoading(true);

    try {
      // Giả lập ID người dùng (Sau này lấy từ Login)
      const mockUserId = 1;

      const data = {
        userId: mockUserId,
        content: content,
        type: "feedback", // Đánh dấu đây là feedback
        createdAt: new Date().toISOString(),
      };

      // Gọi API
      await feedbackApi.sendFeedback(data);

      // 3. Thành công
      alert("Gửi góp ý thành công! Cảm ơn bạn.");
      navigate("/");
    } catch (error) {
      // 4. Thất bại
      console.error("Lỗi gửi feedback:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại sau!");
    } finally {
      // Dù thành công hay thất bại cũng tắt loading
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="page-title">Feedback</h2>
      </div>

      <TextArea
        placeholder="Hi LACA team, I want LACA has a function that..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        disabled={isLoading} // Khóa ô nhập khi đang gửi
      />

      <div style={{ marginTop: "20px" }}>
        {/* Nếu đang loading thì hiện chữ sending..., ngược lại hiện SUBMIT */}
        <GradientButton
          text={isLoading ? "SENDING..." : "SUBMIT"}
          onClick={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default FeedbackPage;
