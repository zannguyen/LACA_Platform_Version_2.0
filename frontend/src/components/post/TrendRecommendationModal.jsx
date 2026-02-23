import React, { useState, useEffect } from "react";
import TrendCard from "./TrendCard";
import "./TrendRecommendationModal.css";

const TrendRecommendationModal = ({ isOpen, trends, onClose, onExploreTrend }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation
  };

  if (!isOpen && !isVisible) return null;

  return (
    <div className={`trend-modal-overlay ${isVisible ? "visible" : ""}`} onClick={handleClose}>
      <div
        className={`trend-modal ${isVisible ? "visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="trend-modal-header">
          <h2>Xu hướng được đề xuất</h2>
          <button className="trend-modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Subtitle */}
        <p className="trend-modal-subtitle">
          Dựa trên bài đăng của bạn, đây là những xu hướng đang hot:
        </p>

        {/* Trends List */}
        <div className="trend-modal-list">
          {trends && trends.length > 0 ? (
            trends.map((trend, index) => (
              <TrendCard
                key={index}
                trend={trend}
                onExplore={() => {
                  onExploreTrend(trend);
                  handleClose();
                }}
              />
            ))
          ) : (
            <div className="trend-modal-empty">
              <p>Không có xu hướng được đề xuất</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="trend-modal-footer">
          <button className="trend-modal-btn-dismiss" onClick={handleClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrendRecommendationModal;
