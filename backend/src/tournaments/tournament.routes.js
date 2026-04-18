const express = require("express");
const tournamentController = require("./tournament.controller");

const router = express.Router();

router.get("/", tournamentController.listTournaments);
router.get("/:tournamentId/schedule", tournamentController.getSchedule);
router.get("/:tournamentId/leaderboard", tournamentController.getLeaderboard);

module.exports = router;
