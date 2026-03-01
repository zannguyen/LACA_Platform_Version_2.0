import React from "react";
import "./PostsModal.css";

const PostsModal = ({ isOpen, onClose, posts, loading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="posts-modal-overlay" onClick={onClose}>
      <div className="posts-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="posts-modal-header">
          <h2>Bài viết tại vị trí này</h2>
          <button className="close-btn" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="posts-modal-body">
          {loading && (
            <div className="posts-loading">
              <div className="spinner"></div>
              <p>Đang tải bài viết...</p>
            </div>
          )}

          {error && (
            <div className="posts-error">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && posts && posts.length > 0 && (
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post._id} className="post-card">
                  <div className="post-user">
                    <div className="user-avatar">
                      {post.user?.fullname?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="user-info">
                      <h4>{post.user?.fullname || "Unknown User"}</h4>
                      <p>@{post.user?.username || "unknown"}</p>
                    </div>
                  </div>

                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.mediaUrl && (
                      <div className="post-media">
                        {post.type === "image" ? (
                          <img src={post.mediaUrl} alt="Post media" />
                        ) : post.type === "video" ? (
                          <video controls src={post.mediaUrl} />
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="post-footer">
                    <span className="post-distance">
                      📍 {post.distanceKm || 0} km
                    </span>
                    <span className="post-time">
                      {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && posts && posts.length === 0 && (
            <div className="posts-empty">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <p>Không có bài viết nào tại vị trí này</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostsModal;
