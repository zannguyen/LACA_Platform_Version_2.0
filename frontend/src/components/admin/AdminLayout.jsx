import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { authApi } from "../../api/authApi";
import "./AdminLayout.css";
import lacalogoadmin from "../../assets/images/lacalogoadmin.jpg";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogoClick = () => {
    window.location.reload();
  };

  const navItems = useMemo(
    () => [
      { path: "/admin", icon: "📊", label: "Dashboard", exact: true },
      { path: "/admin/users", icon: "👤", label: "User Management" },
      { path: "/admin/admins", icon: "👑", label: "Admin Management" },
      { path: "/admin/content", icon: "🛡️", label: "Content" },
      { path: "/admin/map", icon: "🗺️", label: "Map" },
      { path: "/admin/tags", icon: "🏷️", label: "Tags/Categories" },
      { path: "/admin/feedbacks", icon: "💬", label: "Feedbacks" },
      { path: "/admin/broadcast", icon: "📢", label: "Broadcast" },
      { path: "/admin/analytics", icon: "📈", label: "Analytics" },
      { path: "/admin/account", icon: "⚙️", label: "Admin Account" },
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

  const handleLogout = async () => {
    await authApi.logout();
    navigate("/login");
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
        <img src={lacalogoadmin} alt="LACA Admin" className="mobile-logo" onClick={handleLogoClick} />
      </div>

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* Sidebar Header with Logo */}
        <div className="sidebar-header">
          <div className="logo" onClick={handleLogoClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleLogoClick()}>
            <img src={lacalogoadmin} alt="LACA Admin" className="logo-image" />
          </div>
          <button
            type="button"
            className="close-sidebar"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

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
          <button
            type="button"
            className="nav-item logout-btn"
            onClick={handleLogout}
          >
            <span className="nav-icon" aria-hidden="true">
              🚪
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
