import React, { useState, useEffect } from "react";
import { getCategoriesWithTags } from "../../api/tagApi";
import userApi from "../../api/userApi";
import "./TagSelectionModal.css";

export default function TagSelectionModal({
  isOpen,
  onClose,
  currentTags = [],
  onSave = null,
}) {
  const [categoriesWithTags, setCategoriesWithTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      const ids = currentTags.map((t) => t._id || t.id);
      setSelectedIds(ids);
    }
  }, [isOpen, currentTags]);

  const fetchTags = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getCategoriesWithTags();
      let data = res?.data?.data || res?.data || [];
      setCategoriesWithTags(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load tags"
      );
    } finally {
      setLoading(false);
    }
  };

  const MAX_TAGS = 5;

  const handleToggleTag = (tagId) => {
    setSelectedIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      // Limit to 5 tags
      if (prev.length >= MAX_TAGS) {
        return prev;
      }
      return [...prev, tagId];
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
          "Failed to save tags"
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
    <div className="tag-selection-overlay" onClick={handleOverlayClick}>
      <div className="tag-selection-modal">
        <div className="tag-selection-header">
          <h2 className="tag-selection-title">Select Your Tags</h2>
          <button
            className="tag-selection-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="tag-selection-body">
          {error && (
            <div className="tag-selection-error">{error}</div>
          )}

          {loading ? (
            <div className="tag-selection-loading">
              <div className="spinner"></div>
              <p>Loading tags...</p>
            </div>
          ) : categoriesWithTags.length === 0 ? (
            <div className="tag-selection-empty">
              No tags available
            </div>
          ) : (
            <div className="tag-selection-categories">
              {categoriesWithTags.map((category) => (
                <div key={category._id || category.id} className="tag-category-section">
                  <h3 className="tag-category-title">{category.name}</h3>
                  <div className="tag-category-grid">
                    {category.tags && category.tags.map((tag) => {
                      const id = tag._id || tag.id;
                      const isSelected = selectedIds.includes(id);
                      return (
                        <div
                          key={id}
                          className={`tag-item ${isSelected ? "selected" : ""}`}
                          style={tag.color ? { borderColor: tag.color } : {}}
                          onClick={() => handleToggleTag(id)}
                        >
                          <span
                            className="tag-item-name"
                            style={isSelected && tag.color ? { backgroundColor: tag.color } : {}}
                          >
                            {tag.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tag-selection-footer">
          <div className="tag-selection-count">
            Selected: {selectedIds.length}/{MAX_TAGS} tags
          </div>
          <div className="tag-selection-actions">
            <button
              className="tag-selection-btn cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="tag-selection-btn save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Tags"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
