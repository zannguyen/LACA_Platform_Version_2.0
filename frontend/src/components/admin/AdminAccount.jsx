// Admin Account Management Page
import React, { useEffect, useRef, useState } from "react";
import userApi from "../../api/userApi";
import { authApi, changePassword } from "../../api/authApi";
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

  // State for password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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
      // Convert fullName to fullname for backend API
      const payload = {
        fullname: editForm.fullName,
        username: editForm.username,
        bio: editForm.bio,
        avatar: editForm.avatar,
      };
      const res = await userApi.updateMyProfile(payload);
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
      console.log("Starting avatar upload...");

      // Convert blob to File for uploadMedia
      const file = new File([blob], `avatar_${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });

      const up = await uploadMedia(file);
      console.log("Upload response:", up);

      // Handle different response formats
      const url = up?.secure_url || up?.url || up?.data?.secure_url || up?.data?.url;
      console.log("Extracted URL:", url);

      if (!url) {
        console.error("Upload response full:", up);
        throw new Error("Upload avatar thất bại (không có URL)");
      }

      // Save to server
      const res = await userApi.updateMyProfile({ avatar: url });
      console.log("Save profile response:", res);

      // Handle response similar to user_profile.jsx
      const root = res?.data ? res : { data: res };
      const body = root.data;
      if (body?.success === false) {
        throw new Error(body?.message || "Update failed");
      }

      const updatedUser = body?.data || body;
      const finalAvatar = updatedUser?.avatar || url;

      // Update profile state - use server response avatar or fallback to URL
      setProfile((prev) => {
        const newProfile = {
          ...(prev || {}),
          ...(updatedUser || {}),
          avatar: finalAvatar,
        };
        return newProfile;
      });

      // Update edit form
      setEditForm((prev) => ({
        ...prev,
        avatar: finalAvatar,
      }));

      // Update localStorage for persistence
      const currentUser = authApi.getCurrentUser();
      if (currentUser) {
        const updatedLocalUser = { ...currentUser, avatar: finalAvatar };
        localStorage.setItem("user", JSON.stringify(updatedLocalUser));
      }

      closeCropModal();
      alert("Avatar updated successfully!");
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Failed to upload avatar");
    } finally {
      setSaving(false);
    }
  };

  // Password change handlers
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordError("");
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setSaving(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword);

      if (res.success) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(res.message || "Đổi mật khẩu thất bại");
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setPasswordSuccess(false);
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

        {/* Change Password Card */}
        <div className="info-card">
          <h3>Security</h3>
          <div className="info-list">
            <div className="info-item" style={{ justifyContent: "flex-start" }}>
              <span className="info-label">
                <i className="fa-solid fa-lock"></i>
                Password
              </span>
              <button
                className="change-password-btn"
                onClick={() => setShowPasswordModal(true)}
              >
                <i className="fa-solid fa-key"></i>
                Change Password
              </button>
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>

            {passwordSuccess ? (
              <div className="success-message">
                <i className="fa-solid fa-check-circle"></i>
                Password changed successfully!
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordError && (
                  <div className="error-message">{passwordError}</div>
                )}

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={closePasswordModal}>
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={handlePasswordSubmit}
                    disabled={saving}
                  >
                    {saving ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccount;
