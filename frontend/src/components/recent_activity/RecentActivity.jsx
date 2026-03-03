import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import "./RecentActivity.css";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

export default function RecentActivity() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const fetchActivities = async (page = 1, append = false) => {
    try {
      setLoading(true);
      setError("");

      const res = await userApi.getMyRecentActivities({ page, limit: 20 });
      const payload = res?.data?.data || {};
      const nextItems = payload.activities || [];

      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setPagination(
        payload.pagination || {
          page,
          limit: 20,
          total: nextItems.length,
          totalPages: 1,
        },
      );
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Không thể tải hoạt động gần đây",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
  }, []);

  const handleOpen = (item) => {
    if (!item?.link) return;
    navigate(item.link);
  };

  const canLoadMore = pagination.page < pagination.totalPages;

  return (
    <div className="recent-activity-page">
      <div className="ra-header">
        <button
          className="ra-back"
          onClick={() => navigate(-1)}
          aria-label="Quay lại"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="ra-title">Hoạt động gần đây</div>
      </div>

      <div className="ra-content">
        {loading && items.length === 0 ? (
          <div className="ra-state">Đang tải...</div>
        ) : error ? (
          <div className="ra-state ra-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="ra-state">Chưa có hoạt động nào</div>
        ) : (
          <>
            {items.map((item) => (
              <button
                type="button"
                key={`${item.kind}-${item.id}`}
                className={`ra-item ${item.link ? "clickable" : ""}`}
                onClick={() => handleOpen(item)}
                disabled={!item.link}
              >
                <div className="ra-avatar">
                  {item.actor?.avatar ? (
                    <img
                      src={item.actor.avatar}
                      alt={item.actor.name || "user"}
                    />
                  ) : (
                    <i className="fa-solid fa-clock-rotate-left"></i>
                  )}
                </div>
                <div className="ra-body">
                  <div className="ra-item-title">{item.title}</div>
                  {!!item.description && (
                    <div className="ra-item-desc">{item.description}</div>
                  )}
                  <div className="ra-item-time">
                    {formatTime(item.createdAt)}
                  </div>
                </div>
                {item.kind === "notification" && !item.isRead && (
                  <span className="ra-unread-dot" />
                )}
              </button>
            ))}

            {canLoadMore && (
              <button
                type="button"
                className="ra-load-more"
                disabled={loading}
                onClick={() => fetchActivities(pagination.page + 1, true)}
              >
                {loading ? "Đang tải..." : "Tải thêm"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
