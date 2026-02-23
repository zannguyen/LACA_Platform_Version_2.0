import React from "react";
import "./InterestTable.css";

const InterestTable = ({
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
      <div className="interest-table-loading">
        <div className="interest-table-spinner"></div>
        <p>Loading interests...</p>
      </div>
    );
  }

  if (!interests || interests.length === 0) {
    return (
      <div className="interest-table-empty">
        <div className="interest-table-empty-icon">📭</div>
        <p>No interests found</p>
        <span>Create your first interest to get started</span>
      </div>
    );
  }

  return (
    <div className="interest-table-wrapper">
      <table className="interest-table">
        <thead>
          <tr>
            <th className="interest-table-col-icon">Icon</th>
            <th className="interest-table-col-name">Name</th>
            <th className="interest-table-col-description">Description</th>
            <th className="interest-table-col-status">Status</th>
            <th className="interest-table-col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {interests.map((interest) => (
            <tr key={interest._id} className="interest-table-row">
              {/* Icon */}
              <td className="interest-table-cell interest-table-col-icon">
                <div className="interest-table-icon">
                  {interest.icon?.type === "emoji" ? (
                    <span className="interest-table-emoji">
                      {interest.icon.value}
                    </span>
                  ) : (
                    <img
                      src={interest.icon?.value}
                      alt={interest.name}
                      className="interest-table-image"
                    />
                  )}
                </div>
              </td>

              {/* Name */}
              <td className="interest-table-cell interest-table-col-name">
                <span className="interest-table-name">{interest.name}</span>
              </td>

              {/* Description */}
              <td className="interest-table-cell interest-table-col-description">
                <span className="interest-table-description">
                  {interest.description || "—"}
                </span>
              </td>

              {/* Status */}
              <td className="interest-table-cell interest-table-col-status">
                <button
                  className={`interest-table-status-badge ${
                    interest.isActive ? "active" : "inactive"
                  }`}
                  onClick={() => onToggleStatus(interest._id)}
                  title={
                    interest.isActive
                      ? "Click to deactivate"
                      : "Click to activate"
                  }
                >
                  {interest.isActive ? "Active" : "Inactive"}
                </button>
              </td>

              {/* Actions */}
              <td className="interest-table-cell interest-table-col-actions">
                <div className="interest-table-actions">
                  <button
                    className="interest-table-btn interest-table-btn-edit"
                    onClick={() => onEdit(interest)}
                    title="Edit interest"
                  >
                    ✏️
                  </button>
                  <button
                    className="interest-table-btn interest-table-btn-delete"
                    onClick={() => handleDelete(interest)}
                    title="Delete interest"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InterestTable;
