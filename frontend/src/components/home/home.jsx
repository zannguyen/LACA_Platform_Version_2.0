// src/pages/Home/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./home.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const Home = () => {
  const [feedPosts, setFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // ====== FETCH POSTS FROM DB ======
  const fetchHomePosts = async () => {
    try {
      setLoading(true);
      setErrMsg("");

      const res = await fetch(`${API_BASE}/posts/home`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Get posts failed");
      }

      // data là array posts
      setFeedPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch home posts error:", err);
      setErrMsg(err.message || "Không thể tải bài đăng");
      setFeedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomePosts();
  }, []);

  // ====== UI handlers ======
  const toggleReportMenu = (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const dropdown = btn.nextElementSibling;
    document.querySelectorAll(".report-dropdown.show").forEach((d) => {
      if (d !== dropdown) d.classList.remove("show");
    });
    dropdown.classList.toggle("show");
  };

  const handleAction = (action) => {
    if (action === "block") alert("Đã chặn người dùng này!");
    else if (action === "report") alert("Đã báo cáo bài viết!");
    document
      .querySelectorAll(".report-dropdown.show")
      .forEach((d) => d.classList.remove("show"));
  };

  const parseLikeCount = (str) => {
    if (typeof str === "string" && str.includes("k"))
      return parseFloat(str) * 1000;
    return parseInt(str) || 0;
  };

  const formatLikeCount = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1).replace(".0", "") + "k";
    return num;
  };

  // UI like demo (vì backend reactions bạn chưa show)
  const handleLike = (e) => {
    const btn = e.currentTarget;
    const iconHeart = btn.querySelector("i");
    const likeCountDiv = btn.nextElementSibling;

    const isLiked = iconHeart.classList.contains("fa-solid");

    if (!isLiked) {
      iconHeart.classList.remove("fa-regular");
      iconHeart.classList.add("fa-solid");
      iconHeart.style.color = "#e0245e";
      let currentCount = parseLikeCount(likeCountDiv.innerText);
      likeCountDiv.innerText = formatLikeCount(currentCount + 1);
    } else {
      iconHeart.classList.remove("fa-solid");
      iconHeart.classList.add("fa-regular");
      iconHeart.style.color = "";
      let currentCount = parseLikeCount(likeCountDiv.innerText);
      if (currentCount > 0)
        likeCountDiv.innerText = formatLikeCount(currentCount - 1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".report-wrapper")) {
        document
          .querySelectorAll(".report-dropdown.show")
          .forEach((d) => d.classList.remove("show"));
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ====== helper lấy media ======
  const getFirstMedia = (post) => {
    // backend: mediaUrl: [String]
    const arr = Array.isArray(post.mediaUrl) ? post.mediaUrl : [];
    return arr[0] || "";
  };

  const isVideoUrl = (url) => {
    if (!url) return false;
    // cloudinary video thường có .mp4 hoặc /video/upload/
    return (
      url.toLowerCase().endsWith(".mp4") ||
      url.toLowerCase().includes("/video/upload/")
    );
  };

  const getDisplayName = (post) => {
    // nếu populate userId => post.userId.name / avatar
    if (post?.userId && typeof post.userId === "object") {
      return post.userId.name || post.userId.username || "User";
    }
    return "User";
  };

  const getUserIdForLink = (post) => {
    // nếu populate => post.userId._id
    if (post?.userId && typeof post.userId === "object") return post.userId._id;
    return post.userId;
  };

  // ====== RENDER ======
  return (
    <div className="mobile-wrapper">
      <input type="checkbox" id="menu-toggle" />
      <label htmlFor="menu-toggle" className="overlay"></label>

      <nav className="sidebar">
        <div className="sidebar-header">MENU</div>
        <Link to="/profile" className="sidebar-item">
          <i className="fa-regular fa-user"></i> Profile
        </Link>

        <Link to="/camera" className="sidebar-item">
          <i className="fa-solid fa-camera"></i> Camera
        </Link>

        <Link to="/chat" className="sidebar-item">
          <i className="fa-regular fa-comment-dots"></i> Chat
        </Link>

        <Link to="/map" className="sidebar-item">
          <i className="fa-regular fa-map"></i> Map
        </Link>

        <Link to="/setting" className="sidebar-item">
          <i className="fa-solid fa-gear"></i> Setting
        </Link>
      </nav>

      <header>
        <label htmlFor="menu-toggle" className="icon-btn">
          <i className="fa-solid fa-bars"></i>
        </label>
        <div className="header-title">LACA</div>
        <Link
          to="/notification"
          className="icon-btn"
          style={{ textDecoration: "none" }}
        >
          <i className="fa-regular fa-bell"></i>
        </Link>
      </header>

      <main>
        {/* trạng thái */}
        {loading && (
          <div style={{ padding: 12, textAlign: "center" }}>
            Đang tải bài...
          </div>
        )}

        {errMsg && !loading && (
          <div style={{ padding: 12, textAlign: "center" }}>
            <p style={{ marginBottom: 8 }}>{errMsg}</p>
            <button onClick={fetchHomePosts}>Tải lại</button>
          </div>
        )}

        {!loading && !errMsg && feedPosts.length === 0 && (
          <div style={{ padding: 12, textAlign: "center" }}>
            Chưa có bài đăng nào
          </div>
        )}

        {!loading &&
          !errMsg &&
          feedPosts.map((post) => {
            const media = getFirstMedia(post);
            const displayName = getDisplayName(post);
            const userId = getUserIdForLink(post);

            // content backend: content
            const caption = post.content || "";

            // type backend: type (có thể "text", "image", "video"...) -> fallback theo URL
            const isVideo =
              post.type === "video" ||
              (post.type !== "image" && isVideoUrl(media));

            return (
              <article className="post-card" key={post._id || post.id}>
                <div className="post-header">
                  <Link
                    to={`/stranger_profile/${userId}`}
                    className="user-info"
                  >
                    <div
                      className="user-avatar"
                      style={{ backgroundColor: "#ccc" }}
                    >
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <span className="username">{displayName}</span>
                  </Link>

                  <div className="report-wrapper">
                    <div className="report-btn" onClick={toggleReportMenu}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                    </div>
                    <div className="report-dropdown">
                      <div
                        className="dropdown-item"
                        onClick={() => handleAction("block")}
                      >
                        <i className="fa-solid fa-ban"></i> Block User
                      </div>
                      <div
                        className="dropdown-item warning"
                        onClick={() => handleAction("report")}
                      >
                        <i className="fa-solid fa-flag"></i> Report Post
                      </div>
                    </div>
                  </div>
                </div>

                <div className="post-image-wrapper">
                  {/* Nếu có media thì render, không có thì chỉ show caption */}
                  {media ? (
                    isVideo ? (
                      <video
                        src={media}
                        className="post-image"
                        muted
                        loop
                        autoPlay
                        playsInline
                        onClick={(e) => (e.target.muted = !e.target.muted)}
                      />
                    ) : (
                      <img src={media} alt="Post" className="post-image" />
                    )
                  ) : (
                    <div style={{ padding: 16 }}>
                      <p style={{ margin: 0 }}>{caption}</p>
                    </div>
                  )}

                  {caption && (
                    <div className="caption-overlay">
                      <p>{caption}</p>
                    </div>
                  )}
                </div>

                <div className="post-actions">
                  <button className="left-actions" onClick={handleLike}>
                    <i className="fa-regular fa-heart action-icon"></i>
                  </button>

                  {/* Nếu backend có reactionCount thì dùng, không thì mặc định 0 */}
                  <div className="like-count">
                    {post.reactionCount ?? post.likes ?? 0}
                  </div>

                  <Link to="#" className="right-actions">
                    <i className="fa-regular fa-comment action-icon"></i>
                  </Link>
                </div>
              </article>
            );
          })}
      </main>
    </div>
  );
};

export default Home;
