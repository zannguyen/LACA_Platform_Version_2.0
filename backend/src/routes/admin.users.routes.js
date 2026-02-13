const express = require("express");
const verifyToken = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");

const {
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminSuspendUser,
  adminSoftDeleteUser,
  adminRestoreUser,
  adminDeleteUser,
} = require("../controllers/admin.users.controller");

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);

// GET  /api/admin/users?query=&status=&page=&limit=
router.get("/", adminListUsers);

// GET  /api/admin/users/:userId
router.get("/:userId", adminGetUser);

// PATCH /api/admin/users/:userId
router.patch("/:userId", adminUpdateUser);

// PATCH /api/admin/users/:userId/status
router.patch("/:userId/status", adminUpdateUserStatus);

// PATCH /api/admin/users/:userId/suspend
router.patch("/:userId/suspend", adminSuspendUser);

// PATCH /api/admin/users/:userId/delete
router.patch("/:userId/delete", adminSoftDeleteUser);

// PATCH /api/admin/users/:userId/restore
router.patch("/:userId/restore", adminRestoreUser);

// DELETE /api/admin/users/:userId
router.delete("/:userId", adminDeleteUser);

module.exports = router;
