import React, { useEffect, useState } from "react";
import { getAnalytics } from "../../api/admin.api";
import "./AdminAnalytics.css";

/* ================= MOCK FALLBACK ================= */
const MOCK_ANALYTICS = {
  totalUsers: 12540,
  onlineUsers: 1340,
  newUsers: 320,

  userGrowth: [
    { label: "Mon", value: 120 },
    { label: "Tue", value: 180 },
    { label: "Wed", value: 200 },
    { label: "Thu", value: 200 },
    { label: "Fri", value: 200 },
    { label: "Sat", value: 150 },
    { label: "Sun", value: 90 },
  ],

  topRegions: [
    { name: "Ho Chi Minh City", count: 4200 },
    { name: "Ha Noi", count: 3100 },
    { name: "Da Nang", count: 1800 },
    { name: "Can Tho", count: 950 },
  ],
};

const AdminAnalytics = () => {
  const [data, setData] = useState(MOCK_ANALYTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await getAnalytics();

      if (res?.success && res.data) {
        setData({
          ...MOCK_ANALYTICS,
          ...res.data,
        });
      }
    } catch (err) {
      console.warn("⚠️ Analytics API failed → using mock data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics">
      {/* ================= HEADER ================= */}
      <div className="analytics-header">
        <h1>Analytics</h1>

        <div className="range-filter">
          <button className="active">7 days</button>
          <button>30 days</button>
          <button>Custom</button>
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
