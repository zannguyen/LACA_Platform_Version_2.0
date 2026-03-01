import React from "react";
import "./TrendCard.css";

const TrendCard = ({ trend, onExplore }) => {
  // Calculate confidence percentage
  const confidencePercent = Math.round((trend.confidence || 0.7) * 100);

  return (
    <div className="trend-card">
      {/* Icon */}
      <div className="trend-card-icon">
        <span>📈</span>
      </div>

      {/* Content */}
      <div className="trend-card-content">
        <h3 className="trend-card-title">{trend.topic}</h3>

        {/* Confidence Bar */}
        <div className="trend-card-confidence">
          <div className="trend-card-confidence-bar">
            <div
              className="trend-card-confidence-fill"
              style={{ width: `${confidencePercent}%` }}
            ></div>
          </div>
          <span className="trend-card-confidence-text">{confidencePercent}% phù hợp</span>
        </div>

        {/* Post Count */}
        {trend.count && (
          <p className="trend-card-count">
            <strong>{trend.count}</strong> bài đăng liên quan
          </p>
        )}
      </div>

      {/* Explore Button */}
      <button className="trend-card-explore" onClick={onExplore}>
        Khám phá
      </button>
    </div>
  );
};

export default TrendCard;
