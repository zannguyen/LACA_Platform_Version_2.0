// frontend/src/components/profile/user_profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import userApi from "../../api/userApi";
import {
  deletePost,
  uploadMedia,
  addReaction,
  removeReaction,
  getReactionCount,
  getReactionStatus,
} from "../../api/postApi";
import { useLocationAccess } from "../../context/LocationAccessContext";
import TagDisplay from "./TagDisplay";
import TagSelectionModal from "./TagSelectionModal";
import "./user_profile.css";
import AvatarCropModal from "./AvatarCropModal";
import ProfilePostViewerModal from "./ProfilePostViewerModal";

/** ===== SVG ICONS (không phụ thuộc FontAwesome) ===== */
const IconMore = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 12h.01M12 12h.01M18 12h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconEdit = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 20h9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTrash = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 6h18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 6V4h8v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M19 6l-1 14H6L5 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 11v6M14 11v6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const isVideoUrl = (url = "") => {
  const u = String(url).toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".mov") ||
    u.includes("/video/upload/") ||
    u.includes("video")
  );
};

const pickFirstMedia = (post) => {
  if (!post) return "";
  if (Array.isArray(post.mediaUrl) && post.mediaUrl.length > 0)
    return post.mediaUrl[0];
  return post.image || "";
};

const normalizeProfilePayload = (res) => {
  const root = res?.data ? res : { data: res };
  const payload = root.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false)
      throw new Error(payload.message || "Request failed");
    return payload.data;
  }
  return payload;
};

const formatPostDate = (post) => {
  const raw =
    post?.createdAt ||
    post?.created_at ||
    post?.created ||
    post?.timestamp ||
    post?.date ||
    post?.updatedAt;

  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN");
};

