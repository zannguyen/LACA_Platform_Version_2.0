// src/components/home/home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocationAccess } from "../../context/LocationAccessContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ReportModal from "../report/ReportModal";
import { getUnreadCount } from "../../api/notificationApi";
import userApi from "../../api/userApi";
import lacaLogo from "../../assets/images/laca_logo.png";
import "./home.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const Home = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [feedPosts, setFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Popup chat
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState({
    receiverId: "",
    receiverName: "User",
    postId: "",
    isSelf: false,
  });

  // Heart reaction
  const [reactionMeta, setReactionMeta] = useState({});

  // report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  // top search + filter UI (frontend-only)
  const [searchText, setSearchText] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("for-you");
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [onlyHasLocation, setOnlyHasLocation] = useState(false);

  const getAccessToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?._id;
    } catch {
      return null;
    }
  }, []);

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
      setUserLocation(null);
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
      .then((pos) => setUserLocation({ lat: pos.lat, lng: pos.lng }))
      .catch(() => {
        setErrMsg("Vui lòng bật quyền vị trí để xem bài đăng gần bạn");
        setLoading(false);
      });
  }, [locationEnabled, requestCurrentPosition]);

  useEffect(() => {
    if (userLocation) fetchHomePosts(userLocation.lat, userLocation.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // Handle scroll to post from notification
  useEffect(() => {
    const postIdToScroll = sessionStorage.getItem("scrollToPostId");
    if (postIdToScroll && feedPosts.length > 0) {
      // Wait a bit for DOM to render
      setTimeout(() => {
        const postElement = document.querySelector(
          `[data-post-id="${postIdToScroll}"]`,
        );
        if (postElement) {
          postElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      // Clear the stored ID to prevent re-scrolling
      sessionStorage.removeItem("scrollToPostId");
    }
  }, [feedPosts]);

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

      const posts = json?.data || [];
      setFeedPosts(posts);

      // Fetch reaction counts and user status for each post
      const reactions = {};
      for (const post of posts) {
        try {
          const [countRes, statusRes] = await Promise.all([
            fetch(`${API_BASE}/reactions/count/${post._id}`),
            fetch(`${API_BASE}/reactions/status/${post._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          let count = 0;
          let reacted = false;

          if (countRes.ok) {
            const countData = await countRes.json();
            count = countData.total || 0;
          }

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            reacted = statusData.reacted || false;
          }

          reactions[post._id] = { count, reacted };
        } catch (err) {
          console.error("Fetch reaction error:", err);
        }
      }
      setReactionMeta(reactions);
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
      if (me && String(me) === String(receiverId)) {
        setChatTarget({
          receiverId,
          receiverName,
          postId: post._id,
          isSelf: true,
        });
        setChatPopupOpen(true);
        return;
      }
    } catch {
      // ignore
    }

    setChatTarget({
      receiverId,
      receiverName,
      postId: post._id,
      isSelf: false,
    });
    setChatPopupOpen(true);
  };

  const handleChoosePrivateChat = () => {
    if (chatTarget.isSelf) {
      alert("Bạn không thể chat riêng tư với chính mình");
      setChatPopupOpen(false);
      return;
    }
    localStorage.setItem("chatReceiverId", chatTarget.receiverId);
    localStorage.setItem("chatReceiverName", chatTarget.receiverName);
    setChatPopupOpen(false);
    navigate("/chat/detail");
  };

  const handleChooseCommunityChat = () => {
    if (!chatTarget.postId) {
      alert("Không thể tìm thấy bài viết");
      setChatPopupOpen(false);
      return;
    }
    setChatPopupOpen(false);
    navigate(`/chat/public/${chatTarget.postId}`);
  };

  const closeChatPopup = () => {
    setChatPopupOpen(false);
  };

  const reactHeart = async (postId) => {
    try {
      const token = getAccessToken();
      const isReacted = reactionMeta[postId]?.reacted;

      if (isReacted) {
        // Already reacted - remove reaction
        const res = await fetch(`${API_BASE}/reactions/${postId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("Unreact error:", err);
          return;
        }

        // Update state to reflect removal
        setReactionMeta((prev) => ({
          ...prev,
          [postId]: {
            count: Math.max((prev[postId]?.count || 1) - 1, 0),
            reacted: false,
          },
        }));
      } else {
        // Not reacted - add reaction
        const res = await fetch(`${API_BASE}/reactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            postId,
            type: "heart",
            lat: userLocation?.lat,
            lng: userLocation?.lng,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error("React error:", err);
          alert(err.message || "Không thể tương tác bài viết này");
          return;
        }

        // Fetch count after reaction
        await fetchReactionCount(postId);
      }
    } catch (err) {
      console.error("React heart error:", err);
    }
  };

  const fetchReactionCount = async (postId) => {
    try {
      const token = getAccessToken();

      // Fetch count and user status in parallel
      const [countRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/reactions/count/${postId}`),
        fetch(`${API_BASE}/reactions/status/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      let count = 0;
      let reacted = false;

      if (countRes.ok) {
        const countData = await countRes.json();
        count = countData.total || 0;
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        reacted = statusData.reacted || false;
      }

      setReactionMeta((prev) => ({
        ...prev,
        [postId]: { count, reacted },
      }));
    } catch (err) {
      console.error("Fetch reaction count error:", err);
    }
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

  const handleAction = async (type, post, e) => {
    if (e) e.stopPropagation();
    closeAllReportDropdowns();

    if (type === "block") {
      const targetId = post?.user?._id;
      if (!targetId) return;
      if (String(targetId) === String(currentUserId)) {
        alert("Bạn không thể chặn chính mình");
        return;
      }

      const ok = window.confirm("Bạn có chắc muốn chặn người dùng này?");
      if (!ok) return;

      try {
        await userApi.blockUser(targetId);
        setFeedPosts((prev) => {
          const nextPosts = prev.filter(
            (p) => String(p.user?._id) !== String(targetId),
          );
          setReactionMeta((prevMeta) => {
            const nextMeta = {};
            nextPosts.forEach((p) => {
              if (prevMeta[p._id]) nextMeta[p._id] = prevMeta[p._id];
            });
            return nextMeta;
          });
          return nextPosts;
        });
        alert("Đã chặn người dùng");
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Chặn người dùng thất bại";
        alert(msg);
      }
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
      <header className="home-header">
        {/* Logo - click to refresh */}
        <button className="home-logo" title="Trang chủ" onClick={() => window.location.reload()}>
          <img src={lacaLogo} alt="LACA" />
        </button>

        <div className="header-tabs">
          <button
            className={`header-tab ${activeTab === "for-you" ? "active" : ""}`}
            onClick={() => setActiveTab("for-you")}
          >
            Cho bạn
          </button>
          <button
            className={`header-tab ${activeTab === "following" ? "active" : ""}`}
            onClick={() => setActiveTab("following")}
          >
            Đang follow
          </button>
        </div>
        <div className="header-actions">
          <button
            className="header-action-btn search-trigger-btn"
            onClick={() => setSearchExpanded(true)}
            title="Tìm kiếm"
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
          <Link
            to="/notification"
            className="header-action-btn"
            title="Thông báo"
          >
            <i className="fa-regular fa-bell"></i>
            {unreadNotifCount > 0 && (
              <span className="notif-badge-small">
                {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
              </span>
            )}
          </Link>
          <button
            className="header-action-btn"
            onClick={() => setFilterOpen((v) => !v)}
            title="Lọc"
          >
            <i className="fa-solid fa-sliders"></i>
          </button>
        </div>
      </header>

      {/* search + filter - only show when expanded */}
      {searchExpanded && (
        <div className="home-topbar expanded">
          <div className="home-search">
            <input
              type="text"
              className="home-search-input"
              placeholder="Tìm bạn bè bằng email hoặc username..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />
            {searchText ? (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => {
                  setSearchText("");
                  setSearchExpanded(false);
                }}
                aria-label="Close search"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
            ) : (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => setSearchExpanded(false)}
                aria-label="Close search"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter panel */}
      {filterOpen && (
        <div className="home-filter-panel">
          <div className="home-filter-title">Bộ lọc</div>

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

      <main className="home-main">
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
              <article
                className="post-card"
                key={post._id}
                data-post-id={post._id}
              >
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

                      {post.distanceKm != null &&
                        typeof post.distanceKm === "number" && (
                          <span className="post-distance">
                            · {formatDistance(post.distanceKm)}
                          </span>
                        )}
                    </div>
                  </Link>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    {hasPlace && (post.place?.name || post.place?.address) && (
                      <button
                        type="button"
                        className="post-location-icon-btn"
                        onClick={() => goToPostOnMap(post)}
                        title={post.place?.name || post.place?.address}
                        aria-label="Vị trí"
                      >
                        <i className="fa-solid fa-location-dot" />
                      </button>
                    )}
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

                {/* Tags hiển thị dưới avatar, trên ảnh post */}
                {post.tags && post.tags.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                      padding: "0 16px 8px",
                      marginLeft: 44,
                      overflow: "hidden",
                      maxWidth: "calc(100% - 60px)",
                    }}
                  >
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={tag._id || idx}
                        style={{
                          background: "#e94057",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tag.icon} {tag.name}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span
                        style={{
                          background: "#b83245",
                          color: "#aaa",
                          padding: "2px 6px",
                          borderRadius: 10,
                          fontSize: 10,
                        }}
                      >
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

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
                    className={`heart-btn ${reactionMeta[post._id]?.reacted ? "active" : ""}`}
                    onClick={() => reactHeart(post._id)}
                    aria-label="Heart"
                  >
                    <i className="fa-solid fa-heart action-icon"></i>
                    <span className="like-count">
                      {reactionMeta[post._id]?.count || 0}
                    </span>
                  </button>
                  {String(post.user?._id) !== String(currentUserId) && (
                    <button
                      type="button"
                      className="chat-icon-btn"
                      onClick={() => openChatWithPostUser(post)}
                      aria-label="Chat"
                    >
                      <i className="fa-regular fa-comment action-icon"></i>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </main>

      {/* TikTok-style Bottom Navigation */}
      <nav className="bottom-nav">
        <Link
          to="/home"
          className={`bottom-nav-item ${routerLocation.pathname === "/home" ? "active" : ""}`}
        >
          <i className="fa-solid fa-house"></i>
          <span>Trang chủ</span>
        </Link>
        <Link to="/map" className="bottom-nav-item">
          <i className="fa-solid fa-map"></i>
          <span>Bản đồ</span>
        </Link>
        <Link to="/camera" className="bottom-nav-item">
          <div className="nav-icon-plus">
            <i className="fa-solid fa-plus"></i>
          </div>
        </Link>
        <Link to="/chat" className="bottom-nav-item">
          <i className="fa-regular fa-comment-dots"></i>
          <span>Nhắn tin</span>
        </Link>
        <Link to="/profile" className="bottom-nav-item">
          <i className="fa-regular fa-user"></i>
          <span>Hồ sơ</span>
        </Link>
      </nav>

      {/* Chat option popup modal */}
      {chatPopupOpen && (
        <div className="chat-option-modal-overlay" onClick={closeChatPopup}>
          <div
            className="chat-option-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="chat-option-modal-btn"
              onClick={handleChoosePrivateChat}
            >
              Riêng tư
            </button>
            <button
              type="button"
              className="chat-option-modal-btn"
              onClick={handleChooseCommunityChat}
            >
              Cộng đồng
            </button>
          </div>
        </div>
      )}

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
