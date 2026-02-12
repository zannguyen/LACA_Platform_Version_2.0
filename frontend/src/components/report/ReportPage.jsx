import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GradientButton from "../ui/GradientButton";
import TextArea from "../ui/TextArea";
import "./ReportPage.css";

const ReportPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    console.log("Issue reported:", content);
    alert("Chúng tôi đã nhận được báo cáo lỗi của bạn!");
    navigate("/");
  };

  return (
    <div className="auth-form">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2 className="page-title">Report issue</h2>
      </div>

      {/* Ô nhập nội dung */}
      <TextArea
        placeholder="Hi LACA team, improve your website why it's so laggy..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
      />

      {/* Nút Submit */}
      <div style={{ marginTop: "20px" }}>
        <GradientButton text="SUBMIT" onClick={handleSubmit} />
      </div>
    </div>
  );
};

export default ReportPage;
