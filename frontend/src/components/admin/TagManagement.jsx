import React, { useState, useEffect } from "react";
import tagApi from "../../api/tagApi";
import IconLibrarySelector from "./IconLibrarySelector";
import "./TagManagement.css";

const TagManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#e94057",
  });
  const [tagForm, setTagForm] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#e94057",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tagApi.getCategoriesWithTags();
      console.log("Loaded categories:", res.data?.data);
      setCategories(res.data?.data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("Không thể tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const openCategoryModal = (category = null) => {
    setError(null);
    setEditingCategory(category);
    setCategoryForm(
      category
        ? {
            name: category.name || "",
            description: category.description || "",
            icon: category.icon || "",
            color: category.color || "#e94057",
          }
        : { name: "", description: "", icon: "", color: "#e94057" },
    );
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon,
        color: categoryForm.color
      };
      console.log("Saving category - ID:", editingCategory?._id, "Payload:", payload);

      if (editingCategory) {
        const response = await tagApi.updateCategory(editingCategory._id, payload);
        console.log("Update response:", response);
        setSuccessMessage("Cập nhật danh mục thành công!");
      } else {
        const response = await tagApi.createCategory(payload);
        console.log("Create response:", response);
        setSuccessMessage("Tạo danh mục thành công!");
      }
      setShowCategoryModal(false);
      loadCategories();
    } catch (err) {
      console.error("Error saving category:", err);
      console.error("Error response:", err.response?.data);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể lưu danh mục";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    try {
      setError(null);
      setSuccessMessage(null);
      await tagApi.deleteCategory(categoryId);
      setSuccessMessage("Xóa danh mục thành công!");
      loadCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể xóa danh mục";
      setError(msg);
    }
  };

  // Tag handlers
  const openTagModal = (categoryId, tag = null) => {
    setError(null);
    setSelectedCategoryId(categoryId);
    setEditingTag(tag);
    setTagForm(
      tag
        ? {
            name: tag.name || "",
            description: tag.description || "",
            icon: tag.icon || "",
            color: tag.color || "#e94057",
          }
        : { name: "", description: "", icon: "", color: "#e94057" },
    );
    setShowTagModal(true);
  };

  const saveTag = async () => {
    if (!tagForm.name.trim() || !selectedCategoryId) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        name: tagForm.name,
        description: tagForm.description,
        icon: tagForm.icon,
        color: tagForm.color
      };
      console.log("Saving tag - ID:", editingTag?._id, "Payload:", payload);

      if (editingTag) {
        const response = await tagApi.updateTag(editingTag._id, payload);
        console.log("Update response:", response);
        setSuccessMessage("Cập nhật tag thành công!");
      } else {
        const response = await tagApi.createTag(selectedCategoryId, payload);
        console.log("Create response:", response);
        setSuccessMessage("Tạo tag thành công!");
      }
      setShowTagModal(false);
      loadCategories();
    } catch (err) {
      console.error("Error saving tag:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Không thể lưu thẻ";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async (tagId) => {
    if (!window.confirm("Bạn có chắc muốn xóa thẻ này?")) return;
    try {
      setError(null);
      setSuccessMessage(null);
      await tagApi.deleteTag(tagId);
      setSuccessMessage("Xóa tag thành công!");
      loadCategories();
    } catch (err) {
      console.error("Error deleting tag:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Không thể xóa thẻ";
      setError(msg);
    }
  };

  if (loading) {
    return <div className="tag-management-loading">Đang tải...</div>;
  }

  return (
    <div className="tag-management">
      <div className="tag-management-header">
        <h2>Quản lý Thẻ Và Danh Mục</h2>
        <button className="btn-primary" onClick={() => openCategoryModal()}>
          + Thêm danh mục
        </button>
      </div>

      {error && <div className="tag-management-error">{error}</div>}
      {successMessage && (
        <div className="tag-management-success">{successMessage}</div>
      )}

      <div className="categories-list">
        {categories.map((category) => (
          <div key={category._id} className="category-card">
            <div className="category-header">
              <div className="category-info">
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span
                  className="category-color"
                  style={{ backgroundColor: category.color }}
                />
              </div>
              <div className="category-actions">
                <button onClick={() => openCategoryModal(category)}>Sửa</button>
                <button
                  onClick={() => deleteCategory(category._id)}
                  className="btn-danger"
                >
                  Xóa
                </button>
              </div>
            </div>

            <div className="category-description">{category.description}</div>

            <div className="tags-section">
              <div className="tags-header">
                <span>Tags ({category.tags?.length || 0})</span>
                <button onClick={() => openTagModal(category._id)}>
                  + Thêm tag
                </button>
              </div>

              <div className="tags-list">
                {category.tags?.map((tag) => (
                  <div key={tag._id} className="tag-item">
                    <span className="tag-name">{tag.name}</span>
                    <span className="tag-icon">{tag.icon}</span>
                    <div className="tag-actions">
                      <button onClick={() => openTagModal(category._id, tag)}>
                        Sửa
                      </button>
                      <button
                        onClick={() => deleteTag(tag._id)}
                        className="btn-danger"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
                {(!category.tags || category.tags.length === 0) && (
                  <div className="no-tags">Chưa có tag nào</div>
                )}
              </div>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="no-categories">Chưa có danh mục nào</div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCategoryModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCategory ? "Sửa danh mục" : "Thêm danh mục"}</h3>

            <div className="form-group">
              <label>Tên danh mục *</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="Ví dụ: Ẩm thực"
              />
            </div>

            <div className="form-group">
              <label>Mô tả</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Mô tả danh mục..."
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <IconLibrarySelector
                value={categoryForm.icon}
                onChange={(icon) => setCategoryForm({ ...categoryForm, icon })}
              />
            </div>

            <div className="form-group">
              <label>Màu sắc</label>
              <input
                type="color"
                value={categoryForm.color}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, color: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowCategoryModal(false)}>Hủy</button>
              <button
                className="btn-primary"
                onClick={saveCategory}
                disabled={saving || !categoryForm.name.trim()}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="modal-overlay" onClick={() => setShowTagModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTag ? "Sửa tag" : "Thêm tag"}</h3>

            <div className="form-group">
              <label>Tên tag *</label>
              <input
                type="text"
                value={tagForm.name}
                onChange={(e) =>
                  setTagForm({ ...tagForm, name: e.target.value })
                }
                placeholder="Ví dụ: Ăn vặt"
              />
            </div>

            <div className="form-group">
              <label>Mô tả</label>
              <textarea
                value={tagForm.description}
                onChange={(e) =>
                  setTagForm({ ...tagForm, description: e.target.value })
                }
                placeholder="Mô tả tag..."
              />
            </div>

            <div className="form-group">
              <label>Icon</label>
              <IconLibrarySelector
                value={tagForm.icon}
                onChange={(icon) => setTagForm({ ...tagForm, icon })}
              />
            </div>

            <div className="form-group">
              <label>Màu sắc</label>
              <input
                type="color"
                value={tagForm.color}
                onChange={(e) =>
                  setTagForm({ ...tagForm, color: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowTagModal(false)}>Hủy</button>
              <button
                className="btn-primary"
                onClick={saveTag}
                disabled={saving || !tagForm.name.trim()}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManagement;
