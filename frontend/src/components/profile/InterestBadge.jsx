// frontend/src/components/profile/InterestBadge.jsx
import React from "react";
import "./InterestBadge.css";

export default function InterestBadge({
  interest,
  selected = false,
  onClick = null,
  className = "",
}) {
  const handleClick = () => {
    if (onClick) onClick(interest);
  };

  const renderIcon = () => {
    if (!interest.icon) return null;

    // Handle object format: { type: "emoji" | "image", value: "..." }
    if (typeof interest.icon === "object" && interest.icon.type) {
      if (interest.icon.type === "emoji") {
        return <span className="interest-icon">{interest.icon.value}</span>;
      } else if (interest.icon.type === "image") {
        return <img src={interest.icon.value} alt={interest.name} className="interest-icon-img" />;
      }
    }

    // Handle string format (old format or emoji)
    if (typeof interest.icon === "string") {
      if (interest.icon.startsWith("http")) {
        return <img src={interest.icon} alt={interest.name} className="interest-icon-img" />;
      } else {
        return <span className="interest-icon">{interest.icon}</span>;
      }
    }

    return null;
  };

  return (
    <div
      className={`interest-badge ${onClick ? "clickable" : ""} ${selected ? "selected" : ""} ${className}`}
      onClick={handleClick}
    >
      {renderIcon()}
      <span className="interest-name">{interest.name}</span>
    </div>
  );
}
