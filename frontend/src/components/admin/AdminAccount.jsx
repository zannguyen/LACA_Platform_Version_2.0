// Admin Account Management Page
import React, { useEffect, useRef, useState } from "react";
import userApi from "../../api/userApi";
import { authApi } from "../../api/authApi";
import { uploadMedia } from "../../api/postApi";
import AvatarCropModal from "../profile/AvatarCropModal";
import "./AdminAccount.css";

const AdminAccount = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Avatar upload states
  const [cropOpen, setCropOpen] = useState(false);
  const [avatarPick, setAvatarPick] = useState(null); // { src: string }
  const fileInputRef = useRef(null);

  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    bio: "",
    avatar: "",
  });

  // Fetch current admin profile
  const fetchProfile = async () => {
    setLoading(true);
    try {
      // First try to get user from localStorage (faster)
      const localUser = authApi.getCurrentUser();
      console.log("Local user:", localUser);

      if (localUser) {
        setProfile(localUser);
        setEditForm({
          fullName: localUser.fullName || localUser.fullname || "",
          username: localUser.username || "",
          bio: localUser.bio || "",
          avatar: localUser.avatar || "",
        });
        setLoading(false);
        return;
      }

      // Fallback to API
      const res = await userApi.getMyProfile();
      console.log("Profile API response:", res);

      // Handle different response formats
      let userData = res?.data;
      if (userData?.data) userData = userData.data;
      if (userData?.success) userData = userData;

      console.log("Parsed user data:", userData);
      setProfile(userData);
      setEditForm({
        fullName: userData?.fullName || userData?.fullname || "",
        username: userData?.username || "",
        bio: userData?.bio || "",
        avatar: userData?.avatar || "",
      });
      setError(null);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await userApi.updateMyProfile(editForm);
      if (res?.data?.success || res?.success) {
        setProfile((prev) => ({ ...prev, ...editForm }));
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update profile");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || profile.fullname || "",
        username: profile.username || "",
        bio: profile.bio || "",
        avatar: profile.avatar || "",
      });
    }
    setIsEditing(false);
  };

  // Avatar upload handlers
  const triggerAvatarPick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const onAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview for crop
    const src = URL.createObjectURL(file);
    setAvatarPick({ src });
    setCropOpen(true);

    // Reset input to allow selecting the same file again
    e.target.value = "";
  };

  const closeCropModal = () => {
    setCropOpen(false);
    if (avatarPick?.src) URL.revokeObjectURL(avatarPick.src);
    setAvatarPick(null);
  };

  const handleSaveCroppedAvatar = async (blob) => {
    setSaving(true);
    setError(null);
    try {
      // Convert blob to File for uploadMedia
      const file = new File([blob], `avatar_${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });

      const up = await uploadMedia(file);
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload avatar thất bại (không có URL)");

      // Update profile directly
      setProfile((prev) => ({ ...prev, avatar: url }));
      setEditForm((prev) => ({ ...prev, avatar: url }));

      // Also save to server
      await userApi.updateMyProfile({ avatar: url });

      closeCropModal();
      alert("Avatar updated successfully!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Failed to upload avatar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-account-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-account-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchProfile} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-account-page">
      <div className="admin-account-header">
        <h1>Admin Account</h1>
      </div>

      <div className="admin-account-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div
              className={`profile-avatar large ${isEditing ? "editable" : ""}`}
              onClick={triggerAvatarPick}
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Admin Avatar" />
              ) : (
                <div className="avatar-placeholder">
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
              {isEditing && (
                <div className="avatar-overlay">
                  <i className="fa-solid fa-camera"></i>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={onAvatarSelected}
              style={{ display: "none" }}
            />
            {isEditing && (
              <button
                className="change-avatar-btn"
                onClick={triggerAvatarPick}
                disabled={saving}
              >
                <i className="fa-solid fa-camera"></i>
                Change Avatar
              </button>
            )}
            <div className="profile-badge">
              <span className="admin-badge">
                <i className="fa-solid fa-shield-halved"></i>
                Admin
              </span>
            </div>
          </div>

          <div className="profile-info">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={editForm.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={editForm.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                  />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={editForm.bio}
                    onChange={handleInputChange}
                    placeholder="Enter bio"
                    rows={3}
                  />
                </div>
                <div className="edit-actions">
                  <button className="cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="save-btn" onClick={handleSave}>
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="profile-name">
                  <h2>{profile?.fullName || profile?.fullname || "Admin User"}</h2>
                  <button
                    className="edit-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    <i className="fa-solid fa-pen"></i>
                    Edit
                  </button>
                </div>
                <p className="profile-username">@{profile?.username || "admin"}</p>
                <p className="profile-email">
                  <i className="fa-solid fa-envelope"></i>
                  {profile?.email || "admin@laca.com"}
                </p>
                {profile?.bio && (
                  <p className="profile-bio">{profile.bio}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="info-card">
          <h3>Account Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Account ID</span>
              <span className="info-value">{profile?._id || "N/A"}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role</span>
              <span className="info-value role-badge admin">
                <i className="fa-solid fa-shield-halved"></i>
                Administrator
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Account Status</span>
              <span className="info-value status-badge active">
                <i className="fa-solid fa-check-circle"></i>
                Active
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Email Status</span>
              <span className="info-value">
                {profile?.isEmailVerified ? (
                  <span className="verified-badge">
                    <i className="fa-solid fa-circle-check"></i>
                    Verified
                  </span>
                ) : (
                  <span className="unverified-badge">
                    <i className="fa-solid fa-circle-xmark"></i>
                    Not Verified
                  </span>
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        open={cropOpen}
        imageSrc={avatarPick?.src}
        busy={saving}
        onCancel={closeCropModal}
        onSaveBlob={handleSaveCroppedAvatar}
      />
    </div>
  );
};

export default AdminAccount;
