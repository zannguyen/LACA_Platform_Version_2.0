// src/pages/CameraPost/CameraPost.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./camera_post.css";

import { uploadMedia, createPost } from "../../api/postApi";
import { suggestPlaces, resolvePlace } from "../../api/place.api";

const DEFAULT_CENTER = { lat: 10.8231, lng: 106.6297 }; // fallback HCM

// ✅ unwrap mọi kiểu response để lấy PLACE DOC chuẩn: {_id, name, address, ...}
function unwrapPlace(res) {
  // res có thể là:
  // A) { success:true, data: placeDoc }
  // B) { success:true, data: { success:true, data: placeDoc } }
  // C) axios raw: { data: { success:true, data: placeDoc } }
  const root = res?.data ?? res; // nếu bạn truyền axios raw hoặc wrapper
  if (!root) return null;

  // case A: root = {success, data: placeDoc}
  if (root?.success === true && root?.data && root?.data?._id) return root.data;

  // case B: root.data = {success, data: placeDoc}
  if (root?.data?.success === true && root?.data?.data?._id)
    return root.data.data;

  // case: root = placeDoc
  if (root?._id) return root;

  return null;
}

// ✅ unwrap list suggestion (tùy shape)
function unwrapSuggestions(res) {
  const root = res?.data ?? res;
  if (!root) return [];
  // phổ biến: {success:true, data:[...]}
  if (root?.success === true && Array.isArray(root?.data)) return root.data;
  // wrapper kiểu: {success:true, data:{success:true, data:[...]}}
  if (root?.data?.success === true && Array.isArray(root?.data?.data))
    return root.data.data;
  // trực tiếp array
  if (Array.isArray(root)) return root;
  return [];
}

// ✅ lấy GPS “best accuracy” trong vài giây
function getBestPosition({ timeoutMs = 6500, desiredAccuracy = 30 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Geolocation not supported"));

    let best = null;
    let done = false;
    let watchId = null;

    const finish = (ok) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      ok ? resolve(best) : reject(new Error("Cannot get location"));
    };

    const onSuccess = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const candidate = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy || 0),
      };

      if (!best || (candidate.accuracy && candidate.accuracy < best.accuracy)) {
        best = candidate;
      }

      if (best?.accuracy && best.accuracy <= desiredAccuracy) finish(true);
    };

    const onError = () => finish(false);

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });

    const timer = setTimeout(() => {
      if (best) finish(true);
      else finish(false);
    }, timeoutMs);
  });
}

