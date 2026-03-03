// src/components/auth/ForgotPassword.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  sendOTP,
  verifyOTP,
  resendOTP,
  resetPassword,
} from "../../api/authApi";
import "./ForgotPassword.css";
import lacaLogo from "../../assets/images/laca_logo.png";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");

  // LƯU otpToken (backend trả về khi gửi OTP)
  const [otpToken, setOtpToken] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otpRefs = useRef([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const getErrMsg = (e) =>
    e?.response?.data?.message || e?.message || "Server error";

  const handleRequestOTP = async () => {
    if (!email) return setError("Vui lòng nhập email");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError("Email không hợp lệ");

    setLoading(true);
    setError("");

    try {
      const result = await sendOTP(email);

      // backend có thể trả { success, data:{otpToken} } hoặc { otpToken }
      const token = result?.data?.otpToken || result?.otpToken;
      if (!token) {
        throw new Error("Không nhận được otpToken từ server");
      }

      setOtpToken(token);
      setStep(2);
      setCountdown(60);

      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus?.(), 100);
    } catch (e) {
      setError(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) otpRefs.current[index + 1]?.focus?.();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus?.();
    }
  };

  const handleSubmitOTP = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return setError("Vui lòng nhập đầy đủ 6 số OTP");
    if (!otpToken) return setError("Thiếu otpToken, vui lòng gửi OTP lại");

    setLoading(true);
    setError("");

    try {
      // ĐÚNG: verifyOTP(otpToken, otpCode)
      const result = await verifyOTP(otpToken, otpCode);

      if (result?.success) {
        setStep(4);
      } else {
        setError(result?.message || "OTP không hợp lệ");
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus?.();
      }
    } catch (e) {
      setError(getErrMsg(e));
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus?.();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    if (!email) return setError("Thiếu email");

    setLoading(true);
    setError("");

    try {
      // resendOTP ở authApi.js của bạn nên gọi lại /auth/forgot-password
      const result = await resendOTP(email);

      const token = result?.data?.otpToken || result?.otpToken;
      if (!token) throw new Error("Không nhận được otpToken mới từ server");

      setOtpToken(token);
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus?.();
    } catch (e) {
      setError(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpToken) return setError("Thiếu otpToken, vui lòng gửi OTP lại");

    const otpCode = otp.join("");
    if (otpCode.length !== 6) return setError("Vui lòng nhập đầy đủ 6 số OTP");

    if (!newPassword) return setError("Vui lòng nhập mật khẩu mới");
    if (newPassword.length < 6)
      return setError("Mật khẩu phải có ít nhất 6 ký tự");
    if (newPassword !== confirmPassword)
      return setError("Mật khẩu xác nhận không khớp");

    setLoading(true);
    setError("");

    try {
      // ĐÚNG: resetPassword({ otpToken, otpCode, password, confirmPassword })
      const result = await resetPassword({
        otpToken,
        otpCode,
        password: newPassword,
        confirmPassword,
      });

      if (result?.success) {
        alert("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
        window.location.href = "/login";
      } else {
        setError(result?.message || "Reset mật khẩu thất bại");
      }
    } catch (e) {
      setError(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (em) => {
    if (!em) return "";
    const [name, domain] = em.split("@");
    if (!domain) return em;
    if (name.length <= 2) return em;
    return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
  };

  return (
    <div className="forgot-password-container">
      {/* Logo */}
      <div className="logo-section">
        <img src={lacaLogo} alt="LACA Logo" className="brand-logo" />
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Step 1: Enter Email */}
      {step === 1 && (
        <div className="forgot-step">
          <h2 className="step-title">Quên mật khẩu</h2>
          <p className="step-description">
            Nhập địa chỉ email đã đăng ký để khôi phục mật khẩu
          </p>

          <div className="field-row">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="field-input"
              placeholder="Nhập email của bạn"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleRequestOTP}
            className="submit-button"
            disabled={loading || !email}
          >
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
          </button>

          <p className="footer-text">
            Đã nhớ mật khẩu?{" "}
            <a href="/login" className="link-bold">
              Đăng nhập
            </a>
          </p>
        </div>
      )}

      {/* Step 2: Enter OTP */}
      {(step === 2 || step === 3) && (
        <div className="forgot-step">
          <h2 className="step-title">Xác nhận email</h2>
          <p className="step-description">
            Chúng tôi đã gửi mã xác nhận đến email của bạn
          </p>

          <div className="field-row">
            <label className="field-label">Email</label>
            <div className="email-display">
              <span>{maskEmail(email)}</span>
            </div>
          </div>

          <div className="otp-section">
            <label className="field-label">Mã xác nhận</label>
            <div className="otp-container">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-box"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <p className="otp-sent-message">
            Mã xác nhận đã gửi đến <strong>{maskEmail(email)}</strong>
          </p>

          <p className="resend-container">
            Chưa nhận được email?{" "}
            <button
              onClick={handleResendOTP}
              className="resend-button"
              disabled={countdown > 0 || loading}
            >
              {countdown > 0 ? `Gửi lại (${countdown}s)` : "Gửi lại"}
            </button>
          </p>

          <button
            onClick={handleSubmitOTP}
            className="submit-button"
            disabled={loading || otp.join("").length !== 6}
          >
            {loading ? "Đang xác nhận..." : "Xác nhận"}
          </button>

          <p className="footer-text">
            <button
              onClick={() => {
                setStep(1);
                setError("");
              }}
              className="back-link"
            >
              ← Quay lại
            </button>
          </p>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 4 && (
        <div className="forgot-step">
          <div className="success-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="step-title">Xác thực thành công!</h2>
          <p className="step-description">
            Vui lòng nhập mật khẩu mới để hoàn tất quá trình khôi phục
          </p>

          <button
            onClick={() => setStep(5)}
            className="submit-button"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {/* Step 4: New Password */}
      {step === 5 && (
        <div className="forgot-step">
          <h2 className="step-title">Đặt mật khẩu mới</h2>
          <p className="step-description">
            Nhập mật khẩu mới an toàn cho tài khoản của bạn
          </p>

          <div className="field-row">
            <label className="field-label">Mật khẩu mới</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                className="field-input"
                placeholder="Nhập mật khẩu mới"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Xác nhận mật khẩu</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                className="field-input"
                placeholder="Nhập lại mật khẩu"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="password-mismatch">Mật khẩu không khớp</p>
          )}

          <button
            onClick={handleResetPassword}
            className="submit-button reset-btn"
            disabled={
              loading || !newPassword || newPassword !== confirmPassword
            }
          >
            {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
          </button>

          <p className="footer-text">
            <button
              onClick={() => {
                setStep(2);
                setError("");
              }}
              className="back-link"
            >
              ← Quay lại
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
