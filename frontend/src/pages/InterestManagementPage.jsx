import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import InterestGrid from "../components/interest/InterestGrid";
import interestApi from "../api/interestApi";
import "./InterestManagementPage.css";

const InterestManagementPage = () => {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load interests and user's current selections
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all interests
        const allInterests = await interestApi.getAllInterests();
        setInterests(Array.isArray(allInterests) ? allInterests : []);

        // Fetch user's current interests
        const userInterests = await interestApi.getMyInterests();
        const userInterestIds = (Array.isArray(userInterests) ? userInterests : []).map(
          (i) => i._id
        );
        setSelectedIds(userInterestIds);
      } catch (err) {
        console.error("Error loading interests:", err);
        setError("Không thể tải sở thích. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleInterest = (interestId) => {
    setSelectedIds((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      await interestApi.updateMyInterests(selectedIds);

      setSuccessMessage("Sở thích đã được cập nhật thành công!");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving interests:", err);
      setError("Không thể lưu sở thích. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="interest-management-page">
      {/* Header */}
      <div className="interest-management-header">
        <button className="interest-management-back" onClick={handleCancel}>
          ← Quay lại
        </button>
        <h1>Quản lý Sở thích</h1>
        <p className="interest-management-subtitle">
          Chọn những sở thích của bạn để nhận được gợi ý nội dung phù hợp
        </p>
      </div>

      {/* Messages */}
      {error && <div className="interest-management-error">{error}</div>}
      {successMessage && (
        <div className="interest-management-success">{successMessage}</div>
      )}

      {/* Content */}
      <div className="interest-management-content">
        <InterestGrid
          interests={interests}
          selectedIds={selectedIds}
          onToggle={handleToggleInterest}
          isLoading={isLoading}
        />
      </div>

      {/* Footer */}
      <div className="interest-management-footer">
        <div className="interest-management-info">
          Đã chọn: <strong>{selectedIds.length}</strong> sở thích
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
            {isSaving ? "Đang lưu..." : "Lưu sở thích"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterestManagementPage;