export default function CameraPost() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [mediaType, setMediaType] = useState("image"); // image|video
  const [fileBlob, setFileBlob] = useState(null);

  const [caption, setCaption] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [timerValue, setTimerValue] = useState("unlimited");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ====== LOCATION UI ======
  const [locOpen, setLocOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [coords, setCoords] = useState(null); // {lat,lng,accuracy}
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [pickedPlace, setPickedPlace] = useState(null); // placeDoc
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customCategory, setCustomCategory] = useState("other");

  // preview url từ blob/file
  const previewUrl = useMemo(() => {
    if (!fileBlob) return null;
    return URL.createObjectURL(fileBlob);
  }, [fileBlob]);

  useEffect(() => {
    if (!state?.fileBlob || !state?.mediaType) {
      alert("Không tìm thấy dữ liệu! Vui lòng quay lại Camera.");
      navigate("/camera");
      return;
    }
    setMediaType(state.mediaType);
    setFileBlob(state.fileBlob);
  }, [state, navigate]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDownload = () => {
    if (!fileBlob) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `laca_${Date.now()}.${mediaType === "video" ? "webm" : "png"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ====== LOCATION actions ======
  const openLocationSheet = async () => {
    setLocOpen(true);
    if (!coords && !gpsLoading) {
      await refreshGpsAndSuggest();
    }
  };

  const refreshGpsAndSuggest = async () => {
    setGpsLoading(true);
    setGpsError("");
    setSuggestLoading(true);
    setSuggestions([]);

    try {
      const pos = await getBestPosition({
        timeoutMs: 6500,
        desiredAccuracy: 30,
      });
      setCoords(pos);

      const sRes = await suggestPlaces(pos.lat, pos.lng, 250, 12);
      const list = unwrapSuggestions(sRes);
      setSuggestions(list);
    } catch (e) {
      setCoords({ ...DEFAULT_CENTER, accuracy: null });
      setGpsError(
        "Không lấy được GPS. Hãy bật quyền vị trí trong trình duyệt (Site settings) rồi thử lại.",
      );
    } finally {
      setGpsLoading(false);
      setSuggestLoading(false);
    }
  };

  const onPickSuggestion = async (item) => {
    try {
      const lat = Number(item.lat);
      const lng = Number(item.lng);

      const payload = {
        lat,
        lng,
        name: item.name,
        address: item.address,
        category: item.category || "other",
        providerId: item.providerId || null,
      };

      const r = await resolvePlace(payload);
      const placeDoc = unwrapPlace(r);

      if (!placeDoc?._id) {
        alert(
          r?.message ||
            r?.error?.message ||
            "Không thể chọn địa điểm (resolve failed)",
        );
        return;
      }

      setPickedPlace(placeDoc);
      setLocOpen(false);
    } catch (e) {
      alert(e?.message || "Không thể chọn địa điểm");
    }
  };

  const onUseCurrentPoint = async () => {
    if (!coords) return;
    try {
      const r = await resolvePlace({ lat: coords.lat, lng: coords.lng });
      const placeDoc = unwrapPlace(r);

      if (!placeDoc?._id) {
        alert(
          r?.message ||
            r?.error?.message ||
            "Không thể resolve vị trí hiện tại",
        );
        return;
      }

      setPickedPlace(placeDoc);
      setLocOpen(false);
    } catch (e) {
      alert(e?.message || "Không thể resolve vị trí hiện tại");
    }
  };

  const onCreateCustomPlace = async () => {
    if (!coords) return;
    if (!customName.trim() || !customAddress.trim()) {
      alert("Vui lòng nhập tên & địa chỉ");
      return;
    }

    try {
      const r = await resolvePlace({
        lat: coords.lat,
        lng: coords.lng,
        name: customName.trim(),
        address: customAddress.trim(),
        category: customCategory,
      });

      const placeDoc = unwrapPlace(r);

      if (!placeDoc?._id) {
        alert(r?.message || r?.error?.message || "Không thể tạo địa điểm");
        return;
      }

      setPickedPlace(placeDoc);
      setLocOpen(false);
    } catch (e) {
      alert(e?.message || "Không thể tạo địa điểm");
    }
  };

  // ====== POST ======
  const handlePost = async () => {
    if (!fileBlob) return;

    // ✅ nếu chưa có place -> mở chọn vị trí (đây là lý do bạn thấy bị “lặp”)
    if (!pickedPlace?._id) {
      setError("Bạn cần chọn vị trí trước khi đăng bài.");
      setLocOpen(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1) upload
      const up = await uploadMedia(fileBlob);
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL");

      // 2) create post
      await createPost({
        content: caption,
        type: mediaType,
        mediaUrl: [url],
        placeId: pickedPlace._id, // ✅ QUAN TRỌNG
        // timerValue: nếu backend có expireAt thì map ở đây
      });

      navigate("/home");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Đăng bài thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-wrapper" style={{ background: "#000" }}>
      <div className="photo-container">
        {previewUrl &&
          (mediaType === "video" ? (
            <video
              id="preview-video"
              src={previewUrl}
              autoPlay
              loop
              playsInline
              muted
            />
          ) : (
            <img id="preview-img" src={previewUrl} alt="Preview" />
          ))}
      </div>

      <div className="review-header">
        <Link to="/camera" className="btn-icon">
          <i className="fa-solid fa-xmark"></i>
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* LOCATION */}
          <button
            type="button"
            className="btn-icon"
            onClick={openLocationSheet}
            disabled={loading}
            title="Chọn vị trí"
            style={{ color: pickedPlace ? "#2bd0d0" : "white" }}
          >
            <i className="fa-solid fa-location-dot"></i>
          </button>

          {/* TIMER */}
          <div className="timer-wrapper">
            <div
              className="timer-btn"
              onClick={() => setShowTimer(!showTimer)}
              style={{ color: timerValue === "24h" ? "#2bd0d0" : "white" }}
            >
              <i className="fa-regular fa-clock"></i>
            </div>

            <div className={`timer-dropdown ${showTimer ? "show" : ""}`}>
              <div
                className={`timer-option ${timerValue === "unlimited" ? "active" : ""}`}
                onClick={() => {
                  setTimerValue("unlimited");
                  setShowTimer(false);
                }}
              >
                <i className="fa-solid fa-infinity"></i> Unlimited
              </div>
              <div
                className={`timer-option ${timerValue === "24h" ? "active" : ""}`}
                onClick={() => {
                  setTimerValue("24h");
                  setShowTimer(false);
                }}
              >
                <i className="fa-solid fa-hourglass-half"></i> 24 Hours
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HIỂN THỊ PLACE */}
      <div style={{ padding: "8px 12px", color: "white", fontSize: 13 }}>
        {pickedPlace ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#2bd0d0" }}>
              <i className="fa-solid fa-location-dot"></i> {pickedPlace.name}
            </span>
            <span style={{ opacity: 0.8 }}>{pickedPlace.address}</span>
          </div>
        ) : (
          <span style={{ opacity: 0.7 }}></span>
        )}
      </div>

      <div className="caption-wrapper">
        <input
          type="text"
          className="caption-input"
          placeholder={
            mediaType === "video" ? "Mô tả video..." : "Viết chú thích..."
          }
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <div
          style={{ color: "tomato", padding: "8px 12px", textAlign: "center" }}
        >
          {error}
        </div>
      )}

      <div className="review-footer">
        <button
          className="btn-icon-footer"
          onClick={handleDownload}
          disabled={loading}
        >
          <i className="fa-solid fa-download"></i>
        </button>

        {/* ✅ NÚT ĐĂNG */}
        <button className="send-btn" onClick={handlePost} disabled={loading}>
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>

      {/* LOCATION SHEET */}
      {locOpen && (
        <div
          onClick={() => setLocOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "#111",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 14,
              maxHeight: "75vh",
              overflow: "auto",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                Chọn vị trí đăng
              </div>
              <button
                type="button"
                onClick={() => setLocOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={refreshGpsAndSuggest}
                disabled={gpsLoading || suggestLoading}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#1b1b1b",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {gpsLoading ? "Đang lấy GPS..." : "Refresh GPS & gợi ý"}
              </button>

              <button
                type="button"
                onClick={onUseCurrentPoint}
                disabled={!coords}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(43,208,208,0.4)",
                  background: "#0f2020",
                  color: "#2bd0d0",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Dùng điểm hiện tại
              </button>
            </div>

            {coords && (
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                {coords.accuracy ? ` • ±${coords.accuracy}m` : ""}
              </div>
            )}

            {gpsError && (
              <div style={{ marginTop: 10, color: "tomato", fontSize: 13 }}>
                {gpsError}
              </div>
            )}

            <div style={{ marginTop: 14, fontWeight: 700 }}>Gợi ý gần bạn</div>

            {suggestLoading ? (
              <div style={{ padding: "12px 0", opacity: 0.8 }}>
                Đang tải gợi ý...
              </div>
            ) : suggestions.length ? (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {suggestions.map((p, idx) => (
                  <button
                    key={`${p.providerId || "db"}-${idx}`}
                    type="button"
                    onClick={() => onPickSuggestion(p)}
                    style={{
                      textAlign: "left",
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "#161616",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span>
                        <i
                          className="fa-solid fa-location-dot"
                          style={{ color: "#2bd0d0" }}
                        ></i>{" "}
                        {p.name}
                      </span>
                      {p.distanceMeters !== undefined && (
                        <span style={{ opacity: 0.7, fontWeight: 500 }}>
                          {p.distanceMeters}m
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 13, opacity: 0.8 }}>
                      {p.address}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: "12px 0", opacity: 0.75 }}>
                Không có gợi ý. Bạn có thể “Dùng điểm hiện tại” hoặc tạo địa
                điểm mới bên dưới.
              </div>
            )}

            <div style={{ marginTop: 16, fontWeight: 700 }}>
              Tạo địa điểm mới (nếu không có trong gợi ý)
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Tên địa điểm (vd: Quán cà phê A)"
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#0f0f0f",
                  color: "white",
                }}
              />
              <input
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="Địa chỉ (vd: 12 Nguyễn Trãi, Q1)"
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#0f0f0f",
                  color: "white",
                }}
              />

              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#0f0f0f",
                  color: "white",
                }}
              >
                <option value="cafe">cafe</option>
                <option value="restaurant">restaurant</option>
                <option value="bar">bar</option>
                <option value="shop">shop</option>
                <option value="park">park</option>
                <option value="museum">museum</option>
                <option value="hotel">hotel</option>
                <option value="other">other</option>
              </select>

              <button
                type="button"
                onClick={onCreateCustomPlace}
                disabled={!coords}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "1px solid rgba(43,208,208,0.45)",
                  background: "#0f2020",
                  color: "#2bd0d0",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Tạo & chọn địa điểm này
              </button>
            </div>

            <div style={{ height: 10 }} />
          </div>
        </div>
      )}
    </div>
  );
}
