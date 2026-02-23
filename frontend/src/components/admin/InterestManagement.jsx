import React, { useState, useEffect } from "react";
import InterestFormModal from "./InterestFormModal";
import InterestTable from "./InterestTable";
import InterestGrid from "./InterestGrid";
import * as adminApi from "../../api/admin.api";
import "./InterestManagement.css";

const InterestManagement = () => {
  const [interests, setInterests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load interests
  useEffect(() => {
    loadInterests();
  }, [currentPage]);

  const loadInterests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.getAllInterests(currentPage, itemsPerPage);
      setInterests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading interests:", err);
      setError("Failed to load interests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    setEditingInterest(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (interest) => {
    setEditingInterest(interest);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingInterest(null);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (editingInterest) {
        // Update existing interest
        await adminApi.updateInterest(editingInterest._id, formData);
        setSuccessMessage("Interest updated successfully!");
      } else {
        // Create new interest
        await adminApi.createInterest(formData);
        setSuccessMessage("Interest created successfully!");
      }

      // Reload interests
      await loadInterests();
      handleModalClose();

      // Auto-hide success message
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving interest:", err);
      setError(err.message || "Failed to save interest. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInterest = async (interestId) => {
    try {
      setError(null);
      await adminApi.deleteInterest(interestId);
      setSuccessMessage("Interest deleted successfully!");
      await loadInterests();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error deleting interest:", err);
      setError("Failed to delete interest. Please try again.");
    }
  };

  const handleToggleStatus = async (interestId) => {
    try {
      setError(null);
      await adminApi.toggleInterestStatus(interestId);
      setSuccessMessage("Interest status updated!");
      await loadInterests();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error toggling interest status:", err);
      setError("Failed to update interest status. Please try again.");
    }
  };

  // Filter interests based on search
  const filteredInterests = interests.filter((interest) =>
    interest.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="interest-management">
      {/* Header */}
      <div className="interest-management-header">
        <div className="interest-management-title-section">
          <h1>Interest Management</h1>
          <p>Create, edit, and manage user interests</p>
        </div>
        <button
          className="interest-management-btn-create"
          onClick={handleCreateClick}
          disabled={isSubmitting}
        >
          + Create Interest
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="interest-management-alert interest-management-alert-error">
          {error}
          <button
            className="interest-management-alert-close"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
      {successMessage && (
        <div className="interest-management-alert interest-management-alert-success">
          {successMessage}
          <button
            className="interest-management-alert-close"
            onClick={() => setSuccessMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="interest-management-controls">
        <div className="interest-management-search">
          <input
            type="text"
            placeholder="Search interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="interest-management-search-input"
          />
        </div>

        <div className="interest-management-view-toggle">
          <button
            className={`interest-management-view-btn ${
              viewMode === "grid" ? "active" : ""
            }`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            ⊞ Grid
          </button>
          <button
            className={`interest-management-view-btn ${
              viewMode === "table" ? "active" : ""
            }`}
            onClick={() => setViewMode("table")}
            title="Table view"
          >
            ≡ Table
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="interest-management-content">
        {viewMode === "grid" ? (
          <InterestGrid
            interests={filteredInterests}
            isLoading={isLoading}
            onEdit={handleEditClick}
            onDelete={handleDeleteInterest}
            onToggleStatus={handleToggleStatus}
          />
        ) : (
          <InterestTable
            interests={filteredInterests}
            isLoading={isLoading}
            onEdit={handleEditClick}
            onDelete={handleDeleteInterest}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredInterests.length > 0 && (
        <div className="interest-management-pagination">
          <button
            className="interest-management-pagination-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <span className="interest-management-pagination-info">
            Page {currentPage}
          </span>
          <button
            className="interest-management-pagination-btn"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={filteredInterests.length < itemsPerPage}
          >
            Next →
          </button>
        </div>
      )}

      {/* Modal */}
      <InterestFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        interest={editingInterest}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default InterestManagement;
