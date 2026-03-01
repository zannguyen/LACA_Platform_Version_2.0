import React from "react";
import "./InterestCard.css";

const InterestCard = ({ interest, isSelected, onToggle }) => {
  // Handle icon rendering - support both old string format and new object format
  const renderIcon = () => {
    if (!interest.icon) {
      return (
        <div className="interest-card-icon-placeholder">
          {interest.name.charAt(0).toUpperCase()}
        </div>
      );
    }

    // New format: { type: "emoji" | "image", value: "..." }
    if (typeof interest.icon === "object" && interest.icon.type) {
      if (interest.icon.type === "emoji") {
        return <span className="interest-card-emoji">{interest.icon.value}</span>;
      } else if (interest.icon.type === "image") {
        return <img src={interest.icon.value} alt={interest.name} />;
      }
    }

    // Old format: string (URL or emoji)
    if (typeof interest.icon === "string") {
      if (interest.icon.startsWith("http")) {
        return <img src={interest.icon} alt={interest.name} />;
      } else {
        // Assume it's an emoji
        return <span className="interest-card-emoji">{interest.icon}</span>;
      }
    }

    return (
      <div className="interest-card-icon-placeholder">
        {interest.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div
      className={`interest-card ${isSelected ? "selected" : ""}`}
      onClick={() => onToggle(interest._id)}
    >
      {/* Icon/Image */}
      <div className="interest-card-icon">{renderIcon()}</div>

      {/* Checkmark */}
      {isSelected && <div className="interest-card-checkmark">✓</div>}

      {/* Content */}
      <div className="interest-card-content">
        <h3 className="interest-card-name">{interest.name}</h3>
        {interest.description && (
          <p className="interest-card-description">{interest.description}</p>
        )}
      </div>
    </div>
  );
};

export default InterestCard;
