import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import { uploadMedia } from "../../api/postApi";
import "./EditProfileSetting.css";

const defaultVisibility = {
  fullname: true,
  avatar: true,
  bio: true,
  email: false,
  phoneNumber: false,
  dateOfBirth: false,
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const normalizeResData = (res) => res?.data?.data || res?.data || {};

const visibilityLabels = [
  { key: "fullname", label: "Hiện tên" },
  { key: "avatar", label: "Hiện avatar" },
  { key: "bio", label: "Hiện tiểu sử" },
  { key: "email", label: "Hiện email" },
  { key: "phoneNumber", label: "Hiện số điện thoại" },
  { key: "dateOfBirth", label: "Hiện ngày sinh" },
];

export default function EditProfileSetting() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    avatar: "",
    bio: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profileVisibility: defaultVisibility,
  });

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (!form.fullname.trim()) return false;
    if (!form.email.trim()) return false;
    return true;
  }, [form.email, form.fullname, saving]);

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
          fullname: data.fullname || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          dateOfBirth: toDateInput(data.dateOfBirth),
          avatar: data.avatar || "",
          bio: data.bio || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          profileVisibility: {
            ...defaultVisibility,
            ...(data.profileVisibility || {}),
          },
        }));
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
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onToggleVisibility = (key) => {
    setForm((prev) => ({
      ...prev,
      profileVisibility: {
        ...prev.profileVisibility,
        [key]: !prev.profileVisibility[key],
      },
    }));
  };

  const onAvatarFilePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const uploadRes = await uploadMedia(file);
      const avatarUrl = uploadRes?.secure_url || uploadRes?.url || "";
      if (!avatarUrl) throw new Error("Upload avatar thất bại");
      onChangeField("avatar", avatarUrl);
      setSuccess("Tải avatar lên thành công");
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Không thể tải avatar lên",
      );
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSaving(true);

      const payload = {
        fullname: form.fullname,
        email: form.email,
        phoneNumber: form.phoneNumber,
        dateOfBirth: form.dateOfBirth || null,
        avatar: form.avatar,
        bio: form.bio,
        profileVisibility: form.profileVisibility,
      };

      if (form.currentPassword || form.newPassword || form.confirmPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
        payload.confirmPassword = form.confirmPassword;
      }

      const res = await userApi.updateMyAccountSettings(payload);
      const data = normalizeResData(res);

      setForm((prev) => ({
        ...prev,
        fullname: data.fullname || prev.fullname,
        email: data.email || prev.email,
        phoneNumber: data.phoneNumber || "",
        dateOfBirth: toDateInput(data.dateOfBirth),
        avatar: data.avatar || "",
        bio: data.bio || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profileVisibility: {
          ...defaultVisibility,
          ...(data.profileVisibility || prev.profileVisibility),
        },
      }));

      setSuccess("Cập nhật thông tin thành công");
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
        <div className="eps-title">Chỉnh sửa hồ sơ</div>
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

            <div className="eps-section-title">Thông tin cơ bản</div>

            <label className="eps-field">
              <span>Avatar</span>
              <div className="eps-avatar-row">
                <div className="eps-avatar-preview">
                  {form.avatar ? (
                    <img src={form.avatar} alt="avatar" />
                  ) : (
                    <i className="fa-solid fa-user"></i>
                  )}
                </div>
                <label className="eps-upload-btn">
                  Chọn ảnh
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onAvatarFilePick}
                    hidden
                  />
                </label>
              </div>
            </label>

            <label className="eps-field">
              <span>Đổi tên</span>
              <input
                type="text"
                value={form.fullname}
                onChange={(e) => onChangeField("fullname", e.target.value)}
                maxLength={120}
              />
            </label>

            <label className="eps-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChangeField("email", e.target.value)}
              />
            </label>

            <label className="eps-field">
              <span>Số điện thoại</span>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => onChangeField("phoneNumber", e.target.value)}
                maxLength={20}
              />
            </label>

            <label className="eps-field">
              <span>Ngày sinh</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => onChangeField("dateOfBirth", e.target.value)}
              />
            </label>

            <label className="eps-field">
              <span>Tiểu sử</span>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => onChangeField("bio", e.target.value)}
                maxLength={200}
              />
            </label>

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

            <div className="eps-section-title">
              Hiển thị ngoài trang cá nhân
            </div>
            <div className="eps-visibility-list">
              {visibilityLabels.map((item) => (
                <label className="eps-visibility-item" key={item.key}>
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={!!form.profileVisibility[item.key]}
                    onChange={() => onToggleVisibility(item.key)}
                  />
                </label>
              ))}
            </div>

            <button type="submit" className="eps-submit" disabled={!canSubmit}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
