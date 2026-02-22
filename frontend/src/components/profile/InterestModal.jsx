// frontend/src/components/profile/InterestModal.jsx
import React, { useState, useEffect } from "react";
import InterestBadge from "./InterestBadge";
import interestApi from "../../api/interestApi";
import "./InterestModal.css";

export default function InterestModal({
  isOpen,
  onClose,
  currentInterests = [],
  isEditing = false,
  onSave = null,
}) {
  const [allInterests, setAllInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchAllInterests();
      // Initialize selected IDs from current interests
      const ids = currentInterests.map((i) => i._id || i.id);
      setSelectedIds(ids);
    }
  }, [isOpen, currentInterests]);

  const fetchAllInterests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await interestApi.getAllInterests();
      const data = res?.data?.data || res?.data || [];
      setAllInterests(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load interests",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInterest = (interest) => {
    if (!isEditing) return;

    const id = interest._id || interest.id;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (!onSave) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(selectedIds);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save interests",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // In view mode, show current interests
  const displayInterests = isEditing ? allInterests : currentInterests;

  return (
    <div className="interest-modal-overlay" onClick={handleOverlayClick}>
      <div className="interest-modal">
        <div className="interest-modal-header">
          <h3 className="interest-modal-title">
            {isEditing ? "Select Your Interests" : "All Interests"}
          </h3>
          <button
            className="interest-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="interest-modal-body">
          {error && <div className="interest-modal-error">{error}</div>}

          {loading ? (
            <div className="interest-modal-loading">Loading interests...</div>
          ) : displayInterests.length === 0 ? (
            <div className="interest-modal-empty">
              {isEditing ? "No interests available" : "No interests selected"}
            </div>
          ) : (
            <div className="interest-modal-grid">
              {displayInterests.map((interest) => {
                const id = interest._id || interest.id;
                const isSelected = selectedIds.includes(id);
                return (
                  <InterestBadge
                    key={id}
                    interest={interest}
                    selected={isEditing && isSelected}
                    onClick={isEditing ? handleToggleInterest : null}
                    className={isEditing && !isSelected ? "unselected" : ""}
                  />
                );
              })}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="interest-modal-footer">
            <button
              className="interest-modal-btn cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="interest-modal-btn save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
