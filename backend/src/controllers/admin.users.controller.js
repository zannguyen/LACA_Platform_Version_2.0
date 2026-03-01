const adminUsersService = require("../services/admin.users.service");
const notifService = require("../services/notification.service");

exports.adminListUsers = async (req, res) => {
  try {
    const data = await adminUsersService.listUsers(req.query);
    return res.json(data);
  } catch (e) {
    return res
      .status(500)
      .json({ message: "Failed to load users", error: e?.message });
  }
};

exports.adminGetUser = async (req, res) => {
  try {
    const data = await adminUsersService.getUserById(req.params.userId);
    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to load user" });
  }
};

// blocked/unblocked (isActive)
exports.adminUpdateUserStatus = async (req, res) => {
  try {
    const data = await adminUsersService.updateUserStatus(
      req.params.userId,
      req.body,
    );
    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to update status" });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const data = await adminUsersService.updateUser(
      req.params.userId,
      req.body,
    );
    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to update user" });
  }
};

// ✅ suspended / unsuspend
// PATCH /api/admin/users/:userId/suspend
// body: { suspendUntil: "2026-02-20T00:00:00Z" } hoặc { suspendUntil: null }
exports.adminSuspendUser = async (req, res) => {
  try {
    const data = await adminUsersService.setSuspendUntil(
      req.params.userId,
      req.body,
    );

    // Notify the user about suspension
    try {
      const io = req.app.get("io");
      const isSuspending =
        req.body.suspendUntil && req.body.suspendUntil !== null;
      if (isSuspending) {
        const until = new Date(req.body.suspendUntil).toLocaleDateString(
          "vi-VN",
        );
        await notifService.createAndEmit(io, {
          recipientId: req.params.userId,
          senderId: null,
          type: "system",
          title: `Tài khoản của bạn bị tạm khóa`,
          body: `Tài khoản của bạn đã bị tạm khóa đến ngày ${until}. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`,
          link: "/support",
        });
      }
    } catch (notifErr) {
      console.error("[Notification] suspend user error:", notifErr.message);
    }

    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to suspend user" });
  }
};

// ✅ soft delete / restore
// PATCH /api/admin/users/:userId/delete
// body: { deleted: true } hoặc { deleted: false }
exports.adminSoftDeleteUser = async (req, res) => {
  try {
    const data = await adminUsersService.setDeleted(
      req.params.userId,
      req.body,
    );

    // Notify the user if being deleted
    try {
      const io = req.app.get("io");
      if (req.body.deleted === true) {
        await notifService.createAndEmit(io, {
          recipientId: req.params.userId,
          senderId: null,
          type: "system",
          title: `Tài khoản của bạn đã bị xóa`,
          body: `Tài khoản của bạn đã bị xóa bởi quản trị viên. Nếu bạn cho rằng đây là lỗi, vui lòng liên hệ bộ phận hỗ trợ.`,
          link: "/support",
        });
      }
    } catch (notifErr) {
      console.error("[Notification] soft delete user error:", notifErr.message);
    }

    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to delete/restore user" });
  }
};

// DELETE vẫn giữ để “xóa” từ UI, nhưng service đã đổi thành soft delete
exports.adminDeleteUser = async (req, res) => {
  try {
    const data = await adminUsersService.deleteUser(req.params.userId);
    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to delete user" });
  }
};

exports.adminRestoreUser = async (req, res) => {
  try {
    const data = await adminUsersService.restoreUser(req.params.userId);
    return res.json(data);
  } catch (e) {
    return res
      .status(e?.status || 500)
      .json({ message: e?.message || "Failed to restore user" });
  }
};
