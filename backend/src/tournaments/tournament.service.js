const tournamentRepo = require("./tournament.repository");

async function listTournaments() {
  const tournaments = await tournamentRepo.listTournaments();
  return {
    items: tournaments.map(mapTournament),
    total: tournaments.length,
  };
}

async function getScheduleByTournamentId(tournamentId) {
  const tournament = await getTournamentOrThrow(tournamentId);
  const matches = await tournamentRepo.listScheduleByTournamentId(tournament.tournamentId);

  return {
    tournament: mapTournament(tournament),
    items: matches.map((match) => ({
      matchId: match.matchId,
      teamAId: match.teamAId,
      teamAName: match.teamAName,
      teamAScore: match.teamAScore,
      teamBId: match.teamBId,
      teamBName: match.teamBName,
      teamBScore: match.teamBScore,
      matchDate: match.matchDate || "",
      matchTime: match.matchTime || "",
      status:
        match.teamAScore != null && match.teamBScore != null ? "completed" : "upcoming",
    })),
  };
}

async function getLeaderboardByTournamentId(tournamentId) {
  const tournament = await getTournamentOrThrow(tournamentId);
  const rows = await tournamentRepo.listLeaderboardByTournamentId(tournament.tournamentId);

  return {
    tournament: mapTournament(tournament),
    items: rows.map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      teamName: row.teamName,
      played: Number(row.played) || 0,
      wins: Number(row.wins) || 0,
      losses: Number(row.losses) || 0,
    })),
  };
}

async function getTournamentOrThrow(tournamentId) {
  const parsedTournamentId = Number(tournamentId);
  if (!Number.isInteger(parsedTournamentId) || parsedTournamentId < 1) {
    const error = new Error("A valid tournamentId is required.");
    error.statusCode = 400;
    throw error;
  }

  const tournament = await tournamentRepo.findTournamentById(parsedTournamentId);
  if (!tournament) {
    const error = new Error("Tournament not found.");
    error.statusCode = 404;
    throw error;
  }

  return tournament;
}

function mapTournament(tournament) {
  const status = String(tournament.status || "").trim();

  return {
    tournamentId: Number(tournament.tournamentId),
    title: tournament.title || "Tournament",
    gameName: tournament.gameName || "Game",
    startDate: tournament.startDate || "",
    endDate: tournament.endDate || "",
    status: status || (tournament.isActive ? "Active" : "Pending"),
    isActive: Boolean(tournament.isActive),
    matchCount:
      tournament.matchCount == null ? undefined : Number(tournament.matchCount) || 0,
    completedMatchCount:
      tournament.completedMatchCount == null
        ? undefined
        : Number(tournament.completedMatchCount) || 0,
    teamCount: tournament.teamCount == null ? undefined : Number(tournament.teamCount) || 0,
  };
}

module.exports = {
  listTournaments,
  getScheduleByTournamentId,
  getLeaderboardByTournamentId,
};
