// src/components/home/home.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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

  // Swipe card state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const cardRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);

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
  const [dropdownPostId, setDropdownPostId] = useState(null);

  // top search + filter UI (frontend-only)
  const [searchText, setSearchText] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
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
        `${API_BASE}/map/posts/nearby?lat=${lat}&lng=${lng}&recommendation=true`,
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
  const toggleReportMenu = (e, postId) => {
    e.stopPropagation();
    setDropdownPostId(prev => prev === postId ? null : postId);
  };

  const closeAllReportDropdowns = () => {
    setDropdownPostId(null);
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
      if (!e.target.closest(".report-dropdown")) closeAllReportDropdowns();
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

  // Swipe handlers
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setSwipeDirection(diff > 0 ? "right" : "left");
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    const diff = currentX.current - startX.current;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe right - next card
        setCurrentCardIndex(prev => Math.min(prev + 1, visiblePosts.length - 1));
      } else {
        // Swipe left - previous card
        setCurrentCardIndex(prev => Math.max(prev - 1, 0));
      }
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };

  const goToNextCard = () => {
    if (currentCardIndex < visiblePosts.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const currentPost = visiblePosts[currentCardIndex];
  const cardRotation = isSwiping ? (currentX.current - startX.current) * 0.05 : 0;
  const cardTranslate = isSwiping ? currentX.current - startX.current : 0;

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
              onChange={async (e) => {
                const value = e.target.value;
                setSearchText(value);
                if (value.trim().length > 0) {
                  setSearchLoading(true);
                  try {
                    const res = await userApi.searchUsers(value);
                    setSearchResults(res.data || []);
                  } catch (err) {
                    console.error("Search error:", err);
                    setSearchResults([]);
                  } finally {
                    setSearchLoading(false);
                  }
                } else {
                  setSearchResults([]);
                }
              }}
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

          {/* Search Results */}
          {searchText.trim().length > 0 && (
            <div className="search-results">
              {searchLoading ? (
                <div className="search-loading">Đang tìm...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div key={user._id} className="search-result-item">
                    <Link
                      to={`/profile/${user._id}`}
                      className="search-result-link"
                      onClick={() => {
                        setSearchText("");
                        setSearchExpanded(false);
                        setSearchResults([]);
                      }}
                    >
                      <div className="search-result-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.fullname || user.username} />
                        ) : (
                          <i className="fa-solid fa-user"></i>
                        )}
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-name">
                          {user.fullname || user.username}
                        </div>
                        <div className="search-result-username">@{user.username}</div>
                      </div>
                    </Link>
                    <button
                      className={`search-result-follow-btn ${user.isFollowing ? "following" : ""}`}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          if (user.isFollowing) {
                            await userApi.unfollowUser(user._id);
                            setSearchResults((prev) =>
                              prev.map((u) =>
                                u._id === user._id ? { ...u, isFollowing: false } : u
                              )
                            );
                          } else {
                            await userApi.followUser(user._id);
                            setSearchResults((prev) =>
                              prev.map((u) =>
                                u._id === user._id ? { ...u, isFollowing: true } : u
                              )
                            );
                          }
                        } catch (err) {
                          console.error("Follow error:", err);
                        }
                      }}
                    >
                      {user.isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="search-no-results">Không tìm thấy người dùng</div>
              )}
            </div>
          )}
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

        {!loading && !errMsg && visiblePosts.length > 0 && (
          <div className="swipe-cards-container">
            {/* Card stack */}
            <div
              className="swipe-card-wrapper"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              {visiblePosts.map((post, idx) => {
                const isActive = idx === currentCardIndex;
                const isVisible = idx >= currentCardIndex && idx <= currentCardIndex + 1;

                if (!isVisible) return null;

                const media = getFirstMedia(post);
                const isVideo = post.type === "video" || isVideoUrl(media);
                const hasPlace = !!getPostLatLng(post);

                return (
                  <article
                    key={post._id}
                    className={`swipe-card ${isActive ? "active" : ""}`}
                    style={{
                      transform: isActive
                        ? `translateX(${cardTranslate}px) rotate(${cardRotation}deg)`
                        : `translateX(${(idx - currentCardIndex) * 20}px) translateY(${(idx - currentCardIndex) * 10}px) scale(${1 - (idx - currentCardIndex) * 0.05})`,
                      zIndex: visiblePosts.length - idx,
                      opacity: isVisible ? 1 : 0,
                      pointerEvents: isActive ? 'auto' : 'none',
                    }}
                  >
                    <div className="swipe-card-media">
                      {media ? (
                        isVideo ? (
                          <video
                            src={media}
                            className="swipe-card-image"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img src={media} alt="Post" className="swipe-card-image" />
                        )
                      ) : (
                        <div className="swipe-card-no-media">{post.content}</div>
                      )}

                      {/* Location button */}
                      {hasPlace && (
                        <button
                          className="swipe-card-location-btn"
                          onClick={(e) => { e.stopPropagation(); goToPostOnMap(post); }}
                        >
                          <i className="fa-solid fa-location-dot"></i>
                        </button>
                      )}

                      {/* Report button */}
                      <button
                        className="swipe-card-more-btn"
                        onClick={(e) => { e.stopPropagation(); toggleReportMenu(e, post._id); }}
                      >
                        <i className="fa-solid fa-ellipsis"></i>
                      </button>
                      {dropdownPostId === post._id && (
                        <div className="report-dropdown" style={{ position: 'absolute', top: 50, right: 16, zIndex: 200 }}>
                          <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setReportTarget(post); setReportOpen(true); setDropdownPostId(null); }}>
                            <i className="fa-solid fa-flag"></i> Báo cáo
                          </button>
                          <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setDropdownPostId(null); }}>
                            <i className="fa-solid fa-ban"></i> Chặn
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Overlay: User info, Tags, Content on image */}
                    <div className="swipe-card-overlay">
                      <Link to={`/profile/${post.user?._id}`} className="swipe-card-user-row">
                        <div className="swipe-card-avatar">
                          {post.user?.avatar ? (
                            <img src={post.user.avatar} alt="" />
                          ) : (
                            <i className="fa-solid fa-user"></i>
                          )}
                        </div>
                        <div className="swipe-card-name">
                          <span className="swipe-card-username">{getDisplayName(post)}</span>
                          {post.distanceKm != null && (
                            <span className="swipe-card-distance">
                              {formatDistance(post.distanceKm)}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="swipe-card-tags">
                          {post.tags.slice(0, 3).map((tag, idx) => (
                            <span key={tag._id || idx} className="swipe-card-tag">
                              {tag.icon} {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      {post.content && (
                        <div className="swipe-card-content">
                          <p>{post.content}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom white bar: Actions only */}
                    <div className="swipe-card-actions">
                      <button
                        className={`swipe-action-btn heart ${reactionMeta[post._id]?.reacted ? "active" : ""}`}
                        onClick={() => reactHeart(post._id)}
                      >
                        <i className="fa-solid fa-heart"></i>
                      </button>

                      {String(post.user?._id) !== String(currentUserId) && (
                        <button
                          className="swipe-action-btn chat"
                          onClick={() => openChatWithPostUser(post)}
                        >
                          <i className="fa-regular fa-comment"></i>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Navigation dots */}
            <div className="swipe-dots">
              {visiblePosts.map((_, idx) => (
                <span
                  key={idx}
                  className={`swipe-dot ${idx === currentCardIndex ? "active" : ""}`}
                  onClick={() => setCurrentCardIndex(idx)}
                />
              ))}
            </div>

            {/* Navigation arrows */}
            <div className="swipe-arrows">
              <button
                className="swipe-arrow prev"
                onClick={goToPrevCard}
                disabled={currentCardIndex === 0}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="swipe-counter">
                {currentCardIndex + 1} / {visiblePosts.length}
              </span>
              <button
                className="swipe-arrow next"
                onClick={goToNextCard}
                disabled={currentCardIndex === visiblePosts.length - 1}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}

        {!loading && !errMsg && visiblePosts.length === 0 && (
          <div className="swipe-empty">
            <i className="fa-solid fa-inbox"></i>
            <p>Không có bài đăng nào</p>
          </div>
        )}
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
