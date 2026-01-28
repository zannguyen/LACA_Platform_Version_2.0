import React, { useState } from 'react';
import RegisterForm from '../components/auth/RegisterForm';
import OtpForm from '../components/auth/OtpForm';
import lacaLogo from '../assets/images/laca_logo.png'; 

const RegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Form, 2: OTP
  
  // 1. Thêm biến để lưu email người dùng vừa nhập
  const [registeredEmail, setRegisteredEmail] = useState('');

  // 2. Hàm nhận email từ RegisterForm
  const handleRegisterSuccess = (email) => {
    setRegisteredEmail(email); // Lưu email lại
    setStep(2); // Chuyển sang bước OTP
  };

  return (
    <div className="auth-form">
      <div className="logo-section">
        {/* Logo luôn hiển thị */}
        <img src={lacaLogo} alt="LACA Logo" className="brand-logo" />
      </div>

      {step === 1 && (
        // Truyền hàm xử lý xuống để lấy dữ liệu
        <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
      )}

      {step === 2 && (
        // 3. Truyền email đã lưu xuống cho OtpForm hiển thị
        <OtpForm email={registeredEmail} />
      )}
    </div>
  );
};

export default RegisterPage;
