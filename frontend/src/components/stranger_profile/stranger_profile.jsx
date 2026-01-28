// src/pages/stranger_profile/stranger_profile.jsx
import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import "./stranger_profile.css";

const StrangerProfile = () => {
  // --- 1. KHAI BÁO TẤT CẢ HOOKS Ở ĐẦU ---
  const { id } = useParams();

  // Database giả
  const usersDatabase = [
    {
      userId: "user_a",
      name: "User A",
      bio: "1m79 | Gymer VN",
      posts: [
        {
          id: 1,
          type: "image",
          image:
            "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600",
          caption: "I'm always happy by your side.",
        },
        {
          id: 2,
          type: "image",
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
          caption: "Supermarket vibes 🛒",
        },
      ],
    },
    {
      userId: "hong_hanh",
      name: "Hồng Hạnh",
      bio: "Freelancer | Travel Lover ✈️",
      posts: [
        {
          id: 1,
          type: "image",
          image:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
          caption: "Ngày mới tốt lành!",
        },
        {
          id: 2,
          type: "image",
          image:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600",
          caption: "Chụp chơi mà đẹp thiệt :)",
        },
        {
          id: 3,
          type: "video",
          image:
            "https://cdn.pixabay.com/video/2023/10/22/186115-877653483_tiny.mp4",
          caption: "My vibe today",
        },
      ],
    },
    {
      userId: "tuan_anh",
      name: "Tuấn Anh",
      bio: "Photographer 📸 | Da Nang",
      posts: [
        {
          id: 1,
          type: "video",
          image: "https://cdn.pixabay.com/video/2024/03/31/206294_tiny.mp4",
          caption: "Sea vibes 🌊",
        },
        {
          id: 2,
          type: "image",
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
          caption: "Sunset...",
        },
      ],
    },
  ];

  const [userData, setUserData] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activePostMenuId, setActivePostMenuId] = useState(null);

  // useEffect 1: Tìm user
  useEffect(() => {
    const foundUser = usersDatabase.find((user) => user.userId === id);
    if (foundUser) {
      setUserData(foundUser);
    } else {
      setUserData({
        name: "Unknown User",
        bio: "User not found",
        posts: [],
      });
    }
  }, [id]);

  // useEffect 2: Click outside (Cái này lúc nãy bị chặn bởi lệnh return nên gây lỗi)
  useEffect(() => {
    const handleClickOutside = () => {
      setShowHeaderMenu(false);
      setActivePostMenuId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // --- 2. CÁC HÀM LOGIC ---
  const handleFollow = () => setIsFollowing(!isFollowing);

  const toggleHeaderMenu = (e) => {
    e.stopPropagation();
    setShowHeaderMenu(!showHeaderMenu);
    setActivePostMenuId(null);
  };

  const togglePostMenu = (e, postId) => {
    e.stopPropagation();
    if (activePostMenuId === postId) setActivePostMenuId(null);
    else {
      setActivePostMenuId(postId);
      setShowHeaderMenu(false);
    }
  };

  const handleAction = (action) => {
    alert(`Đã thực hiện: ${action}`);
    setShowHeaderMenu(false);
    setActivePostMenuId(null);
  };

  // --- 3. KIỂM TRA LOADING (ĐẶT Ở ĐÂY LÀ AN TOÀN) ---
  // [QUAN TRỌNG] Phải đặt sau tất cả các hooks ở trên
  if (!userData)
    return (
      <div style={{ color: "black", textAlign: "center", marginTop: 50 }}>
        Loading...
      </div>
    );

  // --- 4. RENDER GIAO DIỆN ---
  return (
    <div className="mobile-wrapper">
      <header className="top-nav">
        <Link to="/" className="nav-btn">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>

        <button className="nav-btn" onClick={toggleHeaderMenu}>
          <i className="fa-solid fa-ellipsis-vertical"></i>
        </button>

        <div
          className={`header-menu ${showHeaderMenu ? "show" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="menu-item danger"
            onClick={() => handleAction("Report User")}
          >
            <i className="fa-solid fa-flag"></i> Report User
          </div>
          <div
            className="menu-item danger"
            onClick={() => handleAction("Block User")}
          >
            <i className="fa-solid fa-ban"></i> Block User
          </div>
        </div>
      </header>

      <main className="profile-container">
        <div className="user-details-section">
          <div className="avatar-large"></div>
          <div className="user-text-info">
            <div className="user-name">{userData.name}</div>
            <p className="user-id">ID: {id}</p>
            <p className="user-bio">{userData.bio}</p>
          </div>
        </div>

        <div className="stats-action-section">
          <div className="stats-group">
            <span className="stat-item">
              <strong>{userData.posts.length}</strong> Posts
            </span>
            <span className="stat-item">
              <strong>10k</strong> Followers
            </span>
          </div>
          <button
            className={`follow-btn ${isFollowing ? "following" : ""}`}
            onClick={handleFollow}
          >
            {isFollowing ? "UNFOLLOW" : "FOLLOW"}
          </button>
        </div>

        <div
          className="section-label"
          style={{ color: "#000", fontWeight: "bold", marginBottom: "15px" }}
        >
          POSTS
        </div>

        <div className="post-list">
          {userData.posts.map((post) => (
            <article className="mini-post" key={post.id}>
              <div className="mini-post-header">
                <div className="mini-user">
                  <div className="mini-avatar"></div>
                  <span className="mini-username">{userData.name}</span>
                </div>

                <div
                  className="report-post-btn"
                  onClick={(e) => togglePostMenu(e, post.id)}
                >
                  <i className="fa-solid fa-circle-exclamation"></i>
                </div>

                <div
                  className={`post-menu ${activePostMenuId === post.id ? "show" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="menu-item danger"
                    onClick={() => handleAction("Report Post")}
                  >
                    <i className="fa-solid fa-flag"></i> Report Post
                  </div>
                </div>
              </div>

              <div className="post-image-wrapper">
                {post.type === "video" ? (
                  <video
                    src={post.image}
                    muted
                    loop
                    autoPlay
                    playsInline
                  ></video>
                ) : (
                  <img src={post.image} alt="Post" />
                )}
                <div className="overlay-caption">{post.caption}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StrangerProfile;
