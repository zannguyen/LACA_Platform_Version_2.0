import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

export default function HotspotMarker({ position, thumb, count, onClick }) {
  const icon = useMemo(() => {
    const html = `
      <div style="
        width: 54px; height: 54px;
        border-radius: 14px;
        overflow: hidden;
        border: 3px solid #fff;
        box-shadow: 0 8px 18px rgba(0,0,0,.25);
        background: #111;
        position: relative;
      ">
        ${
          thumb
            ? `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${count}</div>`
        }
        <div style="
          position:absolute; bottom: -8px; right: -8px;
          width: 26px; height: 26px;
          border-radius: 999px;
          background:#000;
          color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size: 12px;
          border:2px solid #fff;
        ">${count}</div>
      </div>
    `;

    return L.divIcon({
      className: "",
      html,
      iconSize: [54, 54],
      iconAnchor: [27, 54],
      popupAnchor: [0, -54],
    });
  }, [thumb, count]);

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(),
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
