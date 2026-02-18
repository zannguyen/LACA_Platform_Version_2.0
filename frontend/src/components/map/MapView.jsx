// src/components/map/MapView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocationAccess } from "../../context/LocationAccessContext";
import { useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
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
import { getPostsAtPoint, getPostHotspots } from "../../api/map.api";

import "./MapView.css";

// Fix Leaflet default icon URLs
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

function HotspotMarker({ position, thumb, count, onOpen }) {
  const icon = useMemo(() => {
    const safeThumb = thumb ? String(thumb).replaceAll('"', "&quot;") : "";

    const html = `
      <div style="
        width: 56px; height: 56px;
        border-radius: 16px;
        overflow: hidden;
        border: 3px solid #fff;
        box-shadow: 0 10px 22px rgba(0,0,0,.28);
        background: #111;
        position: relative;
      ">
        ${
          safeThumb
            ? `<img src="${safeThumb}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;">${count}</div>`
        }

        <div style="
          position:absolute; bottom: -10px; right: -10px;
          width: 28px; height: 28px;
          border-radius: 999px;
          background:#000;
          color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size: 12px;
          font-weight: 700;
          border:2px solid #fff;
        ">${count}</div>
      </div>
    `;

    return L.divIcon({
      className: "",
      html,
      iconSize: [56, 56],
      iconAnchor: [28, 56],
      popupAnchor: [0, -56],
    });
  }, [thumb, count]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onOpen?.(),
      }}
    >
      <Popup>
        <div style={{ width: 180 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Có {count} bài viết
          </div>
          {thumb && (
            <img
              src={thumb}
              alt=""
              style={{ width: "100%", borderRadius: 10, objectFit: "cover" }}
            />
          )}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Bấm marker để mở danh sách bài viết
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

const DEFAULT_CENTER = [16.0544, 108.2208];
const DEFAULT_ZOOM = 13;

const MapView = () => {
  const { enabled: locationEnabled, requestCurrentPosition } =
    useLocationAccess();

  const [searchParams] = useSearchParams();

  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const [hotspots, setHotspots] = useState([]);
  const [hotspotMeta, setHotspotMeta] = useState({ places: 0, total: 0 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosts, setModalPosts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const mapRef = useRef(null);

  const searchRadius = 5000; // meters
  const radiusKm = searchRadius / 1000;

  // ✅ focus target từ Home: /map?lat=..&lng=..&postId=..
  const [focusTarget, setFocusTarget] = useState(null);

  useEffect(() => {
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const postId = searchParams.get("postId");

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setFocusTarget({ lat, lng, postId: postId || null });
    } else {
      setFocusTarget(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationEnabled]);

  const getUserLocation = () => {
    if (!locationEnabled) {
      setUserLocation(null);
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      setNotice(
        "Định vị đang tắt. Bật 'Allow location access' trong Setting để sử dụng Map.",
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    requestCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
      .then((pos) => {
        const loc = [pos.lat, pos.lng];
        setUserLocation(loc);

        // ✅ nếu có focusTarget từ Home thì ưu tiên center theo focus
        if (focusTarget?.lat && focusTarget?.lng) {
          setMapCenter([focusTarget.lat, focusTarget.lng]);
          setMapZoom(17);
        } else {
          setMapCenter(loc);
          setMapZoom(DEFAULT_ZOOM);
        }

        setNotice(null);
        setLoading(false);
      })
      .catch(() => {
        setUserLocation(null);
        setMapCenter(DEFAULT_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        setNotice(
          "Không thể lấy vị trí. Vui lòng bật quyền vị trí trong trình duyệt.",
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    const run = async () => {
      if (!userLocation) {
        setHotspots([]);
        setHotspotMeta({ places: 0, total: 0 });
        return;
      }

      const [lat, lng] = userLocation;

      const result = await getPostHotspots(lat, lng, radiusKm, 30, 80);
      if (!result?.success) {
        setNotice(result?.message || "Không thể lấy hotspots");
        setHotspots([]);
        setHotspotMeta({ places: 0, total: 0 });
        return;
      }

      const rows = result.data?.data || [];
      const total = rows.reduce((s, x) => s + (x.weight || 0), 0);

      setHotspots(rows);
      setHotspotMeta({ places: rows.length, total });
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  const handleRecenterToUser = () => {
    if (!userLocation) return;
    setMapCenter(userLocation);
    setMapZoom(DEFAULT_ZOOM);
  };

  const openPostsModalAt = async (lat, lng) => {
    if (!userLocation) {
      setNotice("Vui lòng bật quyền vị trí để xem bài viết");
      return;
    }

    setIsModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalPosts([]);

    try {
      const result = await getPostsAtPoint(
        lat,
        lng,
        userLocation[0],
        userLocation[1],
      );

      if (result?.success) {
        setModalPosts(result.data?.data || []);
      } else {
        setModalError(result?.message || "Không thể tải bài viết");
      }
    } catch (e) {
      setModalError("Đã xảy ra lỗi khi tải bài viết");
    } finally {
      setModalLoading(false);
    }
  };

  // ✅ auto open modal ngay khi vào map từ Home
  useEffect(() => {
    if (!userLocation) return;
    if (!focusTarget?.lat || !focusTarget?.lng) return;

    // đảm bảo map đã render
    const t = setTimeout(() => {
      openPostsModalAt(focusTarget.lat, focusTarget.lng);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, focusTarget?.lat, focusTarget?.lng]);

  const handleMapClick = async (clickLat, clickLng) => {
    await openPostsModalAt(clickLat, clickLng);
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

        {/* ✅ marker focus từ Home */}
        {focusTarget?.lat && focusTarget?.lng && (
          <Marker position={[focusTarget.lat, focusTarget.lng]}>
            <Popup>
              <div style={{ fontWeight: 700 }}>Vị trí bài đăng</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {focusTarget.postId ? `postId: ${focusTarget.postId}` : ""}
              </div>
            </Popup>
          </Marker>
        )}

        {hotspots.map((h) => (
          <HotspotMarker
            key={h.placeId || `${h.lat},${h.lng}`}
            position={[h.lat, h.lng]}
            thumb={h.thumb}
            count={h.weight || 1}
            onOpen={() => openPostsModalAt(h.lat, h.lng)}
          />
        ))}

        {userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={searchRadius}
              pathOptions={{
                fillColor: "#4CAF50",
                fillOpacity: 0.08,
                color: "#4CAF50",
                weight: 2,
                opacity: 0.4,
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
          onClick={() => userLocation && setUserLocation([...userLocation])}
          title="Tải lại hotspots"
          disabled={!userLocation}
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

      <div className="checkin-count">
        {hotspotMeta.places} điểm • {hotspotMeta.total} bài viết trong bán kính{" "}
        {radiusKm}km
      </div>

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
