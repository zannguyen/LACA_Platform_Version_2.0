// src/pages/Profile/UserProfile.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./user_profile.css";

const DEFAULT_POSTS = [
  {
    id: 999,
    type: "image",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600",
    caption: "I'm always happy by your side.",
    date: "20/10/2023",
  },
  {
    id: 998,
    type: "video",
    image: "https://cdn.pixabay.com/video/2023/10/22/186115-877653483_tiny.mp4",
    caption: "Chill vibes only 🎵",
    date: "19/10/2023",
  },
  {
    id: 997,
    type: "image",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
    caption: "Morning coffee ☕",
    date: "18/10/2023",
  },
];

const STORAGE_KEY = "user_posts";

const UserProfile = () => {
  const navigate = useNavigate();

  // --- POSTS ---
  const [posts, setPosts] = useState(DEFAULT_POSTS);

  // Load posts from localStorage (đẩy lên đầu, xóa trùng id)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      if (Array.isArray(saved) && saved.length > 0) {
        const merged = [...saved, ...DEFAULT_POSTS];
        const unique = merged.filter(
          (post, idx, arr) => idx === arr.findIndex((p) => p.id === post.id),
        );
        setPosts(unique);
      }
    } catch {
      // ignore
    }
  }, []);

  // --- EDIT PROFILE (name/bio) ---
  const [isEditing, setIsEditing] = useState(false);
  const nameRef = useRef(null);
  const bioRef = useRef(null);

  const handleEditToggle = () => {
    if (!isEditing) {
      setIsEditing(true);
      setTimeout(() => nameRef.current?.focus(), 0);
    } else {
      setIsEditing(false);
    }
  };

  // --- MENU 3 CHẤM ---
  const [activeMenuId, setActiveMenuId] = useState(null);

  const togglePostMenu = (e, postId) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === postId ? null : postId));
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // --- DELETE MODAL ---
  const [showModal, setShowModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  const handleDeleteClick = (postId) => {
    setActiveMenuId(null);
    setPostToDelete(postId);
    setShowModal(true);
  };

  const closeDeleteModal = () => {
    setShowModal(false);
    setPostToDelete(null);
  };

  const confirmDelete = () => {
    if (postToDelete == null) return;

    // update state
    const newPosts = posts.filter((p) => p.id !== postToDelete);
    setPosts(newPosts);

    // update storage (chỉ xóa trong user_posts)
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      const updated = Array.isArray(current)
        ? current.filter((p) => p.id !== postToDelete)
        : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    closeDeleteModal();
  };

  // --- BACK BUTTON (không bị “về / login”) ---
  const handleBack = () => {
    // Nếu có trang trước -> back
    // Nếu user mở trực tiếp -> về /home
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  return (
    <div className="mobile-wrapper">
      <header className="top-nav">
        <button type="button" className="back-btn" onClick={handleBack}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
      </header>

      <main className="profile-container">
        <div className="user-details-section">
          <div className="avatar-large"></div>

          <div className="user-text-info">
            <h2
              ref={nameRef}
              className={`user-name ${isEditing ? "editable" : ""}`}
              contentEditable={isEditing}
              suppressContentEditableWarning
            >
              User A
            </h2>

            <p className="user-id">ID: xxxxx</p>

            <p
              ref={bioRef}
              className={`user-bio ${isEditing ? "editable" : ""}`}
              contentEditable={isEditing}
              suppressContentEditableWarning
            >
              1m79 | Gymer VN
            </p>
          </div>
        </div>

        <div className="stats-action-section">
          <div className="stats-group">
            <span className="stat-item">
              <strong>{posts.length}</strong> Posts
            </span>
            <span className="stat-item">
              <strong>0</strong> Followers
            </span>
          </div>

          <button className="edit-profile-btn" onClick={handleEditToggle}>
            {isEditing ? "DONE" : "EDIT"}
          </button>
        </div>

        <div className="section-label">POSTS</div>

        <div className="post-list" id="postList">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article className="mini-post" key={post.id}>
                <div className="mini-post-header">
                  <div className="mini-user">
                    <div className="mini-avatar"></div>
                    <span className="mini-username">
                      {post.date ? post.date.split(",")[0] : "User A"}
                    </span>
                  </div>

                  <div className="mini-post-actions">
                    <button
                      type="button"
                      className="post-options-btn"
                      onClick={(e) => togglePostMenu(e, post.id)}
                    >
                      <i className="fa-solid fa-ellipsis"></i>
                    </button>

                    <div
                      className={`post-options-menu ${
                        activeMenuId === post.id ? "show" : ""
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="option-item"
                        onClick={() => alert("Tính năng sửa đang phát triển!")}
                      >
                        <i className="fa-solid fa-pen"></i> Edit
                      </div>
                      <div
                        className="option-item danger"
                        onClick={() => handleDeleteClick(post.id)}
                      >
                        <i className="fa-solid fa-trash"></i> Delete
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="post-image-wrapper">
                  {post.type === "video" ? (
                    <video
                      src={post.image}
                      muted
                      loop
                      autoPlay
                      playsInline
                      onClick={(e) => {
                        // bật/tắt tiếng khi click
                        e.currentTarget.muted = !e.currentTarget.muted;
                      }}
                    />
                  ) : (
                    <img src={post.image} alt="Post" />
                  )}

                  <div className="overlay-caption">{post.caption}</div>
                </div>
              </article>
            ))
          ) : (
            <div style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
              NO POST YET
            </div>
          )}
        </div>
      </main>

      {/* Modal delete */}
      <div
        className={`modal-overlay ${showModal ? "show" : ""}`}
        onClick={closeDeleteModal}
      >
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <p className="modal-text">ARE YOU SURE YOU WANT TO DELETE?</p>
          <div className="modal-actions">
            <button className="btn-modal btn-no" onClick={closeDeleteModal}>
              NO
            </button>
            <button className="btn-modal btn-yes" onClick={confirmDelete}>
              YES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
