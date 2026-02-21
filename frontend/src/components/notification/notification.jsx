// src/pages/Notification/Notification.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
  clearReadNotifications,
} from "../../api/notificationApi";
import "./notification.css";

const Notification = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load thông báo từ API khi vào trang
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyNotifications(pageNum, 20);

      if (data?.success) {
        const newNotifs = data.data || [];
        if (pageNum === 1) {
          setNotifications(newNotifs);
        } else {
          setNotifications((prev) => [...prev, ...newNotifs]);
        }

        setHasMore(newNotifs.length >= 20);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
      setError(err?.response?.data?.message || "Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOneRead = async (notifId) => {
    try {
      await markOneRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error("Mark read error:", err);
      alert("Không thể đánh dấu đã đọc");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      alert("Đã đánh dấu tất cả là đã đọc");
    } catch (err) {
      console.error("Mark all read error:", err);
      alert("Không thể đánh dấu tất cả đã đọc");
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await deleteNotification(notifId);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (err) {
      console.error("Delete notification error:", err);
      alert("Không thể xóa thông báo");
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm("Xóa tất cả thông báo đã đọc?")) return;

    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      alert("Đã xóa tất cả thông báo đã đọc");
    } catch (err) {
      console.error("Clear read error:", err);
      alert("Không thể xóa thông báo đã đọc");
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 30) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const handleNotificationClick = (notif) => {
    // Đánh dấu đã đọc khi click
    if (!notif.isRead) {
      handleMarkOneRead(notif._id);
    }

    // Navigate đến link nếu có
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mobile-wrapper">
      {/* HEADER */}
      <div className="notif-header">
        <Link
          to="/home"
          className="btn-icon"
          style={{ color: "#000", fontSize: "24px" }}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <div className="notif-title">Notification</div>

        {/* Action buttons */}
        <div className="notif-actions">
          {unreadCount > 0 && (
            <button
              className="notif-action-btn"
              onClick={handleMarkAllRead}
              title="Đánh dấu tất cả đã đọc"
            >
              <i className="fa-solid fa-check-double"></i>
            </button>
          )}
          <button
            className="notif-action-btn"
            onClick={handleClearRead}
            title="Xóa thông báo đã đọc"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <div className="notif-container">
        {loading && page === 1 ? (
          <div className="notif-loading">
            <i className="fa-solid fa-spinner fa-spin"></i> Đang tải...
          </div>
        ) : error ? (
          <div className="notif-error">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <i className="fa-regular fa-bell-slash"></i>
            <p>Chưa có thông báo nào</p>
          </div>
        ) : (
          <>
            {/* Hiển thị số lượng chưa đọc */}
            {unreadCount > 0 && (
              <div className="section-title">
                {unreadCount} thông báo chưa đọc
              </div>
            )}

            {notifications.map((notif) => (
              <div
                className={`notif-item ${notif.isRead ? "read" : "unread"}`}
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="notif-left">
                  {!notif.isRead && <div className="notif-badge"></div>}
                  <div className="notif-avatar">
                    {notif.sender?.profilePicture ? (
                      <img
                        src={notif.sender.profilePicture}
                        alt={notif.sender?.username || "User"}
                      />
                    ) : (
                      <i className="fa-solid fa-user"></i>
                    )}
                  </div>
                  <div className="notif-content">
                    <div className="notif-text">
                      <strong>{notif.title}</strong>
                      {notif.body && <p>{notif.body}</p>}
                    </div>
                    <div className="notif-time">
                      {formatDate(notif.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  className="notif-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notif._id);
                  }}
                  title="Xóa thông báo"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}

            {hasMore && (
              <div className="notif-load-more">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang
                      tải...
                    </>
                  ) : (
                    "Tải thêm"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notification;
