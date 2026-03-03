import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getPostDetail,
  deletePost,
  addReaction,
  removeReaction,
} from "../api/postApi";
import { useLocationAccess } from "../context/LocationAccessContext";
import userApi from "../api/userApi";
import "./PostDetailPage.css";

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { location: userLocation } = useLocationAccess();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const menuRef = useRef(null);

  const token = useMemo(
    () => localStorage.getItem("token") || localStorage.getItem("authToken"),
    [],
  );

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchPostDetail();
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, token]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchPostDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getPostDetail(postId);
      const data = res?.data || res;
      setPost(data);

      // Set like count and check if user liked
      const reactions = data?.reactions || [];
      const userId = currentUser?._id || currentUser?.id;
      const liked = reactions.some((r) => {
        const rUserId = r.userId?._id || r.userId?.id || r.userId;
        return rUserId === userId;
      });
      setIsLiked(liked);
      setLikeCount(data?.likeCount || reactions.length || 0);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to load post",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const userData = await userApi.getMyProfile();
      const data = userData?.data || userData;
      setCurrentUser(data?.profile || data?.user || data);
    } catch (err) {
      console.error("Failed to get current user:", err);
    }
  };

  const handleBlock = async () => {
    setShowMenu(false);
    if (!author?._id) return;
    const ok = window.confirm("Bạn có chắc muốn chặn người dùng này?");
    if (!ok) return;
    try {
      await userApi.blockUser(author._id);
      alert("Đã chặn người dùng");
      navigate(-1);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Chặn thất bại");
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!post?._id) return;
    const ok = window.confirm("Bạn có chắc muốn xóa bài đăng này?");
    if (!ok) return;
    try {
      await deletePost(post._id);
      alert("Đã xóa bài đăng");
      navigate(-1);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Xóa thất bại");
    }
  };

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);

    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        await removeReaction(postId);
      } else {
        await addReaction(
          postId,
          "like",
          userLocation?.latitude,
          userLocation?.longitude,
        );
      }
    } catch (err) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      alert(err?.response?.data?.message || "Không thể thả cảm xúc");
    } finally {
      setLiking(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isVideo = (url) => {
    if (!url) return false;
    return (
      url.endsWith(".mp4") ||
      url.endsWith(".webm") ||
      url.endsWith(".mov") ||
      url.includes("/video/upload/") ||
      url.includes("video")
    );
  };

  const handleMediaClick = (direction) => {
    if (!post?.mediaUrl || post.mediaUrl.length <= 1) return;

    if (direction === "next") {
      setCurrentMediaIndex((prev) =>
        prev === post.mediaUrl.length - 1 ? 0 : prev + 1,
      );
    } else {
      setCurrentMediaIndex((prev) =>
        prev === 0 ? post.mediaUrl.length - 1 : prev - 1,
      );
    }
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-error">
          <p>{error || "Post not found"}</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const mediaUrls = Array.isArray(post.mediaUrl)
    ? post.mediaUrl
    : post.mediaUrl
      ? [post.mediaUrl]
      : [];
  const author = post.userId;
  const isOwner =
    currentUser?._id === author?._id || currentUser?.id === author?._id;

  return (
    <div className="post-detail-page">
      {/* Header */}
      <header className="post-detail-header">
        <button className="post-detail-back" onClick={() => navigate(-1)}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <span className="post-detail-title">Post</span>
        <div className="post-detail-actions" ref={menuRef}>
          <button
            className="post-detail-more"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <i className="fa-solid fa-ellipsis"></i>
          </button>
          {showMenu && (
            <div className="post-menu-dropdown">
              {isOwner ? (
                <button
                  className="post-menu-item danger"
                  onClick={handleDelete}
                >
                  <i className="fa-solid fa-trash"></i>
                  Xóa bài đăng
                </button>
              ) : (
                <>
                  <button className="post-menu-item" onClick={handleBlock}>
                    <i className="fa-solid fa-ban"></i>
                    Chặn người dùng
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="post-detail-content">
        {/* Media Section */}
        {mediaUrls.length > 0 && (
          <div className="post-detail-media">
            <div className="post-detail-media-wrapper">
              {isVideo(mediaUrls[currentMediaIndex]) ? (
                <video
                  src={mediaUrls[currentMediaIndex]}
                  controls
                  className="post-detail-video"
                />
              ) : (
                <img
                  src={mediaUrls[currentMediaIndex]}
                  alt="Post media"
                  className="post-detail-image"
                />
              )}

              {/* Media Navigation */}
              {mediaUrls.length > 1 && (
                <>
                  <button
                    className="media-nav prev"
                    onClick={() => handleMediaClick("prev")}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    className="media-nav next"
                    onClick={() => handleMediaClick("next")}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                  <div className="media-dots">
                    {mediaUrls.map((_, idx) => (
                      <span
                        key={idx}
                        className={`media-dot ${idx === currentMediaIndex ? "active" : ""}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="post-detail-info">
          {/* Author */}
          <div className="post-detail-author">
            <Link
              to={
                isOwner ? "/profile" : `/profile/${author?._id || author?.id}`
              }
              className="author-avatar"
            >
              {author?.avatar ? (
                <img src={author.avatar} alt={author.username} />
              ) : (
                <div className="avatar-placeholder">
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
            </Link>
            <div className="author-info">
              <Link
                to={
                  isOwner ? "/profile" : `/profile/${author?._id || author?.id}`
                }
                className="author-name"
              >
                {author?.fullname || author?.username || "Unknown"}
              </Link>
              {post.placeId && (
                <span className="post-location">
                  <i className="fa-solid fa-location-dot"></i>
                  {post.placeId.name || "Unknown location"}
                </span>
              )}
            </div>
            {/* Like Button */}
            <button
              className={`post-detail-like-btn ${isLiked ? "liked" : ""}`}
              onClick={handleToggleLike}
              disabled={liking}
            >
              <i className={`fa-solid fa-heart ${isLiked ? "fas" : "far"}`}></i>
              <span>{likeCount}</span>
            </button>
          </div>

          {/* Caption */}
          {post.content && (
            <div className="post-detail-caption">
              <p>{post.content}</p>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="post-detail-tags">
              {post.tags.map((tag) => (
                <span
                  key={tag._id || tag.id}
                  className="post-tag"
                  style={tag.color ? { borderColor: tag.color } : {}}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          <div className="post-detail-date">{formatDate(post.createdAt)}</div>

          {/* Reactions - People who liked */}
          {post.reactions && post.reactions.length > 0 && (
            <div className="post-reactions">
              <div className="reactions-header">
                <i
                  className="fa-solid fa-heart"
                  style={{ color: "#ed4956" }}
                ></i>
                <span>{post.likeCount || post.reactions.length} likes</span>
              </div>
              <div className="reactions-list">
                {post.reactions.slice(0, 10).map((reaction, idx) => {
                  // Handle both populated and non-populated userId
                  const userId = reaction.userId;
                  const userIdStr =
                    typeof userId === "object"
                      ? userId?._id || userId?.id
                      : userId;
                  const userAvatar =
                    typeof userId === "object" ? userId?.avatar : null;
                  const isCurrentUser =
                    userIdStr === currentUser?._id ||
                    userIdStr === currentUser?.id;

                  return (
                    <Link
                      key={userIdStr || idx}
                      to={isCurrentUser ? "/profile" : `/profile/${userIdStr}`}
                      className="reaction-avatar"
                    >
                      {userAvatar ? (
                        <img src={userAvatar} alt="user" />
                      ) : (
                        <div className="avatar-placeholder-small">
                          <i className="fa-solid fa-user"></i>
                        </div>
                      )}
                    </Link>
                  );
                })}
                {post.reactions.length > 10 && (
                  <span className="more-reactions">
                    +{post.reactions.length - 10}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
