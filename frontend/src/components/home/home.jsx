// src/pages/Home/Home.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./home.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const Home = () => {
  const navigate = useNavigate();

  const [feedPosts, setFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [location, setLocation] = useState(null);

  // ✅ menu state
  const [menuOpen, setMenuOpen] = useState(false);

  /* =======================
     1️⃣ LẤY GPS KHI VÀO HOME
  ======================= */
  useEffect(() => {
    if (!navigator.geolocation) {
      setErrMsg("Trình duyệt không hỗ trợ định vị GPS");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setErrMsg("Vui lòng bật quyền vị trí để xem bài đăng gần bạn");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  /* =======================
     2️⃣ FETCH POSTS KHI CÓ GPS
  ======================= */
  useEffect(() => {
    if (location) fetchHomePosts(location.lat, location.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const fetchHomePosts = async (lat, lng) => {
    try {
      setLoading(true);
      setErrMsg("");

      const res = await fetch(
        `${API_BASE}/map/posts/nearby?lat=${lat}&lng=${lng}`,
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json?.message || "Get posts failed");

      setFeedPosts(json.data || []);
    } catch (err) {
      console.error("Fetch home posts error:", err);
      setErrMsg(err.message || "Không thể tải bài đăng");
      setFeedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     CHAT ACTION (✅ dùng localStorage + /chat/detail)
  ======================= */
  const getDisplayName = (post) =>
    post?.user?.fullname || post?.user?.username || "User";

  const openChatWithPostUser = (post) => {
    const receiverId = post?.user?._id;
    const receiverName = getDisplayName(post);
    if (!receiverId) return;

    // ✅ tránh tự chat với chính mình (nếu cần)
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

  /* =======================
     UI HANDLERS
  ======================= */
  const toggleReportMenu = (e) => {
    e.stopPropagation();
    const dropdown = e.currentTarget.nextElementSibling;
    document.querySelectorAll(".report-dropdown.show").forEach((d) => {
      if (d !== dropdown) d.classList.remove("show");
    });
    dropdown.classList.toggle("show");
  };

  const handleAction = (type) => {
    alert(type === "block" ? "Đã chặn người dùng" : "Đã báo cáo bài viết");
    document
      .querySelectorAll(".report-dropdown.show")
      .forEach((d) => d.classList.remove("show"));
  };

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".report-wrapper")) {
        document
          .querySelectorAll(".report-dropdown.show")
          .forEach((d) => d.classList.remove("show"));
      }
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // ✅ khóa scroll khi menu mở
  useEffect(() => {
    const main = document.querySelector(".home-main");
    if (!main) return;
    main.style.overflowY = menuOpen ? "hidden" : "auto";
    return () => {
      main.style.overflowY = "auto";
    };
  }, [menuOpen]);

  /* =======================
     HELPERS
  ======================= */
  const formatDistance = (kilometers) => {
    if (kilometers === undefined || kilometers === null) return "";
    if (kilometers < 1) return `${Math.round(kilometers * 1000)} m`;
    return `${kilometers} km`;
  };

  const getFirstMedia = (post) =>
    Array.isArray(post.mediaUrl) ? post.mediaUrl[0] : "";

  const isVideoUrl = (url) =>
    url?.endsWith(".mp4") || url?.includes("/video/upload/");

  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="mobile-wrapper">
      {/* ✅ overlay */}
      <div
        className={`home-overlay ${menuOpen ? "show" : ""}`}
        onClick={closeMenu}
      />

      {/* ✅ sidebar */}
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

      {/* ✅ header */}
      <header className="home-header">
        <button className="icon-btn" type="button" onClick={openMenu}>
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="header-title">LACA</div>

        <Link to="/notification" className="icon-btn" onClick={closeMenu}>
          <i className="fa-regular fa-bell"></i>
        </Link>
      </header>

      {/* ✅ main */}
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
          feedPosts.map((post) => {
            const media = getFirstMedia(post);
            const isVideo = post.type === "video" || isVideoUrl(media);

            return (
              <article className="post-card" key={post._id}>
                <div className="post-header">
                  <Link to={`/profile/${post.user?._id}`} className="user-info">
                    <div className="user-avatar">
                      {post.user?.avatar ? (
                        <img src={post.user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 999 }} />
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

                  <div className="report-wrapper">
                    <div className="report-btn" onClick={toggleReportMenu}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                    </div>

                    <div className="report-dropdown">
                      <div
                        className="dropdown-item"
                        onClick={() => handleAction("block")}
                      >
                        <i className="fa-solid fa-ban"></i> Block
                      </div>

                      <div
                        className="dropdown-item warning"
                        onClick={() => handleAction("report")}
                      >
                        <i className="fa-solid fa-flag"></i> Report
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

                {/* ✅ ACTIONS dưới bài */}
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
    </div>
  );
};

export default Home;
