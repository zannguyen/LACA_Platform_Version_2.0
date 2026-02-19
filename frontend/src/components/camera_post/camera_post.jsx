// src/pages/CameraPost/CameraPost.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./camera_post.css";

import { uploadMedia, createPost } from "../../api/postApi";
import { suggestPlaces, resolvePlace } from "../../api/place.api";

// ✅ unwrap mọi kiểu response để lấy PLACE DOC chuẩn: {_id, name, address, ...}
function unwrapPlace(res) {
  const root = res?.data ?? res;
  if (!root) return null;

  if (root?.success === true && root?.data && root?.data?._id) return root.data;
  if (root?.data?.success === true && root?.data?.data?._id)
    return root.data.data;
  if (root?._id) return root;

  return null;
}

// ✅ unwrap list suggestion (tùy shape)
function unwrapSuggestions(res) {
  const root = res?.data ?? res;
  if (!root) return [];
  if (root?.success === true && Array.isArray(root?.data)) return root.data;
  if (root?.data?.success === true && Array.isArray(root?.data?.data))
    return root.data.data;
  if (Array.isArray(root)) return root;
  return [];
}

/**
 * ✅ Best GPS (high accuracy) trong một khoảng thời gian.
 * - Dùng watchPosition để lấy nhiều mẫu
 * - Chọn mẫu accuracy nhỏ nhất
 * - Nếu đạt desiredAccuracy thì trả về sớm
 *
 * Lưu ý: 5-10m trong nhà thường KHÓ đạt. Mình để mặc định desiredAccuracy=20,
 * bạn có thể chỉnh 10 nếu muốn "gắt" hơn (nhưng sẽ hay fail trong nhà).
 */
