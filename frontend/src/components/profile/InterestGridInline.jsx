import React, { useState, useEffect } from "react";
import InterestCard from "../interest/InterestCard";
import interestApi from "../../api/interestApi";
import "./InterestGridInline.css";

export default function InterestGridInline({
  currentInterests = [],
  onSave = null,
}) {
  const [allInterests, setAllInterests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllInterests();
    const ids = currentInterests.map((i) => i._id || i.id);
    setSelectedIds(ids);
  }, [currentInterests]);

  const fetchAllInterests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await interestApi.getAllInterests();
      console.log("getAllInterests response:", res);
      // API returns array directly or wrapped in data
      let data = Array.isArray(res) ? res : res?.data?.data || res?.data || [];
      console.log("Parsed interests data:", data);
      setAllInterests(data);
    } catch (err) {
      console.error("Error fetching interests:", err);
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
    if (!onSave) return;

    try {
      await onSave(selectedIds);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save interests"
      );
    }
  };

  if (loading) {
    return <div className="interest-grid-inline-loading">Loading interests...</div>;
  }

  return (
    <div className="interest-grid-inline-container">
      {error && <div className="interest-grid-inline-error">{error}</div>}

      <div className="interest-grid-inline-label">Select Your Interests</div>

      {allInterests.length === 0 ? (
        <div className="interest-grid-inline-empty">No interests available</div>
      ) : (
        <div className="interest-grid-inline">
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

      <button
        type="button"
        className="interest-grid-inline-save-btn"
        onClick={handleSave}
      >
        Save Interests
      </button>
    </div>
  );
}
