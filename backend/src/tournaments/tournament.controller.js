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
      registrationFeeAmount: req.body.registrationFeeAmount,
      registrationFeePesos: req.body.registrationFeePesos,
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

async function getMatchStats(req, res) {
  try {
    const stats = await tournamentService.getMatchStats(req.params.matchId);
    res.status(200).json({ items: stats, total: stats.length });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load match stats." });
  }
}

async function saveMatchStats(req, res) {
  try {
    const saved = await tournamentService.saveMatchStats({
      actor: req.auth.user,
      matchId: req.params.matchId,
      stats: req.body.stats || [],
    });
    res.status(200).json({ items: saved, total: saved.length });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to save match stats." });
  }
}

async function listRegistrations(req, res) {
  try {
    const payload = await tournamentService.listRegistrations({
      tournamentId: req.query.tournamentId || null,
      status: req.query.status || null,
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load registrations." });
  }
}

async function submitRegistration(req, res) {
  try {
    const paymentProofUrl = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;
    const playerCount = parseInt(req.body.playerCount, 10);
    const rosterNotes = !Number.isNaN(playerCount) && playerCount > 0
      ? `${playerCount} player${playerCount === 1 ? "" : "s"}`
      : (req.body.rosterNotes || null);
    const reg = await tournamentService.submitRegistration({
      tournamentId: req.body.tournamentId,
      teamName: req.body.teamName,
      contactName: req.body.contactName,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone || null,
      rosterNotes,
      paymentProofUrl,
      participants: req.body.participants || [],
    });
    res.status(201).json({
      message: "Registration submitted successfully.",
      registration: reg,
      checkoutUrl: reg.checkoutUrl || null,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message || "Failed to submit registration." });
  }
}

async function approveRegistration(req, res) {
  try {
    const updated = await tournamentService.approveRegistration({
      actor: req.auth.user,
      registrationId: req.params.publicId,
    });
    res.status(200).json({ message: "Registration approved.", registration: updated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to approve registration." });
  }
}

async function rejectRegistration(req, res) {
  try {
    const updated = await tournamentService.rejectRegistration({
      actor: req.auth.user,
      registrationId: req.params.publicId,
      reason: req.body.reason || null,
    });
    res.status(200).json({ message: "Registration rejected.", registration: updated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to reject registration." });
  }
}

async function confirmRegistrationPayment(req, res) {
  try {
    const result = await tournamentService.confirmRegistrationPayment({
      actor: req.auth.user,
      registrationId: req.params.publicId,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to confirm payment." });
  }
}

async function joinTournamentByCode(req, res) {
  try {
    const result = await tournamentService.joinTournamentByCode({
      tournamentId: req.body.tournamentId || null,
      joinCode: req.body.joinCode,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message || "Failed to join tournament." });
  }
}

async function endTournament(req, res) {
  try {
    const tournament = await tournamentService.endTournament(req.params.tournamentId);
    res.status(200).json({ message: "Tournament ended successfully.", tournament });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to end tournament." });
  }
}

async function getTournamentSummary(req, res) {
  try {
    const [schedule, leaderboard] = await Promise.all([
      tournamentService.getScheduleByTournamentId(req.params.tournamentId),
      tournamentService.getLeaderboardByTournamentId(req.params.tournamentId),
    ]);
    res.status(200).json({
      tournament: schedule.tournament || null,
      schedule: schedule.items || [],
      leaderboard: leaderboard.items || [],
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load tournament summary." });
  }
}

module.exports = {
  listTournaments,
  endTournament,
  getSchedule,
  getLeaderboard,
  createTournament,
  listTournamentTeams,
  listLeaderboardAdmin,
  upsertLeaderboardEntry,
  listTournamentMatches,
  createMatch,
  updateMatch,
  getMatchStats,
  saveMatchStats,
  listRegistrations,
  submitRegistration,
  approveRegistration,
  rejectRegistration,
  confirmRegistrationPayment,
  joinTournamentByCode,
  getTournamentSummary,
};
