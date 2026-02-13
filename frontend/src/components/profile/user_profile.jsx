// src/components/profile/user_profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./user_profile.css";
import userApi from "../../api/userApi";
import { deletePost, uploadMedia } from "../../api/postApi";

/** ===== SVG ICONS (không phụ thuộc FontAwesome) ===== */
const IconBack = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M15 18l-6-6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M19 6l-1 14H6L5 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const isVideoUrl = (url) =>
  url?.endsWith(".mp4") || url?.endsWith(".webm") || url?.endsWith(".mov") || url?.includes("/video/upload/");

const pickFirstMedia = (post) => {
  if (!post) return "";
  if (Array.isArray(post.mediaUrl) && post.mediaUrl.length > 0) return post.mediaUrl[0];
  return post.image || "";
};

const normalizeProfilePayload = (res) => {
  const root = res?.data ? res : { data: res };
  const payload = root.data;

  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) throw new Error(payload.message || "Request failed");
    return payload.data;
  }

  return payload;
};

const UserProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Edit profile
  const [isEditing, setIsEditing] = useState(false);
  const [draftFullname, setDraftFullname] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");

  // Post menu + modal delete
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const token = useMemo(() => localStorage.getItem("token") || localStorage.getItem("authToken"), []);

  const fetchMyProfile = async ({ page = 1, append = false } = {}) => {
    setError("");
    try {
      const res = await userApi.getMyProfile({ page, limit: pagination.limit || 10 });
      const data = normalizeProfilePayload(res);

      const nextProfile = data?.profile || data?.user || data?.me || null;
      const nextPosts = Array.isArray(data?.posts) ? data.posts : [];
      const nextPagination = data?.pagination || {
        page,
        limit: pagination.limit || 10,
        total: nextPosts.length,
        totalPages: 1,
      };

      setProfile(nextProfile);
      setPagination(nextPagination);
      setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Không thể tải profile";
      setError(msg);

      if (String(msg).toLowerCase().includes("token") || e?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchMyProfile({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // click outside để đóng menu
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
      const payload = { fullname: draftFullname, bio: draftBio, avatar: draftAvatar };
      const res = await userApi.updateMyProfile(payload);

      const root = res?.data ? res : { data: res };
      const body = root.data;

      if (body?.success === false) throw new Error(body?.message || "Update failed");
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
      setError(e?.response?.data?.message || e?.message || "Cập nhật profile thất bại");
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

    setSaving(true);
    setError("");
    try {
      const up = await uploadMedia(file);
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload avatar thất bại (không có URL)");

      setDraftAvatar(url);

      const res = await userApi.updateMyProfile({ avatar: url });
      const root = res?.data ? res : { data: res };
      const body = root.data;
      if (body?.success === false) throw new Error(body?.message || "Update failed");
      const updatedUser = body?.data || body;

      setProfile((prev) => ({
        ...(prev || {}),
        ...(updatedUser || {}),
        avatar: updatedUser?.avatar || url,
      }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể cập nhật avatar");
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  /** ===== POST MENU (FIX BUG toggleMenu undefined) ===== */
  const togglePostMenu = (e, postId) => {
    e.stopPropagation();
    const sid = String(postId);
    setActiveMenuId((prev) => (prev === sid ? null : sid));
  };

  const handlePostEditClick = (e) => {
    e.stopPropagation();
    setActiveMenuId(null);
    // Tạm thời chưa có BE edit post => chỉ thông báo nhẹ
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
    setPosts((prev) => prev.filter((p) => String(p._id || p.id) !== String(postToDelete)));

    try {
      await deletePost(postToDelete);
      setPagination((p) => ({
        ...(p || {}),
        total: Math.max(0, (p?.total ?? prevPosts.length) - 1),
      }));
      closeDeleteModal();
    } catch (e) {
      setPosts(prevPosts);
      const msg = e?.response?.data?.message || e?.message || "Xóa bài đăng thất bại";
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

  if (loading && !profile) {
    return (
      <div className="mobile-wrapper my-profile">
        <main className="profile-container" style={{ textAlign: "center", paddingTop: 60 }}>
          Đang tải profile...
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-wrapper my-profile">
      <header className="top-nav">
        <button type="button" className="back-btn" onClick={handleBack} aria-label="Back">
          <IconBack />
        </button>
      </header>

      <main className="profile-container">
        {!!error && <div style={{ marginBottom: 12, color: "#b00020", fontSize: 13 }}>{error}</div>}

        <div className="user-details-section">
          <div
            className="avatar-large"
            onClick={triggerAvatarPick}
            style={{ cursor: isEditing ? "pointer" : "default" }}
          >
            {profile?.avatar ? <img src={profile.avatar} alt="avatar" /> : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onAvatarSelected}
          />

          <div className="user-text-info">
            {isEditing ? (
              <input
                className="user-name editable"
                value={draftFullname}
                onChange={(e) => setDraftFullname(e.target.value)}
                maxLength={120}
              />
            ) : (
              <h2 className="user-name">{profile?.fullname || profile?.username || "User"}</h2>
            )}

            <p className="user-id">ID: {profile?._id || "-"}</p>

            {isEditing ? (
              <textarea
                className="user-bio editable"
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                maxLength={200}
                rows={2}
              />
            ) : (
              <p className="user-bio">{profile?.bio || ""}</p>
            )}

            {isEditing && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#333" }}>Tip: bấm vào avatar để đổi ảnh.</div>
            )}
          </div>
        </div>

        <div className="stats-action-section">
          <div className="stats-group">
            <span className="stat-item">
              <strong>{pagination?.total ?? posts.length}</strong> Posts
            </span>
            <span className="stat-item">
              <strong>0</strong> Followers
            </span>
          </div>

          <button className="edit-profile-btn" onClick={handleEditToggle} disabled={saving}>
            {saving ? "SAVING..." : isEditing ? "DONE" : "EDIT"}
          </button>
        </div>

        <div className="section-label">POSTS</div>

        <div className="post-list" id="postList">
          {posts.length > 0 ? (
            posts.map((post) => {
              const id = String(post._id || post.id);
              const media = pickFirstMedia(post);
              const isVideo = post.type === "video" || isVideoUrl(media);
              const caption = post.content || post.caption || "";
              const createdAt = post.createdAt ? new Date(post.createdAt) : null;
              const dateLabel = createdAt ? createdAt.toLocaleString() : post.date || "";

              return (
                <article className="mini-post" key={id}>
                  <div className="mini-post-header">
                    <div className="mini-user">
                      <div className="mini-avatar">{profile?.avatar ? <img src={profile.avatar} alt="" /> : null}</div>
                      <span className="mini-username">{profile?.fullname || profile?.username || "User"}</span>
                      {dateLabel ? <span style={{ marginLeft: 10, fontSize: 12, color: "#666" }}>{dateLabel}</span> : null}
                    </div>

                    <div className="mini-post-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="post-options-btn"
                        onClick={(e) => togglePostMenu(e, id)}
                        aria-label="More options"
                      >
                        <IconMore />
                      </button>

                      <div className={`post-options-menu ${activeMenuId === id ? "show" : ""}`}>
                        <div className="option-item" onClick={handlePostEditClick}>
                          <IconEdit />
                          <span>Edit</span>
                        </div>

                        <div className="option-item danger" onClick={(e) => handleDeleteClick(e, id)}>
                          <IconTrash />
                          <span>Delete</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="post-image-wrapper">
                    {media ? (
                      isVideo ? (
                        <video
                          src={media}
                          muted
                          loop
                          autoPlay
                          playsInline
                          onClick={(e) => {
                            e.currentTarget.muted = !e.currentTarget.muted;
                          }}
                        />
                      ) : (
                        <img src={media} alt="Post" />
                      )
                    ) : (
                      <div style={{ color: "#fff", fontSize: 12 }}>No media</div>
                    )}

                    {caption ? <div className="overlay-caption">{caption}</div> : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div style={{ textAlign: "center", marginTop: 50, color: "#666" }}>NO POST YET</div>
          )}

          {canLoadMore && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="edit-profile-btn" onClick={handleLoadMore} disabled={loading}>
                {loading ? "LOADING..." : "LOAD MORE"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal delete */}
      <div className={`modal-overlay ${showModal ? "show" : ""}`} onClick={closeDeleteModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <p className="modal-text">ARE YOU SURE YOU WANT TO DELETE?</p>
          <div className="modal-actions">
            <button className="btn-modal btn-no" onClick={closeDeleteModal} disabled={deleting}>
              NO
            </button>
            <button className="btn-modal btn-yes" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "..." : "YES"}
            </button>
          </div>
          {deleting ? <div style={{ marginTop: 10, fontSize: 11, color: "#666" }}>Đang xóa...</div> : null}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
