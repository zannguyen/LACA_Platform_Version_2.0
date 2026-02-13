import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./AdminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { path: "/admin", icon: "📊", label: "Dashboard", exact: true },
    { path: "/admin/users", icon: "👥", label: "Users" },
    { path: "/admin/content", icon: "🛡️", label: "Content" },
    { path: "/admin/map", icon: "🗺️", label: "Map" },
    { path: "/admin/analytics", icon: "📈", label: "Analytics" },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          ☰
        </button>
        <h1>LACA Admin</h1>
      </div>

      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${isActive(item.path, item.exact) ? "active" : ""}`}
              onClick={() => handleNavClick(item.path)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

     
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
