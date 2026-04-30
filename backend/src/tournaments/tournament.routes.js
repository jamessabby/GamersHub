const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const tournamentController = require("./tournament.controller");
const registrationUpload = require("./registration.upload");

const router = express.Router();

// Public — no auth required
router.get("/", tournamentController.listTournaments);
router.get("/:tournamentId/schedule", tournamentController.getSchedule);
router.get("/:tournamentId/leaderboard", tournamentController.getLeaderboard);
router.get("/:tournamentId/summary", tournamentController.getTournamentSummary);
router.get("/:tournamentId/matches/:matchId/stats", tournamentController.getMatchStats);

// Public registration (no auth — organizers register from a social link)
router.post("/register", registrationUpload.single("paymentProof"), tournamentController.submitRegistration);

// Authenticated player — join by code
router.post("/join", requireAuth, tournamentController.joinTournamentByCode);

module.exports = router;