function getBestPosition({
  timeoutMs = 12000,
  desiredAccuracy = 20,
  maxAgeMs = 0,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Geolocation not supported"));

    let best = null;
    let done = false;
    let watchId = null;

    const finish = (ok) => {
      if (done) return;
      done = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (ok && best) resolve(best);
      else reject(new Error("Cannot get accurate location"));
    };

    const onSuccess = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords || {};
      const candidate = {
        lat: Number(latitude),
        lng: Number(longitude),
        accuracy: Math.round(Number(accuracy || 0)),
        ts: Date.now(),
      };

      if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng))
        return;

      if (!best || (candidate.accuracy && candidate.accuracy < best.accuracy)) {
        best = candidate;
      }

      if (best?.accuracy && best.accuracy <= desiredAccuracy) finish(true);
    };

    const onError = () => finish(false);

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: maxAgeMs,
      timeout: 10000,
    });

    // hard timeout
    const timer = setTimeout(() => {
      // nếu có best thì trả về best (dù chưa đạt desiredAccuracy)
      // nhưng: mình vẫn trả best để user biết accuracy hiện tại
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

  // ====== LOCATION SHEET (NEW UI) ======
  const [locOpen, setLocOpen] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [coords, setCoords] = useState(null); // {lat,lng,accuracy}

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [pickedPlace, setPickedPlace] = useState(null); // placeDoc

  // create place section
  const [createOpen, setCreateOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customCategory, setCustomCategory] = useState("other");
  const [createLoading, setCreateLoading] = useState(false);

  // ✅ radius gợi ý (m) — bạn muốn gần => để nhỏ
  const SUGGEST_RADIUS_METERS = 30; // 20-40m là hợp lý
  const SUGGEST_LIMIT = 12;

  // ✅ desired accuracy mục tiêu (m)
  const DESIRED_ACCURACY = 20; // nếu muốn “gắt” hơn: 10 (nhưng dễ fail trong nhà)

  // để tránh spam refresh liên tục
  const lastScanAtRef = useRef(0);

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
    setCreateOpen(false);

    // mở sheet: nếu chưa có GPS thì scan luôn
    if (!coords && !gpsLoading) {
      await scanGpsAndSuggest();
    }
  };

  /**
   * ✅ Scan GPS + Suggest
   * - KHÔNG set fallback coords khi fail (để tránh “Gia Lai”)
   * - nếu accuracy xấu thì vẫn show coords + accuracy, user bấm scan lại
   */
  const scanGpsAndSuggest = async () => {
    const now = Date.now();
    if (now - lastScanAtRef.current < 800) return; // debounce nhẹ
    lastScanAtRef.current = now;

    setGpsLoading(true);
    setGpsError("");
    setSuggestLoading(true);
    setSuggestions([]);

    try {
      const pos = await getBestPosition({
        timeoutMs: 12000,
        desiredAccuracy: DESIRED_ACCURACY,
        maxAgeMs: 0,
      });

      setCoords(pos);

      // gọi suggest gần (radius nhỏ)
      const sRes = await suggestPlaces(
        pos.lat,
        pos.lng,
        SUGGEST_RADIUS_METERS,
        SUGGEST_LIMIT,
      );
      const list = unwrapSuggestions(sRes);
      setSuggestions(list);
    } catch (e) {
      // ✅ quan trọng: không set fallback coords
      setCoords(null);
      setSuggestions([]);
      setGpsError(
        "Không lấy được GPS chính xác. Hãy bật quyền vị trí, ra nơi thoáng hơn và bấm quét lại.",
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
      setCreateOpen(false);
    } catch (e) {
      alert(e?.message || "Không thể chọn địa điểm");
    }
  };

  const toggleCreate = async () => {
    const next = !createOpen;
    setCreateOpen(next);

    // mở create: tự scan GPS nếu chưa có
    if (next && !coords && !gpsLoading) {
      await scanGpsAndSuggest();
    }
  };

  const onCreateCustomPlace = async () => {
    // ✅ BẮT BUỘC có GPS thật — không fallback
    if (!coords) {
      setGpsError("Bạn cần quét GPS trước khi tạo vị trí.");
      await scanGpsAndSuggest();
      return;
    }

    // nếu accuracy quá tệ thì cảnh báo
    if (coords?.accuracy && coords.accuracy > 50) {
      const ok = window.confirm(
        `GPS đang yếu (±${coords.accuracy}m). Tạo vị trí có thể sai lệch. Bạn có muốn quét lại không?`,
      );
      if (ok) {
        await scanGpsAndSuggest();
        return;
      }
    }

    if (!customName.trim() || !customAddress.trim()) {
      alert("Vui lòng nhập tên & địa chỉ");
      return;
    }

    setCreateLoading(true);
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
      setCreateOpen(false);
    } catch (e) {
      alert(e?.message || "Không thể tạo địa điểm");
    } finally {
      setCreateLoading(false);
    }
  };

  // ====== POST ======
  const handlePost = async () => {
    if (!fileBlob) return;

    if (!pickedPlace?._id) {
      setError("Bạn cần chọn vị trí trước khi đăng bài.");
      setLocOpen(true);
      setCreateOpen(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const up = await uploadMedia(fileBlob);
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload thành công nhưng không nhận được URL");

      await createPost({
        content: caption,
        type: mediaType,
        mediaUrl: [url],
        placeId: pickedPlace._id,
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
          <span style={{ opacity: 0.7 }} />
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

        <button className="send-btn" onClick={handlePost} disabled={loading}>
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </div>

      {/* ✅ LOCATION SHEET (MOBILE WIDTH) */}
      {locOpen && (
        <div className="loc-overlay" onClick={() => setLocOpen(false)}>
          <div className="loc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="loc-sheet-header">
              <div className="loc-title">Chọn vị trí đăng</div>
              <button
                className="loc-close"
                type="button"
                onClick={() => setLocOpen(false)}
              >
                ×
              </button>
            </div>

            {/* ✅ Suggestions on top */}
            <div className="loc-section">
              <div className="loc-section-title">Gợi ý gần bạn</div>

              {/* ✅ radar row (không show full text dài) */}
              <div className="loc-radar-row">
                <div className="loc-radar-info">
                  {gpsLoading ? (
                    <span className="loc-muted">Đang quét vị trí...</span>
                  ) : coords ? (
                    <span className="loc-muted">
                      Đã quét • độ chính xác{" "}
                      {coords.accuracy ? `±${coords.accuracy}m` : "không rõ"}
                      {" • "}bán kính gợi ý ~{SUGGEST_RADIUS_METERS}m
                    </span>
                  ) : (
                    <span className="loc-muted">
                      Chưa có GPS • bấm quét để tìm gợi ý
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className={`loc-radar-btn ${gpsLoading ? "is-loading" : ""}`}
                  onClick={scanGpsAndSuggest}
                  disabled={gpsLoading || suggestLoading}
                  title="Quét GPS"
                  aria-label="Scan GPS"
                >
                  <span className="loc-radar-dot" />
                  <i className="fa-solid fa-satellite-dish" />
                </button>
              </div>

              {gpsError && <div className="loc-error">{gpsError}</div>}

              {suggestLoading ? (
                <div className="loc-muted" style={{ padding: "10px 0" }}>
                  Đang tải gợi ý...
                </div>
              ) : suggestions.length ? (
                <div className="loc-suggest-list">
                  {suggestions.map((p, idx) => (
                    <button
                      key={`${p.providerId || "db"}-${idx}`}
                      type="button"
                      className="loc-suggest-card"
                      onClick={() => onPickSuggestion(p)}
                    >
                      <div className="loc-suggest-top">
                        <div className="loc-suggest-name">
                          <i className="fa-solid fa-location-dot" /> {p.name}
                        </div>
                        {p.distanceMeters !== undefined && (
                          <div className="loc-suggest-dist">
                            {p.distanceMeters}m
                          </div>
                        )}
                      </div>
                      <div className="loc-suggest-addr">{p.address}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="loc-muted" style={{ padding: "10px 0" }}>
                  Chưa có gợi ý. Hãy bấm quét lại hoặc tạo vị trí mới.
                </div>
              )}
            </div>

            {/* ✅ Create location */}
            <div className="loc-section">
              <div className="loc-section-title">Tạo vị trí</div>

              <button
                type="button"
                className="loc-create-toggle"
                onClick={toggleCreate}
              >
                <span className="loc-plus">+</span> Tạo vị trí
              </button>

              {createOpen && (
                <div className="loc-create-panel">
                  <div className="loc-create-actions">
                    <button
                      type="button"
                      className="loc-btn loc-btn-primary"
                      onClick={scanGpsAndSuggest}
                      disabled={gpsLoading || suggestLoading}
                      title="Quét GPS cho vị trí mới"
                    >
                      <i className="fa-solid fa-crosshairs" />{" "}
                      {gpsLoading ? "Đang quét..." : "Quét GPS"}
                    </button>

                    {coords?.accuracy ? (
                      <div className="loc-accuracy-pill">
                        ±{coords.accuracy}m
                      </div>
                    ) : (
                      <div className="loc-accuracy-pill is-warn">
                        Chưa có GPS
                      </div>
                    )}
                  </div>

                  <div className="loc-form">
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Tên địa điểm (vd: Quán cà phê A)"
                      className="loc-input"
                    />
                    <input
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Địa chỉ (vd: 12 Nguyễn Trãi, Q1)"
                      className="loc-input"
                    />

                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="loc-select"
                    >
                      <option value="cafe">☕ Cafe</option>
                      <option value="restaurant">🍽 Restaurant</option>
                      <option value="bar">💃 Bar</option>
                      <option value="shop">🛍️ Shop</option>
                      <option value="park">🏞 Park</option>
                      <option value="museum">🏛 Museum</option>
                      <option value="hotel">🏩 Hotel</option>
                      <option value="other">Other</option>
                    </select>

                    <button
                      type="button"
                      className="loc-btn loc-btn-success"
                      onClick={onCreateCustomPlace}
                      disabled={createLoading}
                    >
                      {createLoading ? "Đang tạo..." : "Tạo & chọn vị trí này"}
                    </button>

                    <div className="loc-hint">
                      * Vị trí tạo sẽ dùng GPS vừa quét. Nếu GPS yếu, hãy quét
                      lại để chính xác hơn.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
