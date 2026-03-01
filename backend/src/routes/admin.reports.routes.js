const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/requireAdmin");
const ctrl = require("../controllers/admin.reports.controller");

// GET /api/admin/reports
router.get("/", auth, requireAdmin, ctrl.listReports);

// GET /api/admin/reports/:id
router.get("/:id", auth, requireAdmin, ctrl.getReport);

// PATCH /api/admin/reports/:id/handle
router.patch("/:id/handle", auth, requireAdmin, ctrl.handleReport);

module.exports = router;
