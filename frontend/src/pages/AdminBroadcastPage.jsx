// frontend/src/pages/AdminBroadcastPage.jsx
import React, { useState } from "react";
import BroadcastNotification from "../components/admin/BroadcastNotification";
import BroadcastHistory from "../components/admin/BroadcastHistory";

export default function AdminBroadcastPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBroadcastSent = (broadcast) => {
    // Trigger refresh of broadcast history
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ padding: "24px 0" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 24px 24px 24px", color: "#333" }}>
            📢 Broadcast Notifications
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "0 24px 24px 24px" }}>
          <BroadcastNotification onBroadcastSent={handleBroadcastSent} />
          <BroadcastHistory refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
