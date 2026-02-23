import React from "react";
import "./InterestGrid.css";

const InterestGrid = ({
  interests,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const handleDelete = (interest) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${interest.name}"? This action cannot be undone.`
      )
    ) {
      onDelete(interest._id);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-interest-grid-loading">
        <div className="admin-interest-grid-spinner"></div>
        <p>Loading interests...</p>
      </div>
    );
  }

  if (!interests || interests.length === 0) {
    return (
      <div className="admin-interest-grid-empty">
        <div className="admin-interest-grid-empty-icon">📭</div>
        <p>No interests found</p>
        <span>Create your first interest to get started</span>
      </div>
    );
  }

  return (
    <div className="admin-interest-grid">
      {interests.map((interest) => (
        <div key={interest._id} className="admin-interest-card">
          {/* Icon */}
          <div className="admin-interest-card-icon">
            {interest.icon?.type === "emoji" ? (
              <span className="admin-interest-card-emoji">
                {interest.icon.value}
              </span>
            ) : (
              <img
                src={interest.icon?.value}
                alt={interest.name}
                className="admin-interest-card-image"
              />
            )}
          </div>

          {/* Content */}
          <div className="admin-interest-card-content">
            <h3 className="admin-interest-card-name">{interest.name}</h3>
            {interest.description && (
              <p className="admin-interest-card-description">
                {interest.description}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <button
            className={`admin-interest-card-status ${
              interest.isActive ? "active" : "inactive"
            }`}
            onClick={() => onToggleStatus(interest._id)}
            title={
              interest.isActive ? "Click to deactivate" : "Click to activate"
            }
          >
            {interest.isActive ? "Active" : "Inactive"}
          </button>

          {/* Actions */}
          <div className="admin-interest-card-actions">
            <button
              className="admin-interest-card-btn admin-interest-card-btn-edit"
              onClick={() => onEdit(interest)}
              title="Edit interest"
            >
              ✏️ Edit
            </button>
            <button
              className="admin-interest-card-btn admin-interest-card-btn-delete"
              onClick={() => handleDelete(interest)}
              title="Delete interest"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InterestGrid;
