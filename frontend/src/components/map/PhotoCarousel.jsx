import React, { useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import ReactionBar from "./ReactionBar";
import "./PhotoCarousel.css";

const PhotoCarousel = ({ photos, checkInId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const swiperRef = useRef(null);

  const handleSlideChange = (swiper) => {
    setCurrentIndex(swiper.activeIndex);
  };

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="no-photos">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <p>Chưa có ảnh</p>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="photo-carousel">
      {/* Photo counter */}
      <div className="photo-counter">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Swiper */}
      <Swiper
        ref={swiperRef}
        modules={[Pagination, Navigation]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{
          clickable: true,
          dynamicBullets: true,
        }}
        navigation={{
          prevEl: ".swiper-button-prev-custom",
          nextEl: ".swiper-button-next-custom",
        }}
        onSlideChange={handleSlideChange}
        className="photo-swiper"
      >
        {photos.map((photo) => (
          <SwiperSlide key={photo.id}>
            <div
              className={`photo-slide ${isZoomed ? "zoomed" : ""}`}
              onClick={handleImageClick}
            >
              <img
                src={photo.url}
                alt={`Photo ${photo.id}`}
                className="carousel-photo"
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom navigation buttons (only show if > 1 photo) */}
      {photos.length > 1 && (
        <>
          <button className="swiper-button-prev-custom">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button className="swiper-button-next-custom">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Reaction Bar */}
      <ReactionBar
        photoId={currentPhoto.id}
        reactions={currentPhoto.reactions}
        checkInId={checkInId}
      />

      {/* Zoom hint */}
      {!isZoomed && (
        <div className="zoom-hint">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6M8 11h6" />
          </svg>
          Nhấn để phóng to
        </div>
      )}
    </div>
  );
};

export default PhotoCarousel;
