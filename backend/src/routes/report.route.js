const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { createReport } = require("../controllers/report.controller");

// POST /api/reports
router.post("/", auth, createReport);

module.exports = router;
