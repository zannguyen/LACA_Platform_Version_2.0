import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const MapMarker = ({ checkIn, onClick, isSelected }) => {
  const { location, user, photos } = checkIn;
  const position = [location.latitude, location.longitude];

  // Tạo custom icon
  const createCustomIcon = () => {
    const iconSize = isSelected ? [40, 50] : [32, 40];
    const iconColor = isSelected ? "#4CAF50" : "#FF6B6B";

    const iconHtml = `
      <div style="
        position: relative;
        width: ${iconSize[0]}px;
        height: ${iconSize[1]}px;
      ">
        <!-- Shadow -->
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: ${iconSize[0] * 0.5}px;
          height: ${iconSize[1] * 0.15}px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 50%;
          filter: blur(2px);
        "></div>
        
        <!-- Pin -->
        <svg width="${iconSize[0]}" height="${iconSize[1]}" viewBox="0 0 32 40" fill="none">
          <path 
            d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" 
            fill="${iconColor}"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
          />
          <circle cx="16" cy="16" r="8" fill="white"/>
          
          ${
            photos && photos.length > 0
              ? `
            <!-- Photo indicator -->
            <circle cx="16" cy="16" r="6" fill="${iconColor}"/>
            <text x="16" y="18" text-anchor="middle" font-size="8" fill="white" font-weight="bold">
              ${photos.length}
            </text>
          `
              : `
            <!-- Default dot -->
            <circle cx="16" cy="16" r="4" fill="${iconColor}"/>
          `
          }
        </svg>
        
        ${
          isSelected
            ? `
          <!-- Pulse animation -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: ${iconColor};
            opacity: 0;
            animation: pulse 2s infinite;
          "></div>
          <style>
            @keyframes pulse {
              0% {
                transform: scale(1);
                opacity: 0.5;
              }
              50% {
                transform: scale(1.5);
                opacity: 0;
              }
              100% {
                transform: scale(1);
                opacity: 0;
              }
            }
          </style>
        `
            : ""
        }
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "custom-marker",
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1]], // Anchor ở đáy pin
      popupAnchor: [0, -iconSize[1]], // Popup hiện phía trên
    });
  };

  return (
    <Marker
      position={position}
      icon={createCustomIcon()}
      eventHandlers={{
        click: () => onClick(checkIn),
      }}
    >
      <Popup>
        <div className="marker-popup">
          <div className="popup-header">
            <img
              src={user.avatar || "/default-avatar.png"}
              alt={user.name}
              className="popup-avatar"
            />
            <div className="popup-user-info">
              <p className="popup-username">{user.name}</p>
              <p className="popup-location-name">{location.name}</p>
            </div>
          </div>

          {photos && photos.length > 0 && (
            <div className="popup-photo-preview">
              <img src={photos[0].url} alt="Check-in" className="popup-photo" />
              {photos.length > 1 && (
                <div className="popup-photo-count">+{photos.length - 1}</div>
              )}
            </div>
          )}

          <button className="popup-view-btn">Xem chi tiết</button>
        </div>
      </Popup>
    </Marker>
  );
};

export default MapMarker;

// CSS inline styles (thêm vào MapView.css)
const styles = `
.custom-marker {
  background: transparent !important;
  border: none !important;
}

.marker-popup {
  min-width: 200px;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.popup-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.popup-user-info {
  flex: 1;
}

.popup-username {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
  color: #333;
}

.popup-location-name {
  font-size: 12px;
  margin: 2px 0 0 0;
  color: #666;
}

.popup-photo-preview {
  position: relative;
  margin-bottom: 10px;
}

.popup-photo {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}

.popup-photo-count {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.popup-view-btn {
  width: 100%;
  padding: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.popup-view-btn:hover {
  transform: scale(1.05);
}

.popup-view-btn:active {
  transform: scale(0.95);
}
`;

// Export styles để thêm vào MapView.css
export { styles as markerStyles };
