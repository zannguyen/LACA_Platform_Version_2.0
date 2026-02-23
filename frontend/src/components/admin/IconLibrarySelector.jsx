import React, { useState, useMemo } from "react";
import {
  getAvailableCategories,
  getIconsByLib,
  searchIconsLib,
  uploadIconFile,
} from "../../utils/iconUpload";
import "./IconLibrarySelector.css";

const IconLibrarySelector = ({ onSelect, selectedIcon }) => {
  const [activeTab, setActiveTab] = useState("library"); // 'library' or 'upload'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const categories = useMemo(() => getAvailableCategories(), []);

  // Set default category on first load
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Get icons based on search or category
  const displayedIcons = useMemo(() => {
    if (searchQuery.trim()) {
      return searchIconsLib(searchQuery);
    }
    if (selectedCategory) {
      return getIconsByLib(selectedCategory);
    }
    return [];
  }, [searchQuery, selectedCategory]);

  const handleIconSelect = (icon) => {
    onSelect({
      type: "emoji",
      value: icon.emoji,
      name: icon.name,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!previewFile) {
      setUploadError("Please select a file");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError(null);
      const result = await uploadIconFile(previewFile);
      onSelect({
        type: "image",
        value: result.url,
        publicId: result.publicId,
      });
      setPreviewFile(null);
      setActiveTab("library");
    } catch (error) {
      setUploadError(error.message || "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="icon-library-selector">
      {/* Tabs */}
      <div className="icon-selector-tabs">
        <button
          className={`icon-selector-tab ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          Icon Library
        </button>
        <button
          className={`icon-selector-tab ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          Upload Custom
        </button>
      </div>

      {/* Library Tab */}
      {activeTab === "library" && (
        <div className="icon-selector-library">
          {/* Search */}
          <div className="icon-selector-search">
            <input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="icon-selector-search-input"
            />
          </div>

          {/* Categories */}
          {!searchQuery && (
            <div className="icon-selector-categories">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`icon-selector-category ${
                    selectedCategory === category ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Icons Grid */}
          <div className="icon-selector-grid">
            {displayedIcons.length > 0 ? (
              displayedIcons.map((icon) => (
                <button
                  key={icon.id}
                  className={`icon-selector-item ${
                    selectedIcon?.value === icon.emoji ? "selected" : ""
                  }`}
                  onClick={() => handleIconSelect(icon)}
                  title={icon.name}
                >
                  <span className="icon-selector-emoji">{icon.emoji}</span>
                  <span className="icon-selector-name">{icon.name}</span>
                </button>
              ))
            ) : (
              <div className="icon-selector-empty">No icons found</div>
            )}
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="icon-selector-upload">
          <div className="icon-selector-upload-area">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="icon-selector-file-input"
              id="icon-file-input"
            />
            <label htmlFor="icon-file-input" className="icon-selector-upload-label">
              <div className="icon-selector-upload-icon">📤</div>
              <div className="icon-selector-upload-text">
                {previewFile ? previewFile.name : "Click to select or drag image"}
              </div>
              <div className="icon-selector-upload-hint">
                PNG, JPG, GIF, WebP • Max 5MB
              </div>
            </label>
          </div>

          {previewFile && (
            <div className="icon-selector-preview">
              <img
                src={URL.createObjectURL(previewFile)}
                alt="Preview"
                className="icon-selector-preview-img"
              />
            </div>
          )}

          {uploadError && (
            <div className="icon-selector-error">{uploadError}</div>
          )}

          <button
            className="icon-selector-upload-btn"
            onClick={handleUpload}
            disabled={!previewFile || uploadLoading}
          >
            {uploadLoading ? "Uploading..." : "Upload Icon"}
          </button>
        </div>
      )}

      {/* Selected Icon Display */}
      {selectedIcon && (
        <div className="icon-selector-selected">
          <div className="icon-selector-selected-label">Selected Icon:</div>
          <div className="icon-selector-selected-display">
            {selectedIcon.type === "emoji" ? (
              <span className="icon-selector-selected-emoji">{selectedIcon.value}</span>
            ) : (
              <img
                src={selectedIcon.value}
                alt="Selected"
                className="icon-selector-selected-image"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconLibrarySelector;
