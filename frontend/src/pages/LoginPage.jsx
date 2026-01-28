import React from "react";
import LoginForm from "../components/auth/LoginForm";
import lacaLogo from "../assets/images/laca_logo.png";
import "../App.css";

const LoginPage = () => {
  return (
    <div className="auth-page">
      <div className="auth-form">
        <div className="logo-section">
          <img src={lacaLogo} alt="LACA Logo" className="brand-logo" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
