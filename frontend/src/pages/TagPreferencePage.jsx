import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import tagApi from "../api/tagApi";
import userApi from "../api/userApi";
import "./TagPreferencePage.css";

const TagPreferencePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all categories with tags
      const catRes = await tagApi.getCategoriesWithTags();
      const cats = catRes.data?.data || [];

      // Flatten tags from all categories
      const allTags = cats.flatMap(cat =>
        (cat.tags || []).map(tag => ({ ...tag, categoryName: cat.name, categoryColor: cat.color }))
      );
      setCategories(cats);

      // Fetch user's current preferred tags
      const userRes = await userApi.getMyPreferredTags();
      const userTags = userRes.data?.data || [];
      setSelectedIds(userTags.map(t => t._id));
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
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
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await userApi.updateMyPreferredTags(selectedIds);

      setSuccessMessage("Sở thích đã được cập nhật thành công!");

      setTimeout(() => {
        setSuccessMessage(null);
        navigate(-1);
      }, 1500);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError("Không thể lưu sở thích. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return <div className="tag-preference-loading">Đang tải...</div>;
  }

  return (
    <div className="tag-preference-page">
      <div className="tag-preference-header">
        <button className="tag-preference-back" onClick={handleCancel}>
          ← Quay lại
        </button>
        <h1>Chọn Sở thích</h1>
        <p className="tag-preference-subtitle">
          Chọn những chủ đề bạn quan tâm để nhận được gợi ý nội dung phù hợp hơn
        </p>
      </div>

      {error && <div className="tag-preference-error">{error}</div>}
      {successMessage && (
        <div className="tag-preference-success">{successMessage}</div>
      )}

      <div className="tag-preference-content">
        {categories.map((category) => (
          <div key={category._id} className="category-section">
            <div className="category-title">
              <span className="category-icon">{category.icon}</span>
              <span>{category.name}</span>
            </div>
            <div className="tags-grid">
              {category.tags?.map((tag) => (
                <button
                  key={tag._id}
                  className={`tag-chip ${selectedIds.includes(tag._id) ? "selected" : ""}`}
                  style={{
                    borderColor: selectedIds.includes(tag._id) ? category.color : "#ddd",
                    backgroundColor: selectedIds.includes(tag._id) ? category.color : "transparent",
                    color: selectedIds.includes(tag._id) ? "white" : "#333"
                  }}
                  onClick={() => handleToggleTag(tag._id)}
                >
                  <span className="tag-chip-icon">{tag.icon}</span>
                  {tag.name}
                </button>
              ))}
              {(!category.tags || category.tags.length === 0) && (
                <div className="no-tags">Chưa có tag nào</div>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="no-categories">Chưa có danh mục nào. Vui lòng quay lại sau.</div>
        )}
      </div>

      <div className="tag-preference-footer">
        <div className="tag-preference-info">
          Đã chọn: <strong>{selectedIds.length}</strong> sở thích
        </div>
        <div className="tag-preference-actions">
          <button
            className="tag-preference-btn-cancel"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Hủy
          </button>
          <button
            className="tag-preference-btn-save"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Đang lưu..." : "Lưu sở thích"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagPreferencePage;
