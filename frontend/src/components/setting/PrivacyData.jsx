import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrivacyData.css";

export default function PrivacyData() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    allowMessages: true,
    allowNotifications: true,
    dataCollection: false,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <button className="privacy-back" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Privacy & Data</h1>
      </div>

      <div className="privacy-list">
        <div className="privacy-item">
          <div className="privacy-label">
            <h3>Allow Messages</h3>
            <p>Let others send you direct messages</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowMessages}
              onChange={() => handleToggle("allowMessages")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <h3>Allow Notifications</h3>
            <p>Receive push notifications</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowNotifications}
              onChange={() => handleToggle("allowNotifications")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <h3>Data Collection</h3>
            <p>Allow anonymous data collection for service improvement</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.dataCollection}
              onChange={() => handleToggle("dataCollection")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
