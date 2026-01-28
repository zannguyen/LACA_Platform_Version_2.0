import React, { useState, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
import PhotoCarousel from "./PhotoCarousel";
import "./CheckInBottomSheet.css";

const CheckInBottomSheet = ({ checkIn, isOpen, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  // Animation spring
  const [{ y }, api] = useSpring(() => ({
    y: window.innerHeight,
  }));

  useEffect(() => {
    if (isOpen) {
      api.start({ y: 0 });
    } else {
      api.start({ y: window.innerHeight });
    }
  }, [isOpen, api]);

  // Touch handlers for swipe down to close
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
      api.start({ y: deltaY, immediate: true });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentY > 150) {
      // Swipe down threshold
      onClose();
    } else {
      // Snap back
      api.start({ y: 0 });
    }
    setCurrentY(0);
  };

  if (!checkIn) return null;

  const { user, location, photos, description, timestamp } = checkIn;

  // Format timestamp
  const formatTime = (time) => {
    const now = new Date();
    const checkInTime = new Date(time);
    const diffMs = now - checkInTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return checkInTime.toLocaleDateString("vi-VN");
  };

  return (
    <>
      {/* Backdrop */}
      <animated.div
        className={`bottomsheet-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        style={{
          opacity: y.to([0, window.innerHeight], [0.5, 0]),
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Bottom Sheet */}
      <animated.div
        className="bottomsheet-container"
        style={{
          transform: y.to((val) => `translateY(${val}px)`),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="bottomsheet-handle">
          <div className="handle-bar" />
        </div>

        {/* Content */}
        <div className="bottomsheet-content">
          {/* Header */}
          <div className="bottomsheet-header">
            <div className="header-user">
              <img
                src={user.avatar || "/default-avatar.png"}
                alt={user.name}
                className="user-avatar"
              />
              <div className="user-info">
                <h3 className="user-name">{user.name}</h3>
                <p className="checkin-time">{formatTime(timestamp)}</p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Location */}
          <div className="bottomsheet-location">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="location-name">{location.name}</span>
          </div>

          {/* Description */}
          {description && (
            <div className="bottomsheet-description">
              <p>{description}</p>
            </div>
          )}

          {/* Photo Carousel */}
          {photos && photos.length > 0 && (
            <div className="bottomsheet-photos">
              <PhotoCarousel photos={photos} checkInId={checkIn.id} />
            </div>
          )}

          {/* Actions */}
          <div className="bottomsheet-actions">
            <button className="action-btn">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Bình luận
            </button>
            <button className="action-btn">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98m-.01-10.98-6.82 3.98" />
              </svg>
              Chia sẻ
            </button>
          </div>
        </div>
      </animated.div>
    </>
  );
};

export default CheckInBottomSheet;
