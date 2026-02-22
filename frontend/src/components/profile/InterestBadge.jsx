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

  return (
    <div
      className={`interest-badge ${onClick ? "clickable" : ""} ${selected ? "selected" : ""} ${className}`}
      onClick={handleClick}
    >
      {interest.icon && <span className="interest-icon">{interest.icon}</span>}
      <span className="interest-name">{interest.name}</span>
    </div>
  );
}
