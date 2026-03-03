// frontend/src/components/stranger_profile/stranger_profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import { addReaction, removeReaction } from "../../api/postApi";
import { useLocationAccess } from "../../context/LocationAccessContext";
import TagDisplay from "../profile/TagDisplay";
import TagSelectionModal from "../profile/TagSelectionModal";
import "./stranger_profile.css";

/** ===== SVG ICONS (không phụ thuộc FontAwesome) ===== */
const IconMoreVertical = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 6h.01M12 12h.01M12 18h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconBlock = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M7.5 16.5L16.5 7.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const IconFlag = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 21V4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 4h11l-1.5 4L16 12H5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const isVideoUrl = (url = "") => {
  const u = url.toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".mov") ||
    u.includes("/video/upload/") ||
    u.includes("video")
  );
};

const formatDateOfBirth = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN");
};
export default function StrangerProfile() {
  const params = useParams();
  const navigate = useNavigate();
  const { location: userLocation } = useLocationAccess();

  // hỗ trợ cả 2 route param:
  // - /profile/:userId  -> params.userId
  // - /stranger_profile/:id -> params.id
  const targetUserId = useMemo(
    () => params.userId || params.id || null,
    [params],
  );

  // Reaction state
  const [reactionStates, setReactionStates] = useState({});

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0 });
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [canViewPosts, setCanViewPosts] = useState(true);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Tags
  const [userTags, setUserTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);

  const menuRef = useRef(null);

  const fetchProfile = async (page = 1) => {
    if (!targetUserId) {
      setErr("Invalid userId");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErr("");

      // API: { success, data: { user, stats, posts, pagination } }
      const res = await userApi.getUserProfile({
        userId: targetUserId,
        page,
        limit: 10,
      });
      const payload = res.data?.data;

      setProfile(payload?.user || null);
      setStats(payload?.stats || { posts: 0, followers: 0 });
      setIsFollowing(Boolean(payload?.relationship?.isFollowing));
      setIsOwner(Boolean(payload?.relationship?.isOwner));
      setCanViewPosts(Boolean(payload?.relationship?.canViewPosts));
      setPosts(payload?.posts || []);
      setPagination(
        payload?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load profile";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    if (!targetUserId) return;
    try {
      const data = await userApi.getUserPreferredTags(targetUserId);
      setUserTags(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silent fail - tags are optional
      console.error("Failed to load user tags:", e);
    }
  };

  useEffect(() => {
    fetchProfile(1);
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  // click outside để đóng menu header
  useEffect(() => {
    const onDocClick = (e) => {
      if (!showHeaderMenu) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showHeaderMenu]);

  const displayName = profile?.fullname || profile?.username || "User";
  const displayBio = profile?.bio?.trim() ? profile.bio : "Chưa có bio";
  const profileMetaRows = [
    { label: "Email", value: profile?.email || "" },
    { label: "SĐT", value: profile?.phoneNumber || "" },
    { label: "Ngày sinh", value: formatDateOfBirth(profile?.dateOfBirth) },
  ].filter((row) => row.value);

  const handleBlock = async () => {
    setShowHeaderMenu(false);
    if (!profile?._id || isOwner) return;

    const ok = window.confirm("Bạn có chắc muốn chặn người dùng này?");
    if (!ok) return;

    try {
      await userApi.blockUser(profile._id);
      alert("Đã chặn người dùng");
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Chặn người dùng thất bại";
      alert(msg);
    }
  };

  const handleReport = () => {
    setShowHeaderMenu(false);
    alert("Report: (tạm thời chưa có BE)");
  };

  const handleShowAllTags = () => {
    setShowTagModal(true);
  };

  const handleToggleFollow = async () => {
    if (!profile?._id) return;

    // Prevent double taps
    if (followPending) return;

    setFollowPending(true);
    try {
      if (isFollowing) {
        const res = await userApi.unfollowUser(profile._id);
        setIsFollowing(false);
        setCanViewPosts(false); // After unfollow, may not see posts anymore
        setPosts([]); // Clear posts
        const newCount = res?.data?.data?.followers;
        if (typeof newCount === "number") {
          setStats((s) => ({ ...s, followers: newCount }));
        } else {
          setStats((s) => ({
            ...s,
            followers: Math.max(0, (s.followers || 0) - 1),
          }));
        }
      } else {
        const res = await userApi.followUser(profile._id);
        setIsFollowing(true);
        const newCount = res?.data?.data?.followers;
        if (typeof newCount === "number") {
          setStats((s) => ({ ...s, followers: newCount }));
        } else {
          setStats((s) => ({ ...s, followers: (s.followers || 0) + 1 }));
        }
        // Refresh profile to check if mutual follow - then can view posts
        fetchProfile(1);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Follow failed";
      alert(msg);
    } finally {
      setFollowPending(false);
    }
  };

  // Toggle like reaction on post
  const handleToggleLike = async (e, postId) => {
    e.stopPropagation();
    const currentState = reactionStates[postId] || {
      reacted: false,
      loading: false,
    };
    if (currentState.loading) return;

    const isReacted = currentState.reacted;
    const newReacted = !isReacted;
    const newCount = (currentState.count || 0) + (newReacted ? 1 : -1);

    // Optimistic update
    setReactionStates((prev) => ({
      ...prev,
      [postId]: { reacted: newReacted, loading: true, count: newCount },
    }));

    try {
      if (isReacted) {
        await removeReaction(postId);
      } else {
        await addReaction(
          postId,
          "like",
          userLocation?.latitude,
          userLocation?.longitude,
        );
      }
      setReactionStates((prev) => ({
        ...prev,
        [postId]: { reacted: newReacted, loading: false, count: newCount },
      }));
    } catch (err) {
      setReactionStates((prev) => ({
        ...prev,
        [postId]: {
          reacted: isReacted,
          loading: false,
          count: currentState.count,
        },
      }));
      console.error("Reaction error:", err);
    }
  };

  if (loading) {
    return (
      <div className="mobile-wrapper stranger-profile">
        <div style={{ color: "black", textAlign: "center", marginTop: 50 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mobile-wrapper stranger-profile">
        <header className="top-nav">
          <Link to="/home" className="nav-btn" aria-label="Back">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
        </header>

        <div style={{ color: "black", textAlign: "center", marginTop: 80 }}>
          <div style={{ marginBottom: 12 }}>{err}</div>
          <button className="follow-btn" onClick={() => fetchProfile(1)}>
            THỬ LẠI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-wrapper stranger-profile">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-header-left">
          <button
            type="button"
            className="profile-header-btn"
            aria-label="Back"
            onClick={() => navigate(-1)}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
        </div>
        <span className="profile-header-title">{displayName}</span>
        <div className="profile-header-right" ref={menuRef}>
          <button
            type="button"
            className="profile-header-btn"
            aria-label="More"
            onClick={(e) => {
              e.stopPropagation();
              setShowHeaderMenu((v) => !v);
            }}
          >
            <IconMoreVertical />
          </button>

          <div className={`header-menu ${showHeaderMenu ? "show" : ""}`}>
            <button type="button" className="menu-item" onClick={handleBlock}>
              <IconBlock />
              <span>Block</span>
            </button>
            <button
              type="button"
              className="menu-item danger"
              onClick={handleReport}
            >
              <IconFlag />
              <span>Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Profile Section */}
      <div className="profile-main">
        {/* Profile Info - Instagram Style */}
        <div className="profile-info-section">
          {/* Avatar */}
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="avatar" />
              ) : (
                <div className="avatar-fallback">
                  <span className="avatar-dot" />
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-user-stats">
            <div className="profile-stat">
              <span className="profile-stat-num">
                {stats?.posts ?? posts.length ?? 0}
              </span>
              <span className="profile-stat-label">posts</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{stats?.followers ?? 0}</span>
              <span className="profile-stat-label">followers</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{stats?.following ?? 0}</span>
              <span className="profile-stat-label">following</span>
            </div>
          </div>
        </div>

        {/* Name and Bio */}
        <div className="profile-name-section">
          <div className="profile-name-row">
            <span className="profile-username">{displayName}</span>
          </div>
          {displayBio && <p className="profile-bio">{displayBio}</p>}
          {profileMetaRows.length > 0 && (
            <div className="profile-meta-list">
              {profileMetaRows.map((row) => (
                <p key={row.label} className="profile-meta-item">
                  <strong>{row.label}:</strong> {row.value}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {!isOwner && (
            <button
              className={`profile-action-btn ${isFollowing ? "" : "primary"}`}
              onClick={handleToggleFollow}
              disabled={followPending}
            >
              {followPending ? "..." : isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Interests/Tags Section */}
        {userTags && userTags.length > 0 && (
          <div className="profile-interests">
            <h4 className="profile-section-title">Sở thích</h4>
            <div className="profile-tags-scroll">
              {userTags.map((tag) => (
                <span key={tag._id || tag.id} className="profile-tag">
                  <i className="fa-solid fa-hashtag"></i>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Posts Grid - Instagram Style */}
        {!canViewPosts ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#8e8e8e",
            }}
          >
            <i
              className="fa-solid fa-lock"
              style={{ fontSize: 32, marginBottom: 12 }}
            ></i>
            <p style={{ margin: 0, fontSize: 14 }}>
              Chỉ có thể xem bài viết khi hai người follow nhau
            </p>
          </div>
        ) : posts.length > 0 ? (
          <div className="profile-posts">
            {posts.map((p) => {
              const id = String(p._id || p.id);
              const media = Array.isArray(p.mediaUrl)
                ? p.mediaUrl[0]
                : p.mediaUrl;
              const isVideo = p.type === "video" || isVideoUrl(media);

              return (
                <div
                  className="profile-post-item"
                  key={id}
                  onClick={() => (window.location.href = `/posts/${id}`)}
                >
                  {media ? (
                    isVideo ? (
                      <video
                        src={media}
                        autoPlay
                        loop
                        playsInline
                        preload="auto"
                        muted
                        style={{
                          objectFit: "cover",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    ) : (
                      <img src={media} alt="post" />
                    )
                  ) : (
                    <div style={{ color: "#8e8e8e", fontSize: 12 }}>
                      No media
                    </div>
                  )}
                  <div
                    className="profile-post-overlay"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className={`profile-post-like-btn ${reactionStates[id]?.reacted ? "liked" : ""}`}
                      onClick={(e) => handleToggleLike(e, id)}
                      disabled={reactionStates[id]?.loading}
                    >
                      <i
                        className={`fa-solid fa-heart ${reactionStates[id]?.reacted ? "fas" : "far"}`}
                      ></i>
                      <span>
                        {reactionStates[id]?.count ??
                          p.reactionCount ??
                          p.likes ??
                          0}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
            NO POST YET
          </div>
        )}

        {canViewPosts && pagination.page < pagination.totalPages && (
          <button
            className="load-more-btn"
            onClick={() => fetchProfile(pagination.page + 1)}
          >
            <i className="fa-solid fa-plus"></i> Xem thêm bài viết
          </button>
        )}
      </div>

      {/* Tag Modal - View only mode */}
      <TagSelectionModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        currentTags={userTags}
        onSave={null}
      />
    </div>
  );
}
