import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import "./EditProfileSetting.css";

const normalizeResData = (res) => res?.data?.data || res?.data || {};

export default function EditProfileSetting() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState("");

  const [form, setForm] = useState({
    email: "",
    emailOtpCode: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const normalizedCurrentEmail = String(currentEmail || "")
    .trim()
    .toLowerCase();
  const normalizedFormEmail = String(form.email || "")
    .trim()
    .toLowerCase();
  const isEmailChanged =
    normalizedFormEmail.length > 0 &&
    normalizedFormEmail !== normalizedCurrentEmail;

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (!form.email.trim()) return false;
    if (isEmailChanged && (!emailOtpToken || !form.emailOtpCode.trim()))
      return false;
    return true;
  }, [emailOtpToken, form.email, form.emailOtpCode, isEmailChanged, saving]);

  useEffect(() => {
    let mounted = true;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await userApi.getMyAccountSettings();
        const data = normalizeResData(res);
        if (!mounted) return;

        setForm((prev) => ({
          ...prev,
          email: data.email || "",
          emailOtpCode: "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setCurrentEmail(data.email || "");
        setEmailOtpToken("");
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Không tải được thông tin",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const onChangeField = (key, value) => {
    setForm((prev) => {
      if (key === "email") {
        return { ...prev, email: value, emailOtpCode: "" };
      }
      return { ...prev, [key]: value };
    });

    if (key === "email") {
      setEmailOtpToken("");
    }
  };

  const onSendEmailOtp = async () => {
    setError("");
    setSuccess("");

    const email = String(form.email || "")
      .trim()
      .toLowerCase();
    const isEmailFormatValid = /^\S+@\S+\.\S+$/.test(email);
    if (!isEmailFormatValid) {
      setError("Email không hợp lệ");
      return;
    }

    if (email === normalizedCurrentEmail) {
      setError("Email mới phải khác email hiện tại");
      return;
    }

    try {
      setSendingOtp(true);
      const res = await userApi.sendEmailChangeOtp({ email });
      const data = normalizeResData(res);
      if (!data?.otpToken) {
        throw new Error("Không nhận được mã xác thực");
      }

      setEmailOtpToken(data.otpToken);
      setSuccess(`Đã gửi mã xác nhận tới ${email}`);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể gửi mã xác nhận email",
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSaving(true);

      const payload = {
        email: normalizedFormEmail,
      };

      if (isEmailChanged) {
        payload.emailOtpToken = emailOtpToken;
        payload.emailOtpCode = form.emailOtpCode.trim();
      }

      if (form.currentPassword || form.newPassword || form.confirmPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
        payload.confirmPassword = form.confirmPassword;
      }

      const res = await userApi.updateMyAccountSettings(payload);
      const data = normalizeResData(res);

      setForm((prev) => ({
        ...prev,
        email: data.email || prev.email,
        emailOtpCode: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setCurrentEmail(data.email || normalizedFormEmail);
      setEmailOtpToken("");

      setSuccess("Cập nhật Email/Mật khẩu thành công");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Cập nhật thông tin thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-setting-page">
      <div className="eps-header">
        <button
          className="eps-back"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="eps-title">Đổi email và mật khẩu</div>
      </div>

      <div className="eps-content">
        {loading ? (
          <div className="eps-loading">Đang tải...</div>
        ) : (
          <form className="eps-form" onSubmit={onSubmit}>
            {!!error && <div className="eps-alert eps-error">{error}</div>}
            {!!success && (
              <div className="eps-alert eps-success">{success}</div>
            )}

            <div className="eps-section-title">Đổi email</div>

            <label className="eps-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChangeField("email", e.target.value)}
              />
            </label>

            {isEmailChanged && (
              <>
                <button
                  type="button"
                  className="eps-otp-btn"
                  onClick={onSendEmailOtp}
                  disabled={sendingOtp || saving}
                >
                  {sendingOtp ? "Đang gửi mã..." : "Gửi mã xác nhận email"}
                </button>

                <label className="eps-field">
                  <span>Mã xác nhận</span>
                  <input
                    type="text"
                    value={form.emailOtpCode}
                    onChange={(e) =>
                      onChangeField("emailOtpCode", e.target.value)
                    }
                    placeholder="Nhập mã OTP gồm 6 số"
                    maxLength={6}
                  />
                </label>
              </>
            )}

            <div className="eps-section-title">Đổi mật khẩu</div>

            <label className="eps-field">
              <span>Mật khẩu hiện tại</span>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) =>
                  onChangeField("currentPassword", e.target.value)
                }
              />
            </label>

            <label className="eps-field">
              <span>Mật khẩu mới</span>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => onChangeField("newPassword", e.target.value)}
              />
            </label>

            <label className="eps-field">
              <span>Nhập lại mật khẩu mới</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  onChangeField("confirmPassword", e.target.value)
                }
              />
            </label>

            <button type="submit" className="eps-submit" disabled={!canSubmit}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
