// frontend/src/components/profile/InterestDisplay.jsx
import React from "react";
import InterestBadge from "./InterestBadge";
import "./InterestDisplay.css";

export default function InterestDisplay({
  interests = [],
  maxVisible = 3,
  onShowAll = null,
  showLabel = true,
}) {
  if (!interests || interests.length === 0) {
    return (
      <div className="interest-display empty">No interests selected yet</div>
    );
  }

  const visibleInterests = interests.slice(0, maxVisible);
  const remainingCount = Math.max(0, interests.length - maxVisible);

  return (
    <div className="interest-display">
      {showLabel && <div className="interest-display-label">Interests</div>}
      <div className="interest-list">
        {visibleInterests.map((interest) => (
          <InterestBadge
            key={interest._id || interest.id}
            interest={interest}
          />
        ))}
        {remainingCount > 0 && onShowAll && (
          <div className="interest-more" onClick={onShowAll}>
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}
