import React, { useState, useEffect } from "react";
import InterestCard from "../interest/InterestCard";
import interestApi from "../../api/interestApi";
import "./InterestSelectionModal.css";

export default function InterestSelectionModal({
  isOpen,
  onClose,
  currentInterests = [],
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
      const ids = currentInterests.map((i) => i._id || i.id);
      setSelectedIds(ids);
    }
  }, [isOpen, currentInterests]);

  const fetchAllInterests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await interestApi.getAllInterests();
      let data = Array.isArray(res) ? res : res?.data?.data || res?.data || [];
      setAllInterests(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load interests"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInterest = (interestId) => {
    setSelectedIds((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((i) => i !== interestId);
      }
      return [...prev, interestId];
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
          "Failed to save interests"
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

  return (
    <div className="interest-selection-overlay" onClick={handleOverlayClick}>
      <div className="interest-selection-modal">
        <div className="interest-selection-header">
          <h2 className="interest-selection-title">Select Your Interests</h2>
          <button
            className="interest-selection-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="interest-selection-body">
          {error && (
            <div className="interest-selection-error">{error}</div>
          )}

          {loading ? (
            <div className="interest-selection-loading">
              <div className="spinner"></div>
              <p>Loading interests...</p>
            </div>
          ) : allInterests.length === 0 ? (
            <div className="interest-selection-empty">
              No interests available
            </div>
          ) : (
            <div className="interest-selection-grid">
              {allInterests.map((interest) => {
                const id = interest._id || interest.id;
                const isSelected = selectedIds.includes(id);
                return (
                  <InterestCard
                    key={id}
                    interest={interest}
                    isSelected={isSelected}
                    onToggle={handleToggleInterest}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="interest-selection-footer">
          <button
            className="interest-selection-btn cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="interest-selection-btn save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Interests"}
          </button>
        </div>
      </div>
    </div>
  );
}
