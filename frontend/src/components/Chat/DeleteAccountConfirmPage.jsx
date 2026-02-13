import React from "react";
import { Link } from "react-router-dom";
import GradientButton from "../ui/GradientButton"; // Import nút bấm từ kho ui
import lacaLogo from "../../assets/images/laca_logo.png"; // Đảm bảo đường dẫn logo đúng

const DeleteAccountConfirmPage = () => {
  return (
    <div className="auth-form">
      {/* 1. Phần Logo */}
      <div className="logo-section">
        <img src={lacaLogo} alt="LACA Logo" className="brand-logo" />
      </div>

      {/* 2. Phần thông báo chính */}
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <p
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "#000",
            marginBottom: "40px",
            lineHeight: "1.5",
          }}
        >
          We have sent you an email to verify <br />
          you have 30 days to confirm your email
        </p>

        {/* 3. Nút quay lại đăng nhập */}
        <Link to="/login" style={{ textDecoration: "none" }}>
          <GradientButton text="BACK TO LOG IN" />
        </Link>
      </div>
    </div>
  );
};

export default DeleteAccountConfirmPage;
