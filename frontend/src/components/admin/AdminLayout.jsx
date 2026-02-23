import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./AdminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { path: "/admin", icon: "📊", label: "Dashboard", exact: true },
      { path: "/admin/users", icon: "👥", label: "Users" },
      { path: "/admin/content", icon: "🛡️", label: "Content" },
      { path: "/admin/map", icon: "🗺️", label: "Map" },
      { path: "/admin/interests", icon: "🏷️", label: "Interests" },
      { path: "/admin/broadcast", icon: "📢", label: "Broadcast" },
      { path: "/admin/analytics", icon: "📈", label: "Analytics" },
    ],
    [],
  );

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  // ✅ auto close sidebar when route changes (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // ✅ close sidebar by ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setIsSidebarOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <h1>LACA Admin</h1>
      </div>

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <nav className="nav-menu">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`nav-item ${
                isActive(item.path, item.exact) ? "active" : ""
              }`}
              onClick={() => handleNavClick(item.path)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
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
