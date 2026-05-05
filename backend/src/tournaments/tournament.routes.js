const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const tournamentController = require("./tournament.controller");
const registrationUpload = require("./registration.upload");

const router = express.Router();

// Public — no auth required
router.get("/", tournamentController.listTournaments);
router.get("/:tournamentId/schedule", tournamentController.getSchedule);
router.get("/:tournamentId/leaderboard", tournamentController.getLeaderboard);
router.get("/:tournamentId/summary", tournamentController.getTournamentSummary);
router.get("/:tournamentId/matches/:matchId/stats", tournamentController.getMatchStats);

// Public — get registration by publicId (for payment-success page)
router.get("/registration/:publicId", tournamentController.getRegistrationByPublicId);

// Public — upload payment proof after PayMongo redirect
router.post("/registration/:publicId/upload-proof", registrationUpload.single("paymentProof"), tournamentController.uploadProofByPublicId);

// Public registration (no auth — organizers register from a social link)
router.post("/register", registrationUpload.single("paymentProof"), tournamentController.submitRegistration);

// Backward-compatible admin create path for older cached frontend builds.
router.post("/", requireAuth, requireRole("admin", "superadmin"), tournamentController.createTournament);

// Authenticated player — join by code
router.post("/join", requireAuth, tournamentController.joinTournamentByCode);

module.exports = router;
