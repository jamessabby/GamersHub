const express = require("express");
const adminController = require("./admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireRole("superadmin"));

router.get("/audit", adminController.listAudit);
router.get("/reports/summary", adminController.reportsSummary);
router.get("/reports/export", adminController.exportReport);

module.exports = router;
