// src/components/auth/ForgotPassword.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  sendOTP,
  verifyOTP,
  resendOTP,
  resetPassword,
} from "../../api/authApi";
import "./ForgotPassword.css";
import logo from "../../assets/images/laca_logo.png";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");

  // LƯU otpToken (backend trả về khi gửi OTP)
  const [otpToken, setOtpToken] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      <div className="forgot-password-card">
        <div className="logo-container">
          <img src={logo} alt="LACA Logo" className="logo" />
        </div>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <>
            <h2 className="title">FORGET PASSWORD</h2>
            <p className="subtitle">Enter your registered email bellow</p>

            <div className="input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="email-input"
                placeholder="Enter your email"
                disabled={loading}
              />
              <button
                onClick={handleRequestOTP}
                className="otp-button"
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "OTP"}
              </button>
            </div>

            <button
              onClick={handleRequestOTP}
              className="submit-button"
              disabled={loading || !email}
            >
              {loading ? "SUBMITTING..." : "SUBMIT"}
            </button>

            <p className="footer">
              Remember password?{" "}
              <a href="/login" className="link">
                Log in
              </a>
            </p>
          </>
        )}

        {(step === 2 || step === 3) && (
          <>
            <h2 className="title">Forget Password</h2>
            <p className="subtitle">Enter your registered email bellow</p>

            <div className="input-group">
              <input
                type="email"
                value={email}
                readOnly
                className="email-input"
              />
              <button className="otp-button" disabled>
                OTP
              </button>
            </div>

            <div className="otp-boxes">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-box-input"
                  disabled={loading}
                />
              ))}
            </div>

            <p className="otp-sent-message">
              We have sent a reset <strong>OTP</strong> to {maskEmail(email)}
            </p>

            <p className="resend-text">
              Can't get email?{" "}
              <button
                onClick={handleResendOTP}
                className="resend-link"
                disabled={countdown > 0 || loading}
              >
                Resubmit {countdown > 0 && `(CD ${countdown}s)`}
              </button>
            </p>

            <button
              onClick={handleSubmitOTP}
              className="submit-button"
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? "VERIFYING..." : "SUBMIT"}
            </button>

            <p className="footer">
              Remember password?{" "}
              <a href="/login" className="link">
                Log in
              </a>
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="success-title">SUCCESS</h1>
            <p className="success-message">
              Now we will transfer you to
              <br />
              reset password page
            </p>

            <button onClick={() => setStep(5)} className="continue-button">
              CONTINUE
            </button>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="title">New Password</h2>

            <div className="password-group">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                className="password-input"
                placeholder="Enter new password"
                disabled={loading}
              />
            </div>

            <h2 className="title">Confirm Password</h2>

            <div className="password-group">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                className="password-input"
                placeholder="Confirm password"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleResetPassword}
              className="submit-button reset-btn"
              disabled={
                loading || !newPassword || newPassword !== confirmPassword
              }
            >
              {loading ? "RESETTING..." : "RESET PASSWORD"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
