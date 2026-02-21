// src/components/home/home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocationAccess } from "../../context/LocationAccessContext";
import { Link, useNavigate } from "react-router-dom";
import ReportModal from "../report/ReportModal";
import { getUnreadCount } from "../../api/notificationApi";
import "./home.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const Home = () => {
  const navigate = useNavigate();

  const [feedPosts, setFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [location, setLocation] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);

  // report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  // top search + filter UI (frontend-only)
  const [searchText, setSearchText] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [onlyHasLocation, setOnlyHasLocation] = useState(false);

  const getAccessToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  const { enabled: locationEnabled, requestCurrentPosition } =
    useLocationAccess();

  // ✅ HARD RESET report modal when Home mounts (ngăn auto-open do state rác)
  useEffect(() => {
    setReportOpen(false);
    setReportTarget(null);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await getUnreadCount();
        if (data?.success) {
          setUnreadNotifCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Fetch unread count error:", err);
      }
    };

    fetchUnreadCount();

    // Poll every 30 seconds để cập nhật số lượng thông báo chưa đọc
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // (debug, xoá cũng được)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("reportOpen:", reportOpen, "reportTarget:", reportTarget?._id);
  }, [reportOpen, reportTarget]);

  // ================== LOCATION ==================
  useEffect(() => {
    if (!locationEnabled) {
      setLocation(null);
      setFeedPosts([]);
      setErrMsg(
        "Định vị đang tắt. Bật 'Allow location access' trong Setting để xem bài đăng gần bạn.",
      );
      setLoading(false);
      return;
    }

    requestCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
      .then((pos) => setLocation({ lat: pos.lat, lng: pos.lng }))
      .catch(() => {
        setErrMsg("Vui lòng bật quyền vị trí để xem bài đăng gần bạn");
        setLoading(false);
      });
  }, [locationEnabled, requestCurrentPosition]);

  useEffect(() => {
    if (location) fetchHomePosts(location.lat, location.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const fetchHomePosts = async (lat, lng) => {
    try {
      setLoading(true);
      setErrMsg("");

      const token = getAccessToken();
      if (!token) {
        setErrMsg("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        setFeedPosts([]);
        navigate("/login");
        return;
      }

      const res = await fetch(
        `${API_BASE}/map/posts/nearby?lat=${lat}&lng=${lng}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setErrMsg("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setFeedPosts([]);
        navigate("/login");
        return;
      }

      let json = null;
      try {
        json = await res.json();
      } catch {
        // ignore
      }

      if (!res.ok) throw new Error(json?.message || "Get posts failed");

      setFeedPosts(json?.data || []);
    } catch (err) {
      console.error("Fetch home posts error:", err);
      setErrMsg(err?.message || "Không thể tải bài đăng");
      setFeedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ================== HELPERS ==================
  const getDisplayName = (post) =>
    post?.user?.fullname || post?.user?.username || "User";

  const openChatWithPostUser = (post) => {
    const receiverId = post?.user?._id;
    const receiverName = getDisplayName(post);
    if (!receiverId) return;

    try {
      const me = JSON.parse(localStorage.getItem("user") || "{}")?._id;
      if (me && String(me) === String(receiverId)) return;
    } catch {
      // ignore
    }

    localStorage.setItem("chatReceiverId", receiverId);
    localStorage.setItem("chatReceiverName", receiverName);

    navigate("/chat/detail");
  };

  const formatDistance = (kilometers) => {
    if (kilometers === undefined || kilometers === null) return "";
    if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`;
    return `${kilometers} km`;
  };

  const getFirstMedia = (post) =>
    Array.isArray(post.mediaUrl) ? post.mediaUrl[0] : "";

  const isVideoUrl = (url) =>
    url?.endsWith(".mp4") || url?.includes("/video/upload/");

  const getPostLatLng = (post) => {
    const lat = post?.place?.location?.lat;
    const lng = post?.place?.location?.lng;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
    return null;
  };

  const goToPostOnMap = (post) => {
    const p = getPostLatLng(post);
    if (!p) return;
    navigate(
      `/map?focusLat=${p.lat}&focusLng=${p.lng}&openPosts=1&postId=${post._id}`,
    );
  };

  // ================== MENU ==================
  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);

  useEffect(() => {
    const main = document.querySelector(".home-main");
    if (!main) return;
    main.style.overflowY = menuOpen ? "hidden" : "auto";
    return () => {
      main.style.overflowY = "auto";
    };
  }, [menuOpen]);

  // ================== REPORT DROPDOWN ==================
  const toggleReportMenu = (e) => {
    e.stopPropagation();
    const dropdown = e.currentTarget.nextElementSibling;

    document.querySelectorAll(".report-dropdown.show").forEach((d) => {
      if (d !== dropdown) d.classList.remove("show");
    });

    dropdown.classList.toggle("show");
  };

  const closeAllReportDropdowns = () => {
    document
      .querySelectorAll(".report-dropdown.show")
      .forEach((d) => d.classList.remove("show"));
  };

  const handleAction = (type, post, e) => {
    if (e) e.stopPropagation();
    closeAllReportDropdowns();

    if (type === "block") {
      alert("Đã chặn người dùng");
      return;
    }

    if (type === "report") {
      setReportTarget(post);
      setReportOpen(true);
    }
  };

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".report-wrapper")) closeAllReportDropdowns();
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ✅ ESC đóng modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && reportOpen) {
        setReportOpen(false);
        setReportTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reportOpen]);

  // ================== FRONTEND-ONLY FILTER/SEARCH ==================
  const visiblePosts = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return (feedPosts || [])
      .filter((p) => {
        if (!q) return true;
        const name = (getDisplayName(p) || "").toLowerCase();
        const content = (p?.content || "").toLowerCase();
        return name.includes(q) || content.includes(q);
      })
      .filter((p) => (!onlyHasLocation ? true : !!getPostLatLng(p)))
      .filter((p) => {
        if (!onlyNearby) return true;
        const d = p?.distanceKm;
        if (typeof d !== "number") return false;
        return d <= 5;
      });
  }, [feedPosts, searchText, onlyHasLocation, onlyNearby]);

  return (
    <div className="mobile-wrapper">
      <div
        className={`home-overlay ${menuOpen ? "show" : ""}`}
        onClick={closeMenu}
      />

      <nav className={`home-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-header">MENU</div>

        <Link to="/profile" className="sidebar-item" onClick={closeMenu}>
          <i className="fa-regular fa-user"></i> Profile
        </Link>
        <Link to="/camera" className="sidebar-item" onClick={closeMenu}>
          <i className="fa-solid fa-camera"></i> Camera
        </Link>
        <Link to="/chat" className="sidebar-item" onClick={closeMenu}>
          <i className="fa-regular fa-comment-dots"></i> Chat
        </Link>
        <Link to="/map" className="sidebar-item" onClick={closeMenu}>
          <i className="fa-regular fa-map"></i> Map
        </Link>
        <Link to="/setting" className="sidebar-item" onClick={closeMenu}>
          <i className="fa-solid fa-gear"></i> Setting
        </Link>
      </nav>

      <header className="home-header">
        <button className="icon-btn" type="button" onClick={openMenu}>
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="header-title">LACA</div>

        <Link
          to="/notification"
          className="icon-btn notif-icon-wrapper"
          onClick={closeMenu}
        >
          <i className="fa-regular fa-bell"></i>
          {unreadNotifCount > 0 && (
            <span className="notif-badge">
              {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
            </span>
          )}
        </Link>
      </header>

      {/* search + filter */}
      <div className="home-topbar" onClick={() => menuOpen && closeMenu()}>
        <div className="home-search">
          <i className="fa-solid fa-magnifying-glass home-search-icon" />
          <input
            type="text"
            className="home-search-input"
            placeholder="Tìm bạn bè bằng email hoặc username..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              type="button"
              className="home-search-clear"
              onClick={() => setSearchText("")}
              aria-label="Clear search"
              title="Xóa"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <button
          type="button"
          className="home-filter-btn"
          onClick={() => setFilterOpen((v) => !v)}
          aria-label="Filter"
          title="Filter"
        >
          <i className="fa-solid fa-sliders" />
        </button>
      </div>

      {filterOpen && (
        <div
          className="home-filter-panel"
          onClick={() => menuOpen && closeMenu()}
        >
          <div className="home-filter-title">Bộ lọc (demo UI)</div>

          <label className="home-filter-row">
            <input
              type="checkbox"
              checked={onlyNearby}
              onChange={(e) => setOnlyNearby(e.target.checked)}
            />
            <span>Chỉ hiện bài gần tôi (≤ 5km)</span>
          </label>

          <label className="home-filter-row">
            <input
              type="checkbox"
              checked={onlyHasLocation}
              onChange={(e) => setOnlyHasLocation(e.target.checked)}
            />
            <span>Chỉ bài có vị trí</span>
          </label>

          <div className="home-filter-actions">
            <button
              type="button"
              className="home-filter-reset"
              onClick={() => {
                setOnlyNearby(false);
                setOnlyHasLocation(false);
              }}
            >
              Reset
            </button>

            <button
              type="button"
              className="home-filter-apply"
              onClick={() => setFilterOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <main className="home-main" onClick={() => menuOpen && closeMenu()}>
        {loading && (
          <div style={{ padding: 12, textAlign: "center" }}>
            Đang tải bài đăng...
          </div>
        )}

        {errMsg && !loading && (
          <div style={{ padding: 12, textAlign: "center" }}>
            <p>{errMsg}</p>
            <button onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        )}

        {!loading &&
          !errMsg &&
          visiblePosts.map((post) => {
            const media = getFirstMedia(post);
            const isVideo = post.type === "video" || isVideoUrl(media);
            const hasPlace = !!getPostLatLng(post);

            return (
              <article className="post-card" key={post._id}>
                <div className="post-header">
                  <Link to={`/profile/${post.user?._id}`} className="user-info">
                    <div className="user-avatar">
                      {post.user?.avatar ? (
                        <img
                          src={post.user.avatar}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 999,
                          }}
                        />
                      ) : (
                        <i className="fa-solid fa-user"></i>
                      )}
                    </div>

                    <div className="user-name-distance">
                      <span className="username">{getDisplayName(post)}</span>

                      {post.distanceKm !== undefined && (
                        <span className="post-distance">
                          · {formatDistance(post.distanceKm)}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div className="report-wrapper">
                      <button
                        type="button"
                        className="report-btn"
                        onClick={toggleReportMenu}
                        aria-label="Report menu"
                        title="Report menu"
                      >
                        <i className="fa-solid fa-circle-exclamation"></i>
                      </button>

                      <div className="report-dropdown">
                        <div
                          className="dropdown-item"
                          onClick={(e) => handleAction("block", post, e)}
                        >
                          <i className="fa-solid fa-ban"></i> Block
                        </div>

                        <div
                          className="dropdown-item warning"
                          onClick={(e) => handleAction("report", post, e)}
                        >
                          <i className="fa-solid fa-flag"></i> Report
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="post-image-wrapper">
                  {media ? (
                    isVideo ? (
                      <video
                        src={media}
                        className="post-image"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img src={media} alt="Post" className="post-image" />
                    )
                  ) : (
                    <div style={{ padding: 16 }}>{post.content}</div>
                  )}

                  {post.content && (
                    <div className="caption-overlay">
                      <p>{post.content}</p>
                    </div>
                  )}
                </div>

                <div className="post-actions">
                  <button
                    type="button"
                    className="left-actions"
                    onClick={() => openChatWithPostUser(post)}
                    aria-label="Chat"
                  >
                    <i className="fa-regular fa-comment action-icon"></i>
                    <span className="like-count">Chat</span>
                  </button>
                </div>
              </article>
            );
          })}
      </main>

      <ReportModal
        open={reportOpen}
        targetType="post"
        targetId={reportTarget?._id}
        onClose={(ok) => {
          setReportOpen(false);
          setReportTarget(null);
          if (ok) alert("Đã gửi report");
        }}
      />
    </div>
  );
};

export default Home;
