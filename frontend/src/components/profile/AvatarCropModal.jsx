import React, { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import "./AvatarCropModal.css";

// Tạo Image object từ src
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = url;
  });

// Cắt ảnh bằng canvas -> trả về Blob (jpg)
const getCroppedBlob = async (imageSrc, cropPixels) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.92, // chất lượng
    );
  });
};

export default function AvatarCropModal({
  open,
  imageSrc,
  busy = false,
  onCancel,
  onSaveBlob,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedPixels || busy) return;
    const blob = await getCroppedBlob(imageSrc, croppedPixels);
    if (!blob) return;
    onSaveBlob(blob);
  };

  if (!open) return null;

  return (
    <div className="avatar-crop-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="avatar-crop-card" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-crop-title">Chỉnh sửa avatar</div>

        <div className="avatar-crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="avatar-crop-controls">
          <div className="zoom-row">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={busy}
            />
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={busy}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}