import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GradientButton from "../ui/GradientButton";
import lacaLogo from "../../assets/images/laca_logo.png";
import userApi from "../../api/userApi";
import { authApi } from "../../api/authApi";

const DeleteAccountConfirmPage = () => {
  const navigate = useNavigate();
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendDeleteRequest = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await userApi.requestDeleteAccount();
      const data = res?.data?.data || res?.data || {};
      if (!data?.otpToken) {
        throw new Error("Không nhận được mã xác nhận");
      }

      setOtpToken(data.otpToken);
      setTargetEmail(data.email || "");
      setSuccess("Đã gửi mã xác nhận xóa tài khoản tới email của bạn");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể gửi yêu cầu xóa tài khoản",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sendDeleteRequest();
  }, []);

  const handleConfirmDelete = async () => {
    if (confirming) return;
    setError("");
    setSuccess("");

    if (!otpToken) {
      setError("Bạn chưa có mã xác nhận. Hãy gửi lại email xác nhận.");
      return;
    }

    if (!otpCode.trim()) {
      setError("Vui lòng nhập mã OTP đã gửi qua email");
      return;
    }

    const ok = window.confirm(
      "Bạn chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.",
    );
    if (!ok) return;

    try {
      setConfirming(true);
      await userApi.confirmDeleteAccount({
        otpToken,
        otpCode: otpCode.trim(),
      });

      await authApi.logout();
      alert("Tài khoản đã được xóa thành công");
      navigate("/login", { replace: true });
      window.location.reload();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Xác nhận xóa tài khoản thất bại",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="logo-section">
        <img src={lacaLogo} alt="LACA Logo" className="brand-logo" />
      </div>

      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <p
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "#000",
            marginBottom: "16px",
            lineHeight: "1.5",
          }}
        >
          Xóa tài khoản cần xác nhận qua email. <br />
          Nhập mã OTP để xác nhận xóa vĩnh viễn.
        </p>

        {!!targetEmail && (
          <p style={{ marginBottom: "16px", color: "#333" }}>
            Email nhận mã: <b>{targetEmail}</b>
          </p>
        )}

        {!!error && (
          <p style={{ color: "#c62828", marginBottom: "12px" }}>{error}</p>
        )}
        {!!success && (
          <p style={{ color: "#2e7d32", marginBottom: "12px" }}>{success}</p>
        )}

        <input
          type="text"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value)}
          placeholder="Nhập mã OTP"
          maxLength={6}
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            padding: "0 14px",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        />

        <div style={{ marginBottom: "12px" }}>
          <GradientButton
            text={loading ? "ĐANG GỬI..." : "GỬI LẠI EMAIL XÁC NHẬN"}
            onClick={sendDeleteRequest}
            disabled={loading || confirming}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <GradientButton
            text={confirming ? "ĐANG XÓA..." : "XÁC NHẬN XÓA TÀI KHOẢN"}
            onClick={handleConfirmDelete}
            disabled={confirming || loading}
          />
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "none",
            background: "transparent",
            color: "#666",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

export default DeleteAccountConfirmPage;
