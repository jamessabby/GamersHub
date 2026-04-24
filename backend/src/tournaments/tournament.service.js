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

async function createTournament({ title, gameName, startDate, endDate, status, isActive, teams }) {
  const trimmedTitle = String(title || "").trim();
  if (!trimmedTitle) {
    const error = new Error("Tournament title is required.");
    error.statusCode = 400;
    throw error;
  }

  const tournament = await tournamentRepo.createTournament({
    title: trimmedTitle,
    gameName: String(gameName || "").trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
    status: String(status || "Pending").trim(),
    isActive: isActive !== false,
  });

  if (!tournament) {
    const error = new Error("Tournament was not created.");
    error.statusCode = 500;
    throw error;
  }

  const createdTeams = [];
  if (Array.isArray(teams)) {
    for (const entry of teams) {
      const teamName = String(entry.teamName || "").trim();
      if (!teamName) {
        continue;
      }
      const team = await tournamentRepo.createTeam({ teamName });
      if (team) {
        await tournamentRepo.addTournamentTeam({
          tournamentId: tournament.tournamentId,
          teamId: team.teamId,
          seed: entry.seed || null,
        });
        createdTeams.push(team);
      }
    }
  }

  return {
    ...mapTournament(tournament),
    teams: createdTeams,
  };
}

async function listTeamsByTournament(tournamentId) {
  const parsedId = parsePositiveInt(tournamentId);
  return tournamentRepo.listTeamsByTournamentId(parsedId);
}

async function listLeaderboardEntries(tournamentId) {
  const parsedId = parsePositiveInt(tournamentId);
  return tournamentRepo.listLeaderboardEntries(parsedId);
}

async function upsertLeaderboardEntry({ tournamentId, teamId, wins, losses }) {
  const parsedTournamentId = parsePositiveInt(tournamentId);
  const parsedTeamId = parsePositiveInt(teamId);
  const w = Math.max(0, Number.isInteger(Number(wins)) ? Number(wins) : 0);
  const l = Math.max(0, Number.isInteger(Number(losses)) ? Number(losses) : 0);
  return tournamentRepo.upsertLeaderboardEntry({ tournamentId: parsedTournamentId, teamId: parsedTeamId, wins: w, losses: l });
}

async function createMatch({ tournamentId, teamAId, teamBId, matchDate, matchTime }) {
  const parsedTournamentId = parsePositiveInt(tournamentId);
  const parsedTeamAId = parsePositiveInt(teamAId);
  const parsedTeamBId = parsePositiveInt(teamBId);
  return tournamentRepo.createMatch({
    tournamentId: parsedTournamentId,
    teamAId: parsedTeamAId,
    teamBId: parsedTeamBId,
    matchDate: matchDate || null,
    matchTime: matchTime || null,
  });
}

async function updateMatch({ matchId, teamAScore, teamBScore, matchDate, matchTime }) {
  const parsedMatchId = parsePositiveInt(matchId);
  const tAS = teamAScore != null && teamAScore !== "" ? Number(teamAScore) : null;
  const tBS = teamBScore != null && teamBScore !== "" ? Number(teamBScore) : null;
  return tournamentRepo.updateMatch({
    matchId: parsedMatchId,
    teamAScore: tAS,
    teamBScore: tBS,
    matchDate: matchDate || null,
    matchTime: matchTime || null,
  });
}

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error("A valid positive integer ID is required.");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

module.exports = {
  listTournaments,
  getScheduleByTournamentId,
  getLeaderboardByTournamentId,
  createTournament,
  listTeamsByTournament,
  listLeaderboardEntries,
  upsertLeaderboardEntry,
  createMatch,
  updateMatch,
};
