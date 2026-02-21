// frontend/src/components/stranger_profile/stranger_profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import userApi from "../../api/userApi";
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

export default function StrangerProfile() {
  const params = useParams();

  // hỗ trợ cả 2 route param:
  // - /profile/:userId  -> params.userId
  // - /stranger_profile/:id -> params.id
  const targetUserId = useMemo(
    () => params.userId || params.id || null,
    [params],
  );

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
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

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

  useEffect(() => {
    fetchProfile(1);
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

  const handleBlock = () => {
    setShowHeaderMenu(false);
    alert("Block: (tạm thời chưa có BE)");
  };

  const handleReport = () => {
    setShowHeaderMenu(false);
    alert("Report: (tạm thời chưa có BE)");
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
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Follow failed";
      alert(msg);
    } finally {
      setFollowPending(false);
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
      <header className="top-nav">
        <Link to="/home" className="nav-btn" aria-label="Back">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>

        <div className="header-actions" ref={menuRef}>
          <button
            type="button"
            className="nav-btn"
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

      <div className="profile-container">
        <div className="details-section">
          <div className="avatar-large">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="avatar" />
            ) : (
              <div className="avatar-fallback">
                <span className="avatar-dot" />
              </div>
            )}
          </div>

          <div className="user-name-distance">
            <div className="user-name">{displayName}</div>
            <div className="user-id">ID: {profile?._id}</div>
            <div className="user-bio">{displayBio}</div>
          </div>
        </div>

        {/* Stats giống user_profile: posts + followers sát nhau, follow bên phải */}
        <div className="stats-row">
          <div className="stats-group">
            <span className="stat-item">
              <strong>{stats?.posts ?? posts.length ?? 0}</strong> Posts
            </span>
            <span className="stat-item">
              <strong>{stats?.followers ?? 0}</strong> Followers
            </span>
          </div>

          {!isOwner && (
            <button
              className={`follow-btn ${isFollowing ? "following" : ""}`}
              onClick={handleToggleFollow}
              disabled={followPending}
            >
              {followPending ? "..." : isFollowing ? "FOLLOWING" : "FOLLOW"}
            </button>
          )}
        </div>

        <h3 className="post-title">POSTS</h3>

        {/* Mỗi post có header giống user_profile: avatar + username */}
        <div className="posts-grid">
          {posts.map((p) => {
            const media = Array.isArray(p.mediaUrl) ? p.mediaUrl[0] : "";
            const isVideo = p.type === "video" || isVideoUrl(media);

            const createdAt = p.createdAt
              ? new Date(p.createdAt).toLocaleString()
              : "";

            return (
              <div className="post-item" key={p._id}>
                <div className="mini-post-header">
                  <div className="mini-user">
                    <div className="mini-avatar">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="" />
                      ) : null}
                    </div>
                    <span className="mini-username">{displayName}</span>
                    {createdAt ? (
                      <span className="mini-date">{createdAt}</span>
                    ) : null}
                  </div>
                </div>

                <div className="post-media">
                  {isVideo ? (
                    <video src={media} controls playsInline />
                  ) : (
                    <img src={media} alt="post" />
                  )}
                  <div className="post-caption">{p.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        {pagination.page < pagination.totalPages && (
          <button
            className="follow-btn"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => fetchProfile(pagination.page + 1)}
          >
            TẢI THÊM
          </button>
        )}
      </div>
    </div>
  );
}
