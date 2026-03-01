// src/components/ranking/RankingModal.jsx
import React from "react";
import "./RankingModal.css";

const getCategoryIcon = (category) => {
  const icons = {
    cafe: "fa-solid fa-mug-hot",
    restaurant: "fa-solid fa-utensils",
    bar: "fa-solid fa-wine-glass",
    shop: "fa-solid fa-shopping-bag",
    park: "fa-solid fa-tree",
    museum: "fa-solid fa-landmark",
    hotel: "fa-solid fa-hotel",
    other: "fa-solid fa-location-dot",
  };
  return icons[category] || icons.other;
};

const getMonthName = () => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[new Date().getMonth()];
};

export default function RankingModal({ open, onClose, data, loading }) {
  if (!open) return null;

  const { locations = [], users = [] } = data;

  return (
    <div className="ranking-modal-backdrop" onClick={onClose}>
      <div className="ranking-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ranking-header">
          <div className="ranking-header-icon">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <h2 className="ranking-title">Bảng Xếp Hạng</h2>
          <p className="ranking-subtitle">Tháng {getMonthName()}</p>
          <button className="ranking-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="ranking-content">
          {loading ? (
            <div className="ranking-loading">
              <div className="ranking-spinner"></div>
              <p>Đang tải...</p>
            </div>
          ) : (
            <>
              {/* Top Locations */}
              <div className="ranking-section">
                <h3 className="ranking-section-title">
                  <i className="fa-solid fa-location-dot"></i>
                  Vị Trí Nổi Bật
                </h3>
                <div className="ranking-list">
                  {locations.length === 0 ? (
                    <p className="ranking-empty">Chưa có dữ liệu</p>
                  ) : (
                    locations.map((location, index) => (
                      <div key={location.placeId || index} className="ranking-item location-item">
                        <div className={`ranking-rank rank-${index + 1}`}>
                          {index + 1}
                        </div>
                        <div className="ranking-icon-wrapper location-icon">
                          <i className={getCategoryIcon(location.category)}></i>
                        </div>
                        <div className="ranking-info">
                          <span className="ranking-name">{location.name}</span>
                          <span className="ranking-detail">{location.address}</span>
                        </div>
                        <div className="ranking-stat">
                          <span className="ranking-stat-value">{location.postCount}</span>
                          <span className="ranking-stat-label">bài đăng</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Users */}
              <div className="ranking-section">
                <h3 className="ranking-section-title">
                  <i className="fa-solid fa-users"></i>
                  Người Dùng Nổi Bật
                </h3>
                <div className="ranking-list">
                  {users.length === 0 ? (
                    <p className="ranking-empty">Chưa có dữ liệu</p>
                  ) : (
                    users.map((user, index) => (
                      <div key={user.userId || index} className="ranking-item user-item">
                        <div className={`ranking-rank rank-${index + 1}`}>
                          {index + 1}
                        </div>
                        <div className="ranking-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} />
                          ) : (
                            <div className="ranking-avatar-fallback">
                              <i className="fa-solid fa-user"></i>
                            </div>
                          )}
                        </div>
                        <div className="ranking-info">
                          <span className="ranking-name">{user.fullname || user.username}</span>
                          <span className="ranking-detail">@{user.username}</span>
                        </div>
                        <div className="ranking-stat">
                          <span className="ranking-stat-value">{user.totalLikes}</span>
                          <span className="ranking-stat-label">
                            <i className="fa-solid fa-heart"></i>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ranking-footer">
          <p>Cùng tham gia để có mặt trong bảng xếp hạng!</p>
        </div>
      </div>
    </div>
  );
}
