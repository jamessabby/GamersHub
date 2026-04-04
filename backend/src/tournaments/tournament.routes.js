const express = require("express");
const tournamentController = require("./tournament.controller");

const router = express.Router();

router.get("/", tournamentController.listTournaments);

module.exports = router;
