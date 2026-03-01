import React, { useState, useMemo } from "react";
import InterestCard from "./InterestCard";
import "./InterestGrid.css";

const InterestGrid = ({ interests, selectedIds, onToggle, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Ensure interests is always an array
  const interestsArray = Array.isArray(interests) ? interests : [];

  const filteredInterests = useMemo(() => {
    if (!searchTerm.trim()) return interestsArray;

    return interestsArray.filter(
      (interest) =>
        interest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (interest.description &&
          interest.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [interestsArray, searchTerm]);

  if (isLoading) {
    return (
      <div className="interest-grid-container">
        <div className="interest-grid-loading">
          <div className="spinner"></div>
          <p>Đang tải sở thích...</p>
        </div>
      </div>
    );
  }

  if (interestsArray.length === 0) {
    return (
      <div className="interest-grid-container">
        <div className="interest-grid-empty">
          <p>Không có sở thích nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interest-grid-container">
      {/* Search Bar */}
      <div className="interest-grid-search">
        <input
          type="text"
          placeholder="Tìm kiếm sở thích..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="interest-grid-search-input"
        />
        {searchTerm && (
          <button
            className="interest-grid-search-clear"
            onClick={() => setSearchTerm("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Results Info */}
      {searchTerm && (
        <div className="interest-grid-results-info">
          Tìm thấy {filteredInterests.length} sở thích
        </div>
      )}

      {/* Grid */}
      <div className="interest-grid">
        {filteredInterests.map((interest) => (
          <InterestCard
            key={interest._id}
            interest={interest}
            isSelected={selectedIds.includes(interest._id)}
            onToggle={onToggle}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredInterests.length === 0 && searchTerm && (
        <div className="interest-grid-no-results">
          <p>Không tìm thấy sở thích phù hợp</p>
        </div>
      )}
    </div>
  );
};

export default InterestGrid;
