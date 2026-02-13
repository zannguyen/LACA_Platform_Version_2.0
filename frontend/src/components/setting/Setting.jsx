import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Setting.css";
import { useLocationAccess } from "../../context/LocationAccessContext";

/* ===== ICONS (inline SVG) ===== */
const I = ({ children }) => <span className="st-icon">{children}</span>;

const IconPin = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconRange = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7 7h14M3 7h1M20 17H6M3 17h1"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 7l2-2M7 7l2 2M17 17l-2-2M17 17l-2 2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBlocked = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M7 7l10 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconShield = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMail = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M4 6h16v12H4V6Z" stroke="currentColor" strokeWidth="2" />
    <path
      d="m4 7 8 6 8-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconWarn = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 9v5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 17h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M10.29 3.86h3.42c.66 0 1.26.36 1.58.94l6.26 11.3c.62 1.12-.19 2.5-1.47 2.5H3.92c-1.28 0-2.09-1.38-1.47-2.5l6.26-11.3c.32-.58.92-.94 1.58-.94Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconLogout = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M10 17l5-5-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12H3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M21 4v16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconTrash = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 6V4h8v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M19 6l-1 14H6L5 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

// ✅ RowButton giờ nhận onClick để bấm được
const RowButton = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    className={`st-row st-clickable ${danger ? "danger" : ""}`}
    onClick={onClick}
  >
    <div className="st-row-left">
      <I>{icon}</I>
      <span className="st-row-text">{label}</span>
    </div>
    <span className="st-row-chevron" aria-hidden="true">
      ›
    </span>
  </button>
);

export default function Setting() {
  const navigate = useNavigate();
  const {
    enabled,
    enableLocation,
    disableLocation,
    rangeKm,
    setRange,
    permissionState,
  } = useLocationAccess();

  const [busy, setBusy] = useState(false);

  const hint = useMemo(() => {
    if (!enabled) {
      return (
        <>
          Định vị đã tắt. Ứng dụng sẽ <b>ngừng đọc GPS</b> ngay lập tức.
          <br />
          (Nếu muốn thu hồi quyền vị trí ở mức trình duyệt, bạn tắt trong Site
          Settings.)
        </>
      );
    }

    if (permissionState === "denied") {
      return (
        <>
          Bạn đã chặn quyền vị trí ở trình duyệt. Hãy bật lại trong Site
          Settings để sử dụng Map/Home.
        </>
      );
    }

    return null;
  }, [enabled, permissionState]);

  const onToggleLocation = async (next) => {
    if (busy) return;

    if (!next) {
      disableLocation();
      return;
    }

    setBusy(true);
    try {
      await enableLocation();
    } catch (e) {
      const msg =
        e?.code === 1
          ? "Bạn đã chặn quyền vị trí. Hãy bật lại trong cài đặt trình duyệt (Site settings) rồi thử lại."
          : "Không thể lấy vị trí hiện tại. Vui lòng thử lại.";
      window.alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  // ✅ LOGOUT HOÀN CHỈNH
  const handleLogout = () => {
    const ok = window.confirm("Bạn chắc chắn muốn đăng xuất?");
    if (!ok) return;

    // clear toàn bộ auth keys từng dùng trong dự án
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");

    // về login và chặn back
    navigate("/login", { replace: true });

    // reset sạch state/cache của SPA
    window.location.reload();
  };

  return (
    <div className="setting-page">
      <div className="st-header">
        <button className="st-back" onClick={goBack} aria-label="Back">
          ←
        </button>
        <div className="st-title">Setting</div>
      </div>

      <div className="st-divider" />

      <div className="st-content">
        <div className="st-section">
          <div className="st-section-title">Location</div>

          <div className="st-row st-static">
            <div className="st-row-left">
              <I>
                <IconPin />
              </I>
              <span className="st-row-text">Allow location access</span>
            </div>

            <label
              className={`st-switch ${busy ? "busy" : ""}`}
              aria-label="Allow location"
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggleLocation(e.target.checked)}
                disabled={busy}
              />
              <span className="st-slider">
                <span className="st-knob" aria-hidden="true" />
              </span>
            </label>
          </div>

          <div className={`st-row st-static ${!enabled ? "disabled" : ""}`}>
            <div className="st-row-left">
              <I>
                <IconRange />
              </I>
              <span className="st-row-text">Range</span>
            </div>

            <div className="st-range" aria-label="Range (km)">
              <input
                type="range"
                min="1"
                max="5"
                step="2"
                value={rangeKm}
                disabled={!enabled}
                onChange={(e) => setRange(Number(e.target.value))}
              />
              <div className="st-range-labels">
                <span className={rangeKm === 1 ? "active" : ""}>1km</span>
                <span className={rangeKm === 3 ? "active" : ""}>3km</span>
                <span className={rangeKm === 5 ? "active" : ""}>5km</span>
              </div>
            </div>
          </div>

          {hint && <div className="st-hint">{hint}</div>}
        </div>

        <div className="st-section">
          <div className="st-section-title">Privacy and security</div>
          <RowButton
            icon={<IconBlocked />}
            label="Blocked"
            onClick={() => navigate("/blocked")}
          />
          <RowButton
            icon={<IconShield />}
            label="Privacy and Data"
            onClick={() => navigate("/privacy")}
          />
        </div>

        <div className="st-section">
          <div className="st-section-title">Support</div>
          <RowButton
            icon={<IconMail />}
            label="Feedback"
            onClick={() => navigate("/feedback")}
          />
          <RowButton
            icon={<IconWarn />}
            label="Report issue"
            onClick={() => navigate("/report")}
          />
        </div>

        <div className="st-section">
          <div className="st-section-title">Account</div>
          <RowButton
            icon={<IconLogout />}
            label="Log out"
            onClick={() => {
              const ok = window.confirm("Bạn chắc chắn muốn đăng xuất?");
              if (!ok) return;

              localStorage.removeItem("authToken");
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              localStorage.removeItem("refreshToken");

              navigate("/login", { replace: true });
              window.location.reload();
            }}
          />
          <RowButton
            icon={<IconTrash />}
            label="Delete account"
            danger
            onClick={() => navigate("/delete-account-confirm")}
          />
        </div>
      </div>
    </div>
  );
}
