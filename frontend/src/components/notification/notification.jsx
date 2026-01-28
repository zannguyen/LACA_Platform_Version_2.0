// src/pages/Notification/Notification.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./notification.css";

const Notification = () => {
  // State lưu thông báo thật (Lấy từ hành động Like)
  const [realNotifs, setRealNotifs] = useState([]);

  // Dữ liệu giả cho phần "Last 30 days" (Để giống thiết kế mẫu)
  const oldNotifs = [
    {
      id: 101,
      user: "User B",
      text: "sent a reaction to your post!",
      image:
        "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600",
    },
    {
      id: 102,
      user: "User C",
      text: "sent a reaction to your post!",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
    },
    {
      id: 103,
      user: "User A",
      text: "sent a reaction to your post!",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
    },
  ];

  // Load thông báo từ LocalStorage khi vào trang
  useEffect(() => {
    const storedNotifs =
      JSON.parse(localStorage.getItem("user_notifications")) || [];
    // Đảo ngược mảng để cái mới nhất lên đầu
    setRealNotifs(storedNotifs.reverse());
  }, []);

  return (
    <div className="mobile-wrapper">
      {/* HEADER */}
      <div className="notif-header">
        <Link
          to="/"
          className="btn-icon"
          style={{ color: "#000", fontSize: "24px" }}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <div className="notif-title">Notification</div>
      </div>

      <div className="notif-container">
        {/* PHẦN 1: NEWEST (Dữ liệu thật khi bạn bấm Like) */}
        {realNotifs.length > 0 && (
          <>
            <div className="section-title">Newest</div>
            {realNotifs.map((notif) => (
              <div className="notif-item" key={notif.id}>
                <div className="notif-left">
                  <div className="notif-avatar"></div>{" "}
                  {/* Avatar xám mặc định */}
                  <div className="notif-text">
                    <strong>{notif.user}</strong> {notif.text}
                  </div>
                </div>
                <img src={notif.postImage} alt="Post" className="notif-thumb" />
              </div>
            ))}
          </>
        )}

        {/* PHẦN 2: LAST 30 DAYS (Dữ liệu mẫu) */}
        <div className="section-title">Last 30 days</div>
        {oldNotifs.map((item) => (
          <div className="notif-item" key={item.id}>
            <div className="notif-left">
              <div className="notif-avatar"></div>
              <div className="notif-text">
                <strong>{item.user}</strong> {item.text}
              </div>
            </div>
            <img src={item.image} alt="Post" className="notif-thumb" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notification;
