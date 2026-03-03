import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import "./PrivacyData.css";

const defaultPrivacyData = {
  allowFollowFromStrangers: true,
  allowPeopleInteraction: true,
  allowPeopleToSeeProfile: true,
};

export default function PrivacyData() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultPrivacyData);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchPrivacyData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await userApi.getMyPrivacyData();
        const data = res?.data?.data || {};
        if (!mounted) return;

        setSettings({
          ...defaultPrivacyData,
          ...data,
        });
      } catch (e) {
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Không tải được cài đặt quyền riêng tư và dữ liệu",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPrivacyData();

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async (key) => {
    if (loading || savingKey) return;

    const nextValue = !settings[key];
    const prevSettings = settings;

    setError("");
    setSavingKey(key);
    setSettings((prev) => ({ ...prev, [key]: nextValue }));

    try {
      const res = await userApi.updateMyPrivacyData({ [key]: nextValue });
      const data = res?.data?.data || {};
      setSettings((prev) => ({
        ...prev,
        ...defaultPrivacyData,
        ...data,
      }));
      setSuccess("Đã lưu");
      window.setTimeout(() => {
        setSuccess("");
      }, 1800);
    } catch (e) {
      setSettings(prevSettings);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Cập nhật quyền riêng tư và dữ liệu thất bại",
      );
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <button className="privacy-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Quyền riêng tư và dữ liệu</h1>
      </div>

      <div className="privacy-list">
        {!!error && <div className="privacy-error">{error}</div>}
        {!!success && <div className="privacy-success">{success}</div>}

        <div className="privacy-item">
          <div className="privacy-label">
            <p>Cho phép người lạ theo dõi</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowFollowFromStrangers}
              onChange={() => handleToggle("allowFollowFromStrangers")}
              disabled={loading || !!savingKey}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <p>Cho phép mọi người tương tác với bài viết</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowPeopleInteraction}
              onChange={() => handleToggle("allowPeopleInteraction")}
              disabled={loading || !!savingKey}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <p>Cho phép mọi người xem hồ sơ của bạn</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowPeopleToSeeProfile}
              onChange={() => handleToggle("allowPeopleToSeeProfile")}
              disabled={loading || !!savingKey}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
