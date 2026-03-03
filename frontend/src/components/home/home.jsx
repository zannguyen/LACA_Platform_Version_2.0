// src/components/home/home.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocationAccess } from "../../context/LocationAccessContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import RankingModal from "../ranking/RankingModal";
import { getUnreadCount } from "../../api/notificationApi";
import userApi from "../../api/userApi";
import rankingApi from "../../api/rankingApi";
import { getCategoriesWithTags } from "../../api/tagApi";
import { getPostsFromFollowed } from "../../api/map.api";
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

  // block modal
  const [blockUserId, setBlockUserId] = useState(null);
  const [blockUserName, setBlockUserName] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);

  // Ranking modal
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingData, setRankingData] = useState({ locations: [], users: [] });
  const [rankingLoading, setRankingLoading] = useState(false);

  // top search + filter UI (frontend-only)
  const [searchText, setSearchText] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("for-you");
  const [followingPosts, setFollowingPosts] = useState([]); // Posts from mutual follow users
  const [followingLoading, setFollowingLoading] = useState(false);

  // Filter states
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [onlyHasLocation, setOnlyHasLocation] = useState(false);
  const [filterDistance, setFilterDistance] = useState("all"); // all, 5, 10, 20
  const [filterTime, setFilterTime] = useState("all"); // all, today, week, month
  const [filterSort, setFilterSort] = useState("newest"); // newest, popular
  const [filterType, setFilterType] = useState("all"); // all, image, video
  const [filterTags, setFilterTags] = useState([]); // selected tag IDs
  const [tagCategories, setTagCategories] = useState([]); // categories with tags from system
  const [tagsLoading, setTagsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({}); // track which categories are expanded

  // Fetch tags from system - same as camera_post
  const fetchSystemTags = async () => {
    setTagsLoading(true);
    try {
      const res = await getCategoriesWithTags();
      const data = res?.data?.data || res?.data || [];
      setTagCategories(data);
    } catch (e) {
      console.error("Failed to fetch tags:", e);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemTags();
  }, []);

  const toggleFilterTag = (tagId) => {
    setFilterTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getAccessToken = () =>
    localStorage.getItem("token") || localStorage.getItem("authToken");

  // Fetch ranking data
  const fetchRanking = async () => {
    setRankingLoading(true);
    try {
      const res = await rankingApi.getFeaturedRanking();
      if (res.data?.success) {
        setRankingData(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch ranking:", e);
    } finally {
      setRankingLoading(false);
    }
  };

  const openRanking = () => {
    fetchRanking();
    setRankingOpen(true);
  };

  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?._id;
    } catch {
      return null;
    }
  }, []);

  const { enabled: locationEnabled, requestCurrentPosition } =
    useLocationAccess();

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

  const closeSearch = () => {
    setSearchExpanded(false);
    setSearchResults([]);
    setSearchLoading(false);
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

  // Check if user can view location: within 5km OR mutual follow (has distance calculated)
  const canViewLocation = (post) => {
    const p = getPostLatLng(post);
    if (!p) return false;

    // If distance is calculated (either within 5km or mutual follow), can view
    if (post.distanceKm != null) {
      return true;
    }

    return false;
  };

  const goToPostOnMap = (post) => {
    const p = getPostLatLng(post);
    if (!p) return;

    // Check permission before navigating
    if (!canViewLocation(post)) {
      alert("Bạn cần trong phạm vi 5km hoặc follow lẫn nhau để xem vị trí");
      return;
    }

    navigate(
      `/map?focusLat=${p.lat}&focusLng=${p.lng}&openPosts=1&postId=${post._id}`,
    );
  };

  // ================== REPORT DROPDOWN ==================
  const [lastToggledId, setLastToggledId] = useState(null);

  const toggleReportMenu = (e, postId) => {
    e.stopPropagation();
    e.preventDefault();
    const postIdStr = String(postId);

    // Nếu click vào cùng một post thì toggle, nếu khác thì set mới
    if (dropdownPostId === postIdStr) {
      setDropdownPostId(null);
    } else {
      setDropdownPostId(postIdStr);
      setLastToggledId(postIdStr);
    }
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
      // Không đóng dropdown khi click vào nút toggle hoặc dropdown
      if (
        e.target.closest(".swipe-card-more-btn") ||
        e.target.closest(".report-dropdown")
      ) {
        return;
      }
      closeAllReportDropdowns();
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

  // Check if any filter is active
  const hasActiveFilter = useMemo(() => {
    return (
      filterDistance !== "all" ||
      filterTime !== "all" ||
      filterSort !== "newest" ||
      filterType !== "all" ||
      onlyHasLocation ||
      filterTags.length > 0
    );
  }, [
    filterDistance,
    filterTime,
    filterSort,
    filterType,
    onlyHasLocation,
    filterTags,
  ]);

  // Load posts from mutual follow users when switching to "following" tab
  useEffect(() => {
    if (activeTab === "following") {
      const loadFollowingPosts = async () => {
        setFollowingLoading(true);
        try {
          const result = await getPostsFromFollowed(50);
          if (result?.success) {
            // Add isMutualFollow flag to all posts
            const posts = (result.data?.data || []).map((p) => ({
              ...p,
              isMutualFollow: true,
            }));
            setFollowingPosts(posts);
          } else {
            setFollowingPosts([]);
          }
        } catch (e) {
          setFollowingPosts([]);
        } finally {
          setFollowingLoading(false);
        }
      };

      loadFollowingPosts();
    } else {
      setFollowingPosts([]);
    }
  }, [activeTab]);

  // Reload posts when switching to "for-you" tab
  const previousTabRef = useRef(activeTab);
  useEffect(() => {
    if (previousTabRef.current !== "for-you" && activeTab === "for-you") {
      // Switched to "for-you" tab - reload posts
      if (userLocation) {
        fetchHomePosts(userLocation.lat, userLocation.lng);
      }
    }
    previousTabRef.current = activeTab;
  }, [activeTab, userLocation]);

  // ================== FRONTEND-ONLY FILTER/SEARCH ==================
  const visiblePosts = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    // Use followingPosts when on "following" tab, otherwise use feedPosts
    let posts =
      activeTab === "following" ? followingPosts || [] : feedPosts || [];

    // Search filter
    posts = posts.filter((p) => {
      if (!q) return true;
      const name = (getDisplayName(p) || "").toLowerCase();
      const content = (p?.content || "").toLowerCase();
      return name.includes(q) || content.includes(q);
    });

    // Has location filter
    posts = posts.filter((p) => (!onlyHasLocation ? true : !!getPostLatLng(p)));

    // Distance filter
    posts = posts.filter((p) => {
      if (filterDistance === "all") return true;
      const d = p?.distanceKm;
      if (typeof d !== "number") return false;
      return d <= parseInt(filterDistance);
    });

    // Time filter
    posts = posts.filter((p) => {
      if (filterTime === "all") return true;
      const postDate = new Date(p.createdAt);
      const now = new Date();
      const diffTime = now - postDate;

      if (filterTime === "today") {
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        return postDate >= today;
      } else if (filterTime === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return postDate >= weekAgo;
      } else if (filterTime === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return postDate >= monthAgo;
      }
      return true;
    });

    // Type filter (image/video)
    posts = posts.filter((p) => {
      if (filterType === "all") return true;
      const mediaType = p.type || "image";
      return mediaType === filterType;
    });

    // Tags filter
    posts = posts.filter((p) => {
      if (filterTags.length === 0) return true;
      const postTags =
        p.tags?.map((t) => (typeof t === "string" ? t : t._id)) || [];
      return filterTags.some((tagId) => postTags.includes(tagId));
    });

    // Sort
    if (filterSort === "popular") {
      posts = [...posts].sort(
        (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0),
      );
    }

    return posts;
  }, [
    feedPosts,
    searchText,
    onlyHasLocation,
    onlyNearby,
    filterDistance,
    filterTime,
    filterSort,
    filterType,
    filterTags,
  ]);

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
        setCurrentCardIndex((prev) =>
          Math.min(prev + 1, visiblePosts.length - 1),
        );
      } else {
        // Swipe left - previous card
        setCurrentCardIndex((prev) => Math.max(prev - 1, 0));
      }
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };

  const goToNextCard = () => {
    if (currentCardIndex < visiblePosts.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
    }
  };

  const currentPost = visiblePosts[currentCardIndex];
  const cardRotation = isSwiping
    ? (currentX.current - startX.current) * 0.05
    : 0;
  const cardTranslate = isSwiping ? currentX.current - startX.current : 0;

  return (
    <div className="mobile-wrapper">
      <header className="home-header">
        {/* Logo - click to refresh */}
        <button
          className="home-logo"
          title="Trang chủ"
          onClick={() => window.location.reload()}
        >
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
            onClick={openRanking}
            title="Bảng xếp hạng"
          >
            <i className="fa-solid fa-trophy"></i>
          </button>
          <button
            className="header-action-btn"
            onClick={() => setFilterOpen((v) => !v)}
            title="Lọc"
            style={{ display: "none" }}
          >
            <i className="fa-solid fa-sliders"></i>
          </button>
        </div>
      </header>

      {/* search + filter - only show when expanded */}
      {searchExpanded && (
        <>
          <button
            type="button"
            className="search-backdrop"
            aria-label="Đóng tìm kiếm"
            onClick={closeSearch}
          />

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
                    closeSearch();
                  }}
                  aria-label="Close search"
                >
                  <i className="fa-solid fa-arrow-left" />
                </button>
              ) : (
                <button
                  type="button"
                  className="home-search-clear"
                  onClick={closeSearch}
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
                          closeSearch();
                        }}
                      >
                        <div className="search-result-avatar">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.fullname || user.username}
                            />
                          ) : (
                            <i className="fa-solid fa-user"></i>
                          )}
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-name">
                            {user.fullname || user.username}
                          </div>
                          <div className="search-result-username">
                            @{user.username}
                          </div>
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
                                  u._id === user._id
                                    ? { ...u, isFollowing: false }
                                    : u,
                                ),
                              );
                            } else {
                              await userApi.followUser(user._id);
                              setSearchResults((prev) =>
                                prev.map((u) =>
                                  u._id === user._id
                                    ? { ...u, isFollowing: true }
                                    : u,
                                ),
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
                  <div className="search-no-results">
                    Không tìm thấy người dùng
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <main className="home-main">
        {(loading || followingLoading) && (
          <div style={{ padding: 12, textAlign: "center" }}>
            Đang tải bài đăng...
          </div>
        )}

        {errMsg && !loading && !followingLoading && (
          <div style={{ padding: 12, textAlign: "center" }}>
            <p>{errMsg}</p>
            <button onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        )}

        {!loading &&
          !followingLoading &&
          !errMsg &&
          visiblePosts.length > 0 && (
            <div className="swipe-cards-container">
              {/* Card stack */}
              <div
                className="swipe-card-wrapper"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: "none" }}
              >
                {visiblePosts.map((post, idx) => {
                  const isActive = idx === currentCardIndex;
                  const isVisible =
                    idx >= currentCardIndex && idx <= currentCardIndex + 1;

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
                        pointerEvents: isActive ? "auto" : "none",
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
                            <img
                              src={media}
                              alt="Post"
                              className="swipe-card-image"
                            />
                          )
                        ) : (
                          <div className="swipe-card-no-media">
                            {post.content}
                          </div>
                        )}

                        {/* Location button - always show if post has location */}
                        {hasPlace && (
                          <button
                            className="swipe-card-location-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToPostOnMap(post);
                            }}
                          >
                            <i className="fa-solid fa-location-dot"></i>
                          </button>
                        )}

                        {/* Report button */}
                        <button
                          className="swipe-card-more-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReportMenu(e, post._id);
                          }}
                        >
                          <i className="fa-solid fa-ellipsis"></i>
                        </button>
                        {dropdownPostId === String(post._id) && (
                          <div className="report-dropdown">
                            <button
                              className="dropdown-item warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("report", post, e);
                              }}
                            >
                              <i className="fa-solid fa-flag"></i> Báo cáo
                            </button>
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction("block", post, e);
                              }}
                            >
                              <i className="fa-solid fa-ban"></i> Chặn người
                              dùng
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Overlay: User info, Tags, Content on image */}
                      <div className="swipe-card-overlay">
                        <Link
                          to={`/profile/${post.user?._id}`}
                          className="swipe-card-user-row"
                        >
                          <div className="swipe-card-avatar">
                            {post.user?.avatar ? (
                              <img src={post.user.avatar} alt="" />
                            ) : (
                              <i className="fa-solid fa-user"></i>
                            )}
                          </div>
                          <div className="swipe-card-name">
                            <span className="swipe-card-username">
                              {getDisplayName(post)}
                            </span>
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
                              <span
                                key={tag._id || idx}
                                className="swipe-card-tag"
                              >
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

        {!loading &&
          !followingLoading &&
          !errMsg &&
          visiblePosts.length === 0 && (
            <div className="swipe-empty">
              <i
                className={`fa-solid ${activeTab === "following" ? "fa-user-plus" : "fa-inbox"}`}
              ></i>
              <p>
                {activeTab === "following"
                  ? "Không có bài viết nào từ người bạn follow"
                  : "Không có bài đăng nào"}
              </p>
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

      <RankingModal
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        data={rankingData}
        loading={rankingLoading}
      />

      {/* Floating Filter Button - Top left */}
      {!searchExpanded && (
        <button
          className={`filter-floating-btn ${hasActiveFilter ? "active" : ""}`}
          onClick={() => setFilterOpen(true)}
          title="Bộ lọc"
        >
          <i className="fa-solid fa-sliders"></i>
          {hasActiveFilter && <span className="filter-active-dot"></span>}
        </button>
      )}

      {/* Filter Modal - Floating panel */}
      {filterOpen && (
        <div
          className="filter-modal-backdrop"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="filter-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="filter-modal-header">
              <span className="filter-modal-title">Bộ lọc</span>
              <button
                className="filter-modal-close"
                onClick={() => setFilterOpen(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Loại bài đăng */}
            <div className="filter-section">
              <label className="filter-label">Loại bài đăng</label>
              <div className="filter-options">
                <button
                  className={`filter-option-btn ${filterType === "all" ? "active" : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`filter-option-btn ${filterType === "image" ? "active" : ""}`}
                  onClick={() => setFilterType("image")}
                >
                  <i className="fa-regular fa-image"></i> Hình ảnh
                </button>
                <button
                  className={`filter-option-btn ${filterType === "video" ? "active" : ""}`}
                  onClick={() => setFilterType("video")}
                >
                  <i className="fa-solid fa-video"></i> Video
                </button>
              </div>
            </div>

            {/* Tags - grouped by category, collapsible */}
            <div className="filter-section">
              <label className="filter-label">Tags</label>
              {tagsLoading ? (
                <span style={{ color: "#999", fontSize: "14px" }}>
                  Đang tải...
                </span>
              ) : tagCategories.length > 0 ? (
                tagCategories.map((category) => (
                  <div
                    key={category._id}
                    style={{
                      marginBottom: "12px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      onClick={() => toggleCategory(category._id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 14px",
                        background: "rgba(0,0,0,0.03)",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#333",
                        }}
                      >
                        {category.name}
                      </span>
                      <i
                        className={`fa-solid fa-chevron-${expandedCategories[category._id] ? "up" : "down"}`}
                        style={{ fontSize: "12px", color: "#666" }}
                      ></i>
                    </div>
                    {expandedCategories[category._id] && (
                      <div
                        className="filter-options"
                        style={{ padding: "12px" }}
                      >
                        {category.tags?.map((tag) => (
                          <button
                            key={tag._id}
                            className={`filter-option-btn ${filterTags.includes(tag._id) ? "active" : ""}`}
                            onClick={() => toggleFilterTag(tag._id)}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <span style={{ color: "#999", fontSize: "14px" }}>
                  Không có tags
                </span>
              )}
            </div>

            {/* Thời gian */}
            <div className="filter-section">
              <label className="filter-label">Thời gian</label>
              <div className="filter-options">
                <button
                  className={`filter-option-btn ${filterTime === "all" ? "active" : ""}`}
                  onClick={() => setFilterTime("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`filter-option-btn ${filterTime === "today" ? "active" : ""}`}
                  onClick={() => setFilterTime("today")}
                >
                  Hôm nay
                </button>
                <button
                  className={`filter-option-btn ${filterTime === "week" ? "active" : ""}`}
                  onClick={() => setFilterTime("week")}
                >
                  Tuần này
                </button>
                <button
                  className={`filter-option-btn ${filterTime === "month" ? "active" : ""}`}
                  onClick={() => setFilterTime("month")}
                >
                  Tháng này
                </button>
              </div>
            </div>

            {/* Sắp xếp */}
            <div className="filter-section">
              <label className="filter-label">Sắp xếp</label>
              <div className="filter-options">
                <button
                  className={`filter-option-btn ${filterSort === "newest" ? "active" : ""}`}
                  onClick={() => setFilterSort("newest")}
                >
                  <i className="fa-solid fa-clock"></i> Mới nhất
                </button>
                <button
                  className={`filter-option-btn ${filterSort === "popular" ? "active" : ""}`}
                  onClick={() => setFilterSort("popular")}
                >
                  <i className="fa-solid fa-fire"></i> Nổi bật
                </button>
              </div>
            </div>

            {/* Checkbox options */}
            <label className="filter-modal-row">
              <input
                type="checkbox"
                checked={onlyHasLocation}
                onChange={(e) => setOnlyHasLocation(e.target.checked)}
              />
              <span>Chỉ bài có vị trí</span>
            </label>

            <div className="filter-modal-actions">
              <button
                type="button"
                className="filter-modal-reset"
                onClick={() => {
                  setFilterDistance("all");
                  setFilterTime("all");
                  setFilterSort("newest");
                  setFilterType("all");
                  setOnlyHasLocation(false);
                  setFilterTags([]);
                }}
              >
                Reset
              </button>

              <button
                type="button"
                className="filter-modal-apply"
                onClick={() => setFilterOpen(false)}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
