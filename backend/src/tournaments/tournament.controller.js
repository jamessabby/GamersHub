const tournamentService = require("./tournament.service");

async function listTournaments(req, res) {
  try {
    const tournaments = await tournamentService.listTournaments();
    res.status(200).json(tournaments);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load tournaments." });
  }
}

async function getSchedule(req, res) {
  try {
    const payload = await tournamentService.getScheduleByTournamentId(
      req.params.tournamentId,
    );
    res.status(200).json(payload);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load tournament schedule." });
  }
}

async function getLeaderboard(req, res) {
  try {
    const payload = await tournamentService.getLeaderboardByTournamentId(
      req.params.tournamentId,
    );
    res.status(200).json(payload);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load tournament leaderboard." });
  }
}

module.exports = {
  listTournaments,
  getSchedule,
  getLeaderboard,
};
