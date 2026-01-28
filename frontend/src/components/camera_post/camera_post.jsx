// src/pages/CameraPost/CameraPost.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./camera_post.css";
import { uploadMedia, createPost } from "../../api/postApi";

const CameraPost = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [mediaType, setMediaType] = useState("image"); // image|video
  const [fileBlob, setFileBlob] = useState(null);

  const [caption, setCaption] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [timerValue, setTimerValue] = useState("unlimited");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handlePost = async () => {
    if (!fileBlob) return;
    setLoading(true);
    setError("");

    try {
      // 1) upload cloudinary (backend /api/upload)
      const up = await uploadMedia(fileBlob);
      const url = up.secure_url || up.url;

      if (!url) throw new Error("Upload thành công nhưng không nhận được URL");

      // 2) create post (backend /api/posts)
      await createPost({
        content: caption,
        type: mediaType, // "image" | "video"
        mediaUrl: [url], // ✅ đúng mediaUrl trong Post schema
        // timerValue bạn có thể gửi thêm nếu backend hỗ trợ field expireAt
      });

      navigate("/"); // về home xem bài mới
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Đăng bài thất bại");
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
    </div>
  );
};

export default CameraPost;
