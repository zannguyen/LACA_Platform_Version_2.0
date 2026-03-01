import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrivacyData.css";

export default function PrivacyData() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    allowFollowFromStrangers: false,
    allowPeopleInteraction: false,
    allowPeopleToSeeProfile: false,
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
        <h1>Privacy and Data</h1>
      </div>

      <div className="privacy-list">
        <div className="privacy-item">
          <div className="privacy-label">
            <p>Allow follow from strangers</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowFollowFromStrangers}
              onChange={() => handleToggle("allowFollowFromStrangers")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <p>Allow people interaction to your posts</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowPeopleInteraction}
              onChange={() => handleToggle("allowPeopleInteraction")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>

        <div className="privacy-item">
          <div className="privacy-label">
            <p>Allow people to see your profile</p>
          </div>
          <label className="privacy-toggle">
            <input
              type="checkbox"
              checked={settings.allowPeopleToSeeProfile}
              onChange={() => handleToggle("allowPeopleToSeeProfile")}
            />
            <span className="toggle-switch"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
