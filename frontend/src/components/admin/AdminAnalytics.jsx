import React, { useEffect, useState } from "react";
import { getAnalytics } from "../../api/admin.api";
import "./AdminAnalytics.css";

/* ================= MOCK FALLBACK ================= */
const MOCK_ANALYTICS = {
  totalUsers: 1250,
  onlineUsers: 134,
  newUsers: 32,
  newPlaces: 8,

  userGrowth: [
    { label: "Sun", value: 5 },
    { label: "Mon", value: 8 },
    { label: "Tue", value: 10 },
    { label: "Wed", value: 12 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 2 },
    { label: "Sat", value: 1 },
  ],

  topRegions: [
    { name: "Ho Chi Minh City", count: 156 },
    { name: "Ha Noi", count: 89 },
    { name: "Da Nang", count: 45 },
    { name: "Can Tho", count: 28 },
  ],
};

const AdminAnalytics = () => {
  const [data, setData] = useState(MOCK_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    fetchAnalytics(selectedDays);
  }, [selectedDays]);

  // ✅ NEW: Listen for place updates from Map Management
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "placeUpdated") {
        console.log("📍 Place updated, refreshing analytics...");
        fetchAnalytics(selectedDays);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [selectedDays]);

  const fetchAnalytics = async (days) => {
    setLoading(true);
    try {
      const res = await getAnalytics(days);

      if (res?.success && res.data) {
        setData({
          ...MOCK_ANALYTICS,
          ...res.data,
        });
      }
    } catch (err) {
      console.warn(`⚠️ Analytics API failed for ${days} days → using mock data`);
    } finally {
      setLoading(false);
    }
  };

  const handleDayFilter = (days) => {
    setSelectedDays(days);
  };

  // ✅ NEW: Manual refresh function
  const handleRefresh = () => {
    fetchAnalytics(selectedDays);
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics">
      {/* ================= HEADER ================= */}
      <div className="analytics-header">
        <h1>Analytics</h1>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* ✅ NEW: Refresh button */}
          <button
            onClick={handleRefresh}
            style={{
              padding: "8px 12px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          >
            🔄 Refresh
          </button>

          <div className="range-filter">
            <button
              className={selectedDays === 7 ? "active" : ""}
              onClick={() => handleDayFilter(7)}
            >
              7 days
            </button>
            <button
              className={selectedDays === 30 ? "active" : ""}
              onClick={() => handleDayFilter(30)}
            >
              30 days
            </button>
          </div>
        </div>
      </div>

      {/* ================= KPI ================= */}
      <div className="kpi-grid">
        <div className="kpi-card users">
          <span>Total Users</span>
          <strong>{data.totalUsers.toLocaleString()}</strong>
        </div>

        <div className="kpi-card online">
          <span>Online Users</span>
          <strong>{data.onlineUsers.toLocaleString()}</strong>
        </div>

        <div className="kpi-card new">
          <span>New Registrations</span>
          <strong>{data.newUsers.toLocaleString()}</strong>
        </div>

        <div className="kpi-card places">
          <span>New Locations</span>
          <strong>{data.newPlaces.toLocaleString()}</strong>
        </div>
      </div>

      {/* ================= USER GROWTH ================= */}
      <div className="chart-card">
        <h3>User Registration Growth</h3>

        <div className="bar-chart">
          {data.userGrowth?.map((item) => (
            <div key={item.label} className="bar-item">
              <div
                className="bar"
                style={{ height: `${item.value}px` }}
                title={item.value}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= TOP REGIONS ================= */}
      <div className="table-card">
        <h3>Most Active Regions</h3>

        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Active Users</th>
            </tr>
          </thead>
          <tbody>
            {data.topRegions?.map((region, index) => (
              <tr key={index}>
                <td>{region.name}</td>
                <td>{region.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAnalytics;
