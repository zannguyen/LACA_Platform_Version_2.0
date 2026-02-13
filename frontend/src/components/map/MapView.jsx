import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import UserLocationMarker from "./UserLocationMarker";
import PostsModal from "./PostsModal";
import { getPostsAtPoint } from "../../api/map.api";
import "./MapView.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function FixLeafletSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

const DEFAULT_CENTER = [16.0544, 108.2208]; // Đà Nẵng
const DEFAULT_ZOOM = 13;

const MapView = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  // Posts modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosts, setModalPosts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const mapRef = useRef(null);
  const searchRadius = 5000;

  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setNotice(
        "Trình duyệt không hỗ trợ định vị. Map hiển thị vị trí mặc định.",
      );
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = [latitude, longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(DEFAULT_ZOOM);
        setNotice(null);
        setLoading(false);
      },
      (err) => {
        console.warn("Geolocation bị từ chối / lỗi:", err);

        setUserLocation(null);
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);

        if (err.code === 1) {
          setNotice(
            "Bạn chưa bật quyền vị trí. Map đang hiển thị vị trí mặc định.",
          );
        } else {
          setNotice(
            "Không lấy được vị trí. Map đang hiển thị vị trí mặc định.",
          );
        }

        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleRecenterToUser = () => {
    if (!userLocation) return;
    setMapCenter(userLocation);
    setMapZoom(DEFAULT_ZOOM);
  };

  const handleMapClick = async (clickLat, clickLng) => {
    if (!userLocation) {
      setNotice("Vui lòng bật quyền vị trí để xem bài viết");
      return;
    }

    // Open modal and start loading
    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalPosts([]);

    try {
      const result = await getPostsAtPoint(
        clickLat,
        clickLng,
        userLocation[0],
        userLocation[1],
      );

      if (result.success) {
        setModalPosts(result.data.data || []);
      } else {
        setModalError(result.message);
      }
    } catch (error) {
      setModalError("Đã xảy ra lỗi khi tải bài viết");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalPosts([]);
    setModalError(null);
  };

  if (loading) {
    return (
      <div className="map-loading">
        <div className="spinner" />
        <p>Đang tải bản đồ...</p>
      </div>
    );
  }

  return (
    <div className="map-view-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="map-container"
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={false}
      >
        <FixLeafletSize />
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <MapClickHandler onMapClick={handleMapClick} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={searchRadius}
              pathOptions={{
                fillColor: "#4CAF50",
                fillOpacity: 0.1,
                color: "#4CAF50",
                weight: 2,
                opacity: 0.5,
              }}
            />
            <UserLocationMarker position={userLocation} />
          </>
        )}
      </MapContainer>

      <div className="map-controls">
        <button
          className="recenter-btn"
          onClick={handleRecenterToUser}
          disabled={!userLocation}
          title={!userLocation ? "Chưa có vị trí" : "Về vị trí của bạn"}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        <button
          className="refresh-btn"
          disabled
          title="Chưa có backend check-in"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      </div>

      {notice && (
        <div className="notice-banner">
          <p>{notice}</p>
        </div>
      )}

      <div className="checkin-count">0 địa điểm trong bán kính 5km</div>

      <PostsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        posts={modalPosts}
        loading={modalLoading}
        error={modalError}
      />
    </div>
  );
};

export default MapView;
