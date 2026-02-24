import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCategoriesWithTags } from "../api/tagApi";
import userApi from "../api/userApi";
import "./InterestManagementPage.css";

const InterestManagementPage = () => {
  const navigate = useNavigate();
  const [categoriesWithTags, setCategoriesWithTags] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load tags and user's current selections
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all categories with tags
        const res = await getCategoriesWithTags();
        const data = res?.data?.data || res?.data || [];
        setCategoriesWithTags(data);

        // Fetch user's current preferred tags
        const userTags = await userApi.getMyPreferredTags();
        const userTagIds = (Array.isArray(userTags?.data) ? userTags.data : []).map(
          (t) => t._id || t.id
        );
        setSelectedIds(userTagIds);
      } catch (err) {
        console.error("Error loading tags:", err);
        setError("Không thể tải tags. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleTag = (tagId) => {
    setSelectedIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await userApi.updateMyPreferredTags(selectedIds);

      setSuccessMessage("Tags đã được cập nhật thành công!");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving tags:", err);
      setError("Không thể lưu tags. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="interest-management-page">
        <div className="interest-management-loading">
          <div className="spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interest-management-page">
      {/* Header */}
      <div className="interest-management-header">
        <button className="interest-management-back" onClick={handleCancel}>
          ← Quay lại
        </button>
        <h1>Quản lý Tags</h1>
        <p className="interest-management-subtitle">
          Chọn những tags bạn quan tâm để nhận được gợi ý nội dung phù hợp
        </p>
      </div>

      {/* Messages */}
      {error && <div className="interest-management-error">{error}</div>}
      {successMessage && (
        <div className="interest-management-success">{successMessage}</div>
      )}

      {/* Content */}
      <div className="interest-management-content">
        {categoriesWithTags.length === 0 ? (
          <div className="interest-management-empty">
            Chưa có tags nào. Vui lòng liên hệ admin để thêm tags.
          </div>
        ) : (
          <div className="tags-categories-list">
            {categoriesWithTags.map((category) => (
              <div key={category._id || category.id} className="tag-category-block">
                <h3 className="tag-category-name">{category.name}</h3>
                <div className="tag-category-items">
                  {category.tags && category.tags.map((tag) => {
                    const id = tag._id || tag.id;
                    const isSelected = selectedIds.includes(id);
                    return (
                      <div
                        key={id}
                        className={`tag-select-item ${isSelected ? "selected" : ""}`}
                        style={tag.color && isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                        onClick={() => handleToggleTag(id)}
                      >
                        <span className="tag-select-name">{tag.name}</span>
                        {isSelected && (
                          <span className="tag-select-check">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="interest-management-footer">
        <div className="interest-management-info">
          Đã chọn: <strong>{selectedIds.length}</strong> tags
        </div>
        <div className="interest-management-actions">
          <button
            className="interest-management-btn-cancel"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Hủy
          </button>
          <button
            className="interest-management-btn-save"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Đang lưu..." : "Lưu tags"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterestManagementPage;
