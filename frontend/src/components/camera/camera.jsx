// src/pages/camera/camera.jsx
import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./camera.css";

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [facingMode, setFacingMode] = useState("user");
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const longPressTriggered = useRef(false);

  const stopStreamTracks = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

  const startCamera = async () => {
    stopStreamTracks();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode,
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Lỗi Camera:", err);
      // fallback video-only
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode },
        });
        if (videoRef.current) videoRef.current.srcObject = videoOnly;
      } catch (e) {
        console.error("Không thể mở cam:", e);
      }
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopStreamTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const startRecording = () => {
    const stream = videoRef.current?.srcObject;
    if (!stream) return;

    setIsRecording(true);
    longPressTriggered.current = true;
    chunksRef.current = [];

    let recorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      navigate("/camera-post", {
        state: { mediaType: "video", fileBlob: blob },
      });
    };

    recorder.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    // reset transform mỗi lần chụp để tránh bị lật sai sau nhiều lần
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      navigate("/camera-post", {
        state: { mediaType: "image", fileBlob: blob },
      });
    }, "image/png");
  };

  const handlePressStart = () => {
    longPressTriggered.current = false;
    timerRef.current = setTimeout(() => startRecording(), 500);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (longPressTriggered.current) stopRecording();
    else takePhoto();
  };

  const handleRotate = () =>
    setFacingMode((p) => (p === "user" ? "environment" : "user"));

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith("video") ? "video" : "image";
    navigate("/camera-post", { state: { mediaType, fileBlob: file } });

    // reset input để chọn lại cùng file vẫn trigger onChange
    event.target.value = "";
  };

  const handleBack = () => {
    // ✅ quay lại trang trước, không về "/"
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  return (
    <div className="camera-wrapper">
      <div className="camera-view">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isRecording}
          className={facingMode === "environment" ? "environment" : ""}
        />

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*,video/*"
          onChange={handleFileChange}
        />

        {isRecording && (
          <div className="recording-timer">
            <div className="recording-dot"></div> REC
          </div>
        )}
      </div>

      <div className="controls">
        {/* ✅ Back đúng */}
        <button className="btn-icon" onClick={handleBack}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>

        <button className="btn-icon" onClick={handleUploadClick}>
          <i className="fa-regular fa-image"></i>
        </button>

        <button
          className={`shutter-btn ${isRecording ? "recording" : ""}`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          <span className="shutter-inner"></span>
        </button>

        <button className="btn-icon" onClick={handleRotate}>
          <i className="fa-solid fa-rotate"></i>
        </button>
      </div>
    </div>
  );
};

export default Camera;