const formatDateOfBirth = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN");
};
export default function UserProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { location: userLocation } = useLocationAccess();

  // Reaction state - lưu trạng thái like của từng bài viết
  const [reactionStates, setReactionStates] = useState({});
  const reactionFetchedRef = useRef(new Set());

  // IG-style viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  const [cropOpen, setCropOpen] = useState(false);
  const [avatarPick, setAvatarPick] = useState(null); // { src: string }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Edit profile
  const [isEditing, setIsEditing] = useState(false);
  const [draftFullname, setDraftFullname] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");

  // Tags
  const [userTags, setUserTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);

  // Post menu + modal delete
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const token = useMemo(
    () => localStorage.getItem("token") || localStorage.getItem("authToken"),
    [],
  );

  const fetchMyProfile = async ({ page = 1, append = false } = {}) => {
    setError("");
    try {
      const res = await userApi.getMyProfile({
        page,
        limit: pagination.limit || 10,
      });
      const data = normalizeProfilePayload(res);

      const nextProfile = data?.profile || data?.user || data?.me || null;
      const nextPosts = Array.isArray(data?.posts) ? data.posts : [];
      const nextStats = data?.stats || { posts: 0, followers: 0, following: 0 };
      const nextPagination = data?.pagination || {
        page,
        limit: pagination.limit || 10,
        total: nextPosts.length,
        totalPages: 1,
      };

      setProfile(nextProfile);
      setStats(nextStats);
      setPagination(nextPagination);
      setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Không thể tải profile";
      setError(msg);

      if (
        String(msg).toLowerCase().includes("token") ||
        e?.response?.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await userApi.getMyPreferredTags();
      // data is already an array from the API
      setUserTags(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silent fail - tags are optional
      console.error("Failed to load tags:", e);
      setUserTags([]);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchMyProfile({ page: 1 });
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // click outside -> đóng menu post
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  const handleEditToggle = async () => {
    if (!profile) return;

    if (!isEditing) {
      setDraftFullname(profile.fullname || "");
      setDraftBio(profile.bio || "");
      setDraftAvatar(profile.avatar || "");
      setIsEditing(true);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        fullname: draftFullname,
        bio: draftBio,
        avatar: draftAvatar,
      };
      const res = await userApi.updateMyProfile(payload);

      const root = res?.data ? res : { data: res };
      const body = root.data;

      if (body?.success === false)
        throw new Error(body?.message || "Update failed");
      const updatedUser = body?.data || body?.user || body;

      setProfile((prev) => ({
        ...(prev || {}),
        ...(updatedUser || {}),
        fullname: updatedUser?.fullname ?? prev?.fullname,
        bio: updatedUser?.bio ?? prev?.bio,
        avatar: updatedUser?.avatar ?? prev?.avatar,
      }));

      setIsEditing(false);
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Cập nhật profile thất bại",
      );
    } finally {
      setSaving(false);
    }
  };

  const triggerAvatarPick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // tạo preview (để crop)
    const src = URL.createObjectURL(file);
    setAvatarPick({ src });
    setCropOpen(true);

    // reset input để chọn lại cùng 1 file vẫn trigger
    e.target.value = "";
  };
  const closeCropModal = () => {
    setCropOpen(false);
    if (avatarPick?.src) URL.revokeObjectURL(avatarPick.src);
    setAvatarPick(null);
  };

  const handleSaveCroppedAvatar = async (blob) => {
    setSaving(true);
    setError("");
    try {
      // blob -> File để uploadMedia dùng được tên file
      const file = new File([blob], `avatar_${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });

      const up = await uploadMedia(file);
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload avatar thất bại (không có URL)");

      setDraftAvatar(url);

      const res = await userApi.updateMyProfile({ avatar: url });
      const root = res?.data ? res : { data: res };
      const body = root.data;
      if (body?.success === false)
        throw new Error(body?.message || "Update failed");

      const updatedUser = body?.data || body;

      setProfile((prev) => ({
        ...(prev || {}),
        ...(updatedUser || {}),
        avatar: updatedUser?.avatar || url,
      }));

      closeCropModal();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể cập nhật avatar",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTags = async (tagIds) => {
    try {
      const data = await userApi.updateMyPreferredTags(tagIds);
      // data should be an array of tags
      setUserTags(Array.isArray(data) ? data : []);

      // Refresh tags from server to ensure they're properly populated
      setTimeout(() => {
        fetchTags();
      }, 300);
    } catch (err) {
      throw err; // Let component handle the error
    }
  };

  const handleShowAllInterests = () => {
    // Not used in new design, kept for compatibility
  };

  const togglePostMenu = (e, postId) => {
    e.stopPropagation();
    const sid = String(postId);
    setActiveMenuId((prev) => (prev === sid ? null : sid));
  };

  const handlePostEditClick = (e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setError("Chức năng sửa bài đăng sẽ được làm sau.");
  };

  const handleDeleteClick = (e, postId) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setPostToDelete(String(postId));
    setShowModal(true);
  };

  const closeDeleteModal = () => {
    setShowModal(false);
    setPostToDelete(null);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    setDeleting(true);
    setError("");

    const prevPosts = posts;
    setPosts((prev) =>
      prev.filter((p) => String(p._id || p.id) !== String(postToDelete)),
    );

    try {
      await deletePost(postToDelete);
      setPagination((p) => ({
        ...(p || {}),
        total: Math.max(0, (p?.total ?? prevPosts.length) - 1),
      }));
      closeDeleteModal();
    } catch (e) {
      setPosts(prevPosts);
      const msg =
        e?.response?.data?.message || e?.message || "Xóa bài đăng thất bại";
      setError(msg);

      if (e?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setDeleting(false);
    }
  };

  const canLoadMore = pagination?.page < pagination?.totalPages;
  const handleLoadMore = async () => {
    if (!canLoadMore) return;
    const nextPage = (pagination.page || 1) + 1;
    setLoading(true);
    await fetchMyProfile({ page: nextPage, append: true });
  };

  // Init reaction states for posts (sync with Home)
  useEffect(() => {
    const list = Array.isArray(posts) ? posts : [];
    const missing = list
      .map((p) => String(p?._id || p?.id || ""))
      .filter(Boolean)
      .filter((id) => !reactionFetchedRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const [countRes, statusRes] = await Promise.all([
              getReactionCount(id),
              getReactionStatus(id),
            ]);
            updates[id] = {
              reacted: Boolean(statusRes?.reacted),
              loading: false,
              count: Number(countRes?.total ?? 0),
            };
          } catch {
            updates[id] = { reacted: false, loading: false, count: 0 };
          } finally {
            reactionFetchedRef.current.add(id);
          }
        }),
      );

      if (cancelled) return;
      setReactionStates((prev) => ({ ...prev, ...updates }));
    })();

    return () => {
      cancelled = true;
    };
  }, [posts]);

  // Toggle like reaction on post
  const toggleLike = async (postId) => {
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
        const res = await removeReaction(postId);
        if (res?.success === false) throw new Error(res?.message);
      } else {
        const res = await addReaction(
          postId,
          "like",
          userLocation?.latitude,
          userLocation?.longitude,
        );
        if (res?.success === false) throw new Error(res?.message);
      }
      // Update state with success
      setReactionStates((prev) => ({
        ...prev,
        [postId]: { reacted: newReacted, loading: false, count: newCount },
      }));
    } catch (err) {
      // Revert on error
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

  const handleToggleLike = (e, postId) => {
    e.stopPropagation();
    toggleLike(postId);
  };

  const openViewerAt = (index) => {
    setViewerStartIndex(index);
    setViewerOpen(true);
  };

  const displayName = profile?.fullname || profile?.username || "User";
  const displayBio = isEditing ? draftBio : profile?.bio || "";
  const visibility = profile?.profileVisibility || {};
  const profileMetaRows = [
    {
      label: "Email",
      value: visibility.email === false ? "" : profile?.email || "",
    },
    {
      label: "SĐT",
      value: visibility.phoneNumber === false ? "" : profile?.phoneNumber || "",
    },
    {
      label: "Ngày sinh",
      value:
        visibility.dateOfBirth === false
          ? ""
          : formatDateOfBirth(profile?.dateOfBirth),
    },
  ].filter((row) => row.value);

  if (loading && !profile) {
    return (
      <div className="mobile-wrapper my-profile">
        <div style={{ color: "black", textAlign: "center", marginTop: 50 }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-wrapper my-profile">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-header-left">
          <button
            type="button"
            className="profile-header-btn"
            aria-label="Back"
            onClick={handleBack}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
        </div>
        <span className="profile-header-title">{displayName}</span>
        <div className="profile-header-right">
          <Link to="/setting" className="profile-header-icon" title="Cài đặt">
            <i className="fa-solid fa-gear"></i>
          </Link>
        </div>
      </header>

      {/* Main Profile Section */}
      <div className="profile-main">
        {!!error && (
          <div style={{ marginBottom: 12, color: "#b00020", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Profile Info - Instagram Style */}
        <div className="profile-info-section">
          {/* Avatar */}
          <div className="profile-avatar-section">
            <div
              className="profile-avatar"
              onClick={triggerAvatarPick}
              style={{ cursor: isEditing ? "pointer" : "default" }}
              title={isEditing ? "Bấm để đổi avatar" : ""}
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="avatar" />
              ) : (
                <div className="avatar-fallback">
                  <span className="avatar-dot" />
                </div>
              )}
              {isEditing && (
                <div className="profile-avatar-edit">
                  <i className="fa-solid fa-camera"></i>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={onAvatarSelected}
            />
          </div>

          {/* Stats Row */}
          <div className="profile-user-stats">
            <div className="profile-stat">
              <span className="profile-stat-num">
                {stats?.posts !== undefined ? stats.posts : posts.length}
              </span>
              <span className="profile-stat-label">posts</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">
                {stats?.followers !== undefined ? stats.followers : 0}
              </span>
              <span className="profile-stat-label">followers</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">
                {stats?.following !== undefined ? stats.following : 0}
              </span>
              <span className="profile-stat-label">following</span>
            </div>
          </div>
        </div>

        {/* Name and Bio */}
        <div className="profile-name-section">
          <div className="profile-name-row">
            <span className="profile-username">{displayName}</span>
          </div>
          {isEditing ? (
            <textarea
              className="profile-bio-input"
              placeholder="Viết bio của bạn..."
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              rows={3}
              maxLength={150}
            />
          ) : (
            displayBio && <p className="profile-bio">{displayBio}</p>
          )}
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
          <button
            className="profile-action-btn primary"
            onClick={handleEditToggle}
            disabled={saving}
          >
            {saving ? "Saving..." : isEditing ? "Save Note" : "Edit Note"}
          </button>
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
              <button
                className="profile-tag"
                onClick={() => setShowTagModal(true)}
                style={{ cursor: "pointer", border: "none" }}
              >
                <i className="fa-solid fa-plus"></i> Thêm
              </button>
            </div>
          </div>
        )}

        {/* Posts Grid - Instagram Style */}
        <div className="profile-posts">
          {posts.length > 0 ? (
            posts.map((p, idx) => {
              const id = String(p._id || p.id);
              const media = pickFirstMedia(p);
              const isVideo = p.type === "video" || isVideoUrl(media);
              const createdAt = formatPostDate(p);
              const caption = p.content || p.caption || "";
              const placeName = p?.placeId?.name || p?.placeName || "";

              return (
                <div
                  className="profile-post-item"
                  key={id}
                  onClick={() => openViewerAt(idx)}
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
                  {placeName ? (
                    <div
                      className="profile-post-location-badge"
                      title={placeName}
                    >
                      <i className="fa-solid fa-location-dot" />
                      <span>{placeName}</span>
                    </div>
                  ) : null}
                  <div
                    className="profile-post-overlay"
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
            })
          ) : (
            <div style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
              NO POST YET
            </div>
          )}
        </div>

        {canLoadMore && (
          <button
            className="load-more-btn"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Đang tải...
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus"></i> Xem thêm bài viết
              </>
            )}
          </button>
        )}
      </div>

      {/* Modal delete (giữ nguyên) */}
      <div
        className="modal-overlay"
        style={{ display: showModal ? "flex" : "none" }}
        onClick={closeDeleteModal}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <p className="modal-text">ARE YOU SURE YOU WANT TO DELETE?</p>
          <div className="modal-actions">
            <button
              className="btn-modal btn-no"
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              NO
            </button>
            <button
              className="btn-modal btn-yes"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "..." : "YES"}
            </button>
          </div>
          {deleting ? (
            <div style={{ marginTop: 10, fontSize: 11, color: "#666" }}>
              Đang xóa...
            </div>
          ) : null}
        </div>
      </div>

      {/* Tag Selection Modal */}
      <TagSelectionModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        currentTags={userTags}
        onSave={handleSaveTags}
      />
      <AvatarCropModal
        open={cropOpen}
        imageSrc={avatarPick?.src}
        busy={saving}
        onCancel={closeCropModal}
        onSaveBlob={handleSaveCroppedAvatar}
      />

      <ProfilePostViewerModal
        open={viewerOpen}
        posts={posts}
        startIndex={viewerStartIndex}
        onClose={() => setViewerOpen(false)}
        reactionStates={reactionStates}
        onToggleLike={toggleLike}
        isOwnerProfile
      />
    </div>
  );
}
