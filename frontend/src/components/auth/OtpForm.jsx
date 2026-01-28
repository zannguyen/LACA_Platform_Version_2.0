import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GradientButton from "../ui/GradientButton";
import { authApi } from "../../api/authApi";
import "./OtpForm.css";

const maskEmail = (email) => {
  if (!email) return "your@email.com";
  const [name, domain] = email.split("@");
  const maskedName = `${name[0]}***${name[name.length - 1]}`;
  return `${maskedName}@${domain}`;
};

const OtpForm = ({ email, otpToken, onOtpSuccess }) => {
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const handleSubmit = async () => {
    const otp = otpCode.join("");

    if (!otpToken) {
      alert("OTP token is missing. Please register again.");
      return;
    }

    if (otp.length !== 6) {
      alert("Please enter full 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.verifyOtp({
        otpToken,
        otpCode: otp,
      });

      console.log("OTP verified:", res);

      onOtpSuccess(res.data.accessToken);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (canResend) {
      alert("Resend OTP API chưa làm (có thể bổ sung sau)");
      setCountdown(60);
      setCanResend(false);
    }
  };

  return (
    <div>
      <h3 className="step-title">Verify Email Address</h3>

      <div className="otp-container">
        {otpCode.map((digit, index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            maxLength="1"
            className="otp-box"
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
      </div>

      <p className="sub-text">
        We have sent an OTP to <strong>{maskEmail(email)}</strong>
      </p>

      <p className="resend-container">
        Can’t get email?
        {canResend ? (
          <span className="link-text" onClick={handleResend}>
            {" "}
            Resend
          </span>
        ) : (
          <span className="countdown-text"> Resend (CD {countdown}s)</span>
        )}
      </p>

      <GradientButton
        text={loading ? "VERIFYING..." : "SUBMIT"}
        onClick={handleSubmit}
        disabled={loading || !otpToken} // ✅ disable nếu token chưa có
      />

      <div className="footer-container">
        <span className="footer-text">Remember password? </span>
        <Link to="/login" className="link-bold">
          Log in
        </Link>
      </div>
    </div>
  );
};

export default OtpForm;
