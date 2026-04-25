const express = require("express");
const adminController = require("./admin.controller");
const tournamentController = require("../tournaments/tournament.controller");
const adminUpload = require("./admin.upload");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/users", requireRole("admin", "superadmin"), adminController.listUsers);
router.put("/users/:userId/role", requireRole("superadmin"), adminController.updateUserRole);
router.get("/analytics/overview", requireRole("admin", "superadmin"), adminController.analyticsOverview);
router.get("/activity", requireRole("admin", "superadmin"), adminController.listActivity);

// Tournament management (admin)
router.post("/tournaments", requireRole("admin", "superadmin"), tournamentController.createTournament);
router.get("/tournaments/:tournamentId/teams", requireRole("admin", "superadmin"), tournamentController.listTournamentTeams);
router.get("/tournaments/:tournamentId/leaderboard", requireRole("admin", "superadmin"), tournamentController.listLeaderboardAdmin);
router.put("/tournaments/:tournamentId/leaderboard/:teamId", requireRole("admin", "superadmin"), tournamentController.upsertLeaderboardEntry);
router.get("/tournaments/:tournamentId/matches", requireRole("admin", "superadmin"), tournamentController.listTournamentMatches);
router.post("/tournaments/:tournamentId/matches", requireRole("admin", "superadmin"), tournamentController.createMatch);
router.put("/tournaments/:tournamentId/matches/:matchId", requireRole("admin", "superadmin"), tournamentController.updateMatch);

// Stream management (admin) — upload-thumbnail must come before /:streamId
router.get("/streams", requireRole("admin", "superadmin"), adminController.listStreams);
router.post("/streams/upload-thumbnail", requireRole("admin", "superadmin"), adminUpload.single("thumbnail"), adminController.uploadThumbnail);
router.post("/streams", requireRole("admin", "superadmin"), adminController.publishStream);
router.put("/streams/:streamId", requireRole("admin", "superadmin"), adminController.updateStream);
router.put("/streams/:streamId/moderation", requireRole("admin", "superadmin"), adminController.moderateStream);

// Event management (admin)
router.get("/events", requireRole("admin", "superadmin"), adminController.listEvents);
router.post("/events", requireRole("admin", "superadmin"), adminController.createEvent);
router.put("/events/:eventId", requireRole("admin", "superadmin"), adminController.updateEvent);
router.delete("/events/:eventId", requireRole("admin", "superadmin"), adminController.deleteEvent);

module.exports = router;
