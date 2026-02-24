// frontend/src/components/profile/TagDisplay.jsx
import React from "react";
import "./TagDisplay.css";

export default function TagDisplay({
  tags = [],
  maxVisible = 3,
  onShowAll = null,
  showLabel = true,
}) {
  if (!tags || tags.length === 0) {
    return (
      <div className="tag-display empty">No tags selected yet</div>
    );
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = Math.max(0, tags.length - maxVisible);

  return (
    <div className="tag-display">
      {showLabel && <div className="tag-display-label">Tags</div>}
      <div className="tag-list">
        {visibleTags.map((tag) => (
          <span
            key={tag._id || tag.id}
            className="tag-badge"
            style={tag.color ? { backgroundColor: tag.color } : {}}
          >
            {tag.name}
          </span>
        ))}
        {remainingCount > 0 && onShowAll && (
          <div className="tag-more" onClick={onShowAll}>
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}
