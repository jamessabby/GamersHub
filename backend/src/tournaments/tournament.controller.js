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

async function createTournament(req, res) {
  try {
    const payload = await tournamentService.createTournament({
      title: req.body.title,
      gameName: req.body.gameName,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      status: req.body.status,
      isActive: req.body.isActive,
      teams: req.body.teams || [],
    });
    res.status(201).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to create tournament." });
  }
}

async function listTournamentTeams(req, res) {
  try {
    const teams = await tournamentService.listTeamsByTournament(req.params.tournamentId);
    res.status(200).json({ items: teams, total: teams.length });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load teams." });
  }
}

async function listLeaderboardAdmin(req, res) {
  try {
    const entries = await tournamentService.listLeaderboardEntries(req.params.tournamentId);
    res.status(200).json({ items: entries, total: entries.length });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load leaderboard entries." });
  }
}

async function upsertLeaderboardEntry(req, res) {
  try {
    const entry = await tournamentService.upsertLeaderboardEntry({
      tournamentId: req.params.tournamentId,
      teamId: req.params.teamId,
      wins: req.body.wins,
      losses: req.body.losses,
    });
    res.status(200).json(entry);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to save leaderboard entry." });
  }
}

async function listTournamentMatches(req, res) {
  try {
    const payload = await tournamentService.getScheduleByTournamentId(req.params.tournamentId);
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load matches." });
  }
}

async function createMatch(req, res) {
  try {
    const match = await tournamentService.createMatch({
      tournamentId: req.params.tournamentId,
      teamAId: req.body.teamAId,
      teamBId: req.body.teamBId,
      matchDate: req.body.matchDate || null,
      matchTime: req.body.matchTime || null,
    });
    res.status(201).json(match);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to create match." });
  }
}

async function updateMatch(req, res) {
  try {
    const match = await tournamentService.updateMatch({
      matchId: req.params.matchId,
      teamAScore: req.body.teamAScore,
      teamBScore: req.body.teamBScore,
      matchDate: req.body.matchDate || null,
      matchTime: req.body.matchTime || null,
    });
    if (!match) {
      return res.status(404).json({ message: "Match not found." });
    }
    res.status(200).json(match);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to update match." });
  }
}

module.exports = {
  listTournaments,
  getSchedule,
  getLeaderboard,
  createTournament,
  listTournamentTeams,
  listLeaderboardAdmin,
  upsertLeaderboardEntry,
  listTournamentMatches,
  createMatch,
  updateMatch,
};
