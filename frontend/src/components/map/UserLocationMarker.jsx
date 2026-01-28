import React from "react";
import { Marker, Circle } from "react-leaflet";
import L from "leaflet";

const UserLocationMarker = ({ position }) => {
  // Tạo custom icon cho vị trí user
  const createUserIcon = () => {
    const iconHtml = `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pulse animation ring -->
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #2196F3;
          opacity: 0;
          animation: userPulse 2s infinite;
        "></div>
        
        <!-- Outer ring -->
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        "></div>
        
        <!-- Inner blue dot -->
        <div style="
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2196F3;
          box-shadow: 0 2px 4px rgba(33, 150, 243, 0.4);
        "></div>
        
        <!-- Center white dot -->
        <div style="
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: white;
        "></div>
        
        <style>
          @keyframes userPulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
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
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: "user-location-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20], // Center anchor
    });
  };

  return (
    <>
      {/* Accuracy circle */}
      <Circle
        center={position}
        radius={50} // Độ chính xác ~50m
        pathOptions={{
          fillColor: "#2196F3",
          fillOpacity: 0.1,
          color: "#2196F3",
          weight: 1,
          opacity: 0.3,
        }}
      />

      {/* User marker */}
      <Marker position={position} icon={createUserIcon()} />
    </>
  );
};

export default UserLocationMarker;

// CSS cho marker (thêm vào MapView.css)
const styles = `
.user-location-marker {
  background: transparent !important;
  border: none !important;
  z-index: 1000 !important;
}
`;

export { styles as userMarkerStyles };
