const express = require("express");
const adminController = require("./admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/users", requireRole("admin", "superadmin"), adminController.listUsers);
router.put("/users/:userId/role", requireRole("superadmin"), adminController.updateUserRole);
router.get("/analytics/overview", requireRole("admin", "superadmin"), adminController.analyticsOverview);
router.get("/streams", requireRole("admin", "superadmin"), adminController.listStreams);
router.put("/streams/:streamId/moderation", requireRole("admin", "superadmin"), adminController.moderateStream);

module.exports = router;
