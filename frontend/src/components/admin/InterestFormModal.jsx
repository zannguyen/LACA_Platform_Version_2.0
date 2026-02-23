import React, { useState, useEffect } from "react";
import IconLibrarySelector from "./IconLibrarySelector";
import { formatIconForAPI } from "../../utils/iconUpload";
import "./InterestFormModal.css";

const InterestFormModal = ({ isOpen, onClose, onSubmit, interest, isLoading }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: null,
  });
  const [errors, setErrors] = useState({});
  const [showIconSelector, setShowIconSelector] = useState(false);

  // Initialize form with interest data if editing
  useEffect(() => {
    if (interest) {
      setFormData({
        name: interest.name || "",
        description: interest.description || "",
        icon: interest.icon || null,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        icon: null,
      });
    }
    setErrors({});
  }, [interest, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Interest name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Interest name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Interest name must not exceed 50 characters";
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = "Description must not exceed 200 characters";
    }

    if (!formData.icon) {
      newErrors.icon = "Please select an icon";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleIconSelect = (icon) => {
    setFormData((prev) => ({
      ...prev,
      icon,
    }));
    setErrors((prev) => ({
      ...prev,
      icon: "",
    }));
    setShowIconSelector(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: {
          type: formData.icon.type || "emoji",
          value: formData.icon.value,
        },
      };

      if (interest?._id) {
        submitData._id = interest._id;
      }

      await onSubmit(submitData);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error.message || "Failed to save interest",
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="interest-form-modal-overlay" onClick={onClose}>
      <div
        className="interest-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="interest-form-header">
          <h2>{interest ? "Edit Interest" : "Create New Interest"}</h2>
          <button
            className="interest-form-close"
            onClick={onClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="interest-form">
          {/* Name Field */}
          <div className="interest-form-group">
            <label htmlFor="name" className="interest-form-label">
              Interest Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Photography, Cooking, Travel"
              className={`interest-form-input ${errors.name ? "error" : ""}`}
              disabled={isLoading}
              maxLength={50}
            />
            {errors.name && (
              <span className="interest-form-error">{errors.name}</span>
            )}
            <span className="interest-form-hint">
              {formData.name.length}/50 characters
            </span>
          </div>

          {/* Description Field */}
          <div className="interest-form-group">
            <label htmlFor="description" className="interest-form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of this interest (optional)"
              className={`interest-form-textarea ${
                errors.description ? "error" : ""
              }`}
              disabled={isLoading}
              maxLength={200}
              rows={3}
            />
            {errors.description && (
              <span className="interest-form-error">{errors.description}</span>
            )}
            <span className="interest-form-hint">
              {formData.description.length}/200 characters
            </span>
          </div>

          {/* Icon Selection */}
          <div className="interest-form-group">
            <label className="interest-form-label">
              Icon *
            </label>
            <button
              type="button"
              className={`interest-form-icon-button ${
                errors.icon ? "error" : ""
              }`}
              onClick={() => setShowIconSelector(!showIconSelector)}
              disabled={isLoading}
            >
              {formData.icon ? (
                <>
                  {formData.icon.type === "emoji" ? (
                    <span className="interest-form-icon-display">
                      {formData.icon.value}
                    </span>
                  ) : (
                    <img
                      src={formData.icon.value}
                      alt="Selected icon"
                      className="interest-form-icon-image"
                    />
                  )}
                  <span>Change Icon</span>
                </>
              ) : (
                <>
                  <span>📌</span>
                  <span>Select Icon</span>
                </>
              )}
            </button>
            {errors.icon && (
              <span className="interest-form-error">{errors.icon}</span>
            )}

            {/* Icon Selector */}
            {showIconSelector && (
              <div className="interest-form-icon-selector-wrapper">
                <IconLibrarySelector
                  onSelect={handleIconSelect}
                  selectedIcon={formData.icon}
                />
              </div>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="interest-form-submit-error">{errors.submit}</div>
          )}

          {/* Actions */}
          <div className="interest-form-actions">
            <button
              type="button"
              className="interest-form-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="interest-form-btn-submit"
              disabled={isLoading}
            >
              {isLoading
                ? interest
                  ? "Updating..."
                  : "Creating..."
                : interest
                ? "Update Interest"
                : "Create Interest"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterestFormModal;
