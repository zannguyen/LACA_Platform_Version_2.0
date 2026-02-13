import React, { useEffect, useMemo, useState } from "react";
import {
  getAllUsers,
  updateUserStatus,
  softDeleteUser,
  suspendUser,
} from "../../api/admin.api";
import "./UserManagement.css";

const STATUS_LABEL = {
  all: "All",
  active: "Active",
  blocked: "Blocked",
  unverified: "Unverified",
  suspended: "Suspended",
  deleted: "Deleted",
};

const canBlock = (status) => status === "active" || status === "unverified";
const canUnblock = (status) => status === "blocked";
const canSuspend = (status) => status !== "deleted";
const canDelete = (status) => status !== "deleted";
const canRestore = (status) => status === "deleted";
const canUnsuspend = (status, suspendUntil) =>
  status === "suspended" ||
  (suspendUntil && new Date(suspendUntil).getTime() > Date.now());

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const limit = 50;
  const [total, setTotal] = useState(0);

  const [selectedUsers, setSelectedUsers] = useState([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // "delete" | "restore"
  const [targetUser, setTargetUser] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const fetchUsers = async ({ resetPage = false } = {}) => {
    setLoading(true);

    const nextPage = resetPage ? 1 : page;
    const res = await getAllUsers({
      query: searchQuery,
      status: statusFilter,
      page: nextPage,
      limit,
    });

    if (res.success) {
      const list = res.data?.users || [];
      setUsers(list);
      setTotal(res.data?.total ?? list.length);
      if (resetPage) setPage(1);
      setSelectedUsers([]); // reset selected on refresh
    } else {
      setUsers([]);
      setTotal(0);
      console.error("Load users failed:", res.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers({ resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // load first

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const handleSearchSubmit = () => fetchUsers({ resetPage: true });

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
    // đổi filter thì reload
    setTimeout(() => fetchUsers({ resetPage: true }), 0);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([]);
    else setSelectedUsers(users.map((u) => u.id));
  };

  // ✅ Block/Unblock: backend nhận boolean isActive
  const handleBlockToggle = async (user) => {
    // block => isActive=false, unblock => isActive=true
    const isActive = user.status === "blocked";
    const res = await updateUserStatus(user.id, isActive);

    if (res.success) {
      // refresh list để status tính lại chuẩn (blocked/unverified/suspended/deleted)
      fetchUsers();
    } else {
      console.error(res.error);
    }
  };

  // ✅ Suspend: set tới 7 ngày mặc định (bạn có thể thay UI chọn ngày sau)
  const handleSuspendToggle = async (user) => {
    if (!canSuspend(user.status)) return;

    // nếu đang suspended -> unsuspend (null)
    const shouldUnsuspend = canUnsuspend(user.status, user.suspendUntil);
    const nextSuspendUntil = shouldUnsuspend
      ? null
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await suspendUser(user.id, nextSuspendUntil);
    if (res.success) fetchUsers();
    else console.error(res.error);
  };

  const openConfirm = (mode, user) => {
    setConfirmMode(mode);
    setTargetUser(user);
    setShowConfirm(true);
  };

  const closeConfirm = () => {
    setShowConfirm(false);
    setConfirmMode(null);
    setTargetUser(null);
  };

  const handleConfirm = async () => {
    if (!targetUser) return;

    if (confirmMode === "delete") {
      const res = await softDeleteUser(targetUser.id, true);
      if (res.success) fetchUsers();
      else console.error(res.error);
    }

    if (confirmMode === "restore") {
      const res = await softDeleteUser(targetUser.id, false);
      if (res.success) fetchUsers();
      else console.error(res.error);
    }

    closeConfirm();
  };

  // Paging (tối giản)
  const goPrev = () => {
    if (page <= 1) return;
    setPage((p) => p - 1);
    setTimeout(() => fetchUsers(), 0);
  };

  const goNext = () => {
    if (page >= totalPages) return;
    setPage((p) => p + 1);
    setTimeout(() => fetchUsers(), 0);
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>User Management</h1>
      </div>

      {/* Search + Filter */}
      <div className="search-section">
        <div className="search-bar">
          <svg
            className="search-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19 19L14.65 14.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          />

          <select
            className="status-filter"
            value={statusFilter}
            onChange={handleFilterChange}
          >
            {Object.keys(STATUS_LABEL).map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k]}
              </option>
            ))}
          </select>

          <button className="btn-search" onClick={handleSearchSubmit}>
            Search
          </button>
        </div>
      </div>

      {/* User Count + Paging */}
      <div
        className="user-count"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <span>
          {users.length} users (total {total})
        </span>
        {selectedUsers.length > 0 && (
          <span className="selected-count">
            {selectedUsers.length} selected
          </span>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button className="btn-action" onClick={goPrev} disabled={page <= 1}>
            Prev
          </button>
          <span>
            Page {page}/{totalPages}
          </span>
          <button
            className="btn-action"
            onClick={goNext}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={
                    selectedUsers.length === users.length && users.length > 0
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th>User</th>
              <th className="hide-mobile">Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-cell">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const suspendedNow = canUnsuspend(
                  user.status,
                  user.suspendUntil,
                );

                return (
                  <tr key={user.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                      />
                    </td>

                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {(user.name || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email mobile-only">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hide-mobile">{user.email}</td>

                    <td>
                      <span className={`status-badge status-${user.status}`}>
                        {user.status}
                      </span>
                      {user.status === "suspended" && user.suspendUntil && (
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          until {new Date(user.suspendUntil).toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="action-buttons">
                        {/* Block/Unblock */}
                        {(canBlock(user.status) || canUnblock(user.status)) && (
                          <button
                            className="btn-action btn-toggle"
                            onClick={() => handleBlockToggle(user)}
                          >
                            {canUnblock(user.status) ? "Unblock" : "Block"}
                          </button>
                        )}

                        {/* Suspend/Unsuspend */}
                        {canSuspend(user.status) && (
                          <button
                            className="btn-action btn-toggle"
                            onClick={() => handleSuspendToggle(user)}
                            disabled={user.status === "deleted"}
                          >
                            {suspendedNow ? "Unsuspend" : "Suspend 7d"}
                          </button>
                        )}

                        {/* Delete/Restore */}
                        {canDelete(user.status) && (
                          <button
                            className="btn-action btn-delete"
                            onClick={() => openConfirm("delete", user)}
                          >
                            Delete
                          </button>
                        )}
                        {canRestore(user.status) && (
                          <button
                            className="btn-action btn-toggle"
                            onClick={() => openConfirm("restore", user)}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmMode === "delete" ? "Delete User" : "Restore User"}</h3>

            <p>
              {confirmMode === "delete" ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{targetUser?.name}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to restore{" "}
                  <strong>{targetUser?.name}</strong>?
                </>
              )}
            </p>

            <p className="warning-text">
              {confirmMode === "delete"
                ? "This will be a soft delete (you can restore later)."
                : "This will restore the user account."}
            </p>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={closeConfirm}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirm}>
                {confirmMode === "delete" ? "Delete" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
