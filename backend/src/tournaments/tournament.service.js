const crypto = require("crypto");
const tournamentRepo = require("./tournament.repository");
const notificationRepo = require("../users/notification.repository");
const { createPaymentLink } = require("../payments/paymongo.service");
const { sendRegistrationApprovalEmail, sendRegistrationRejectionEmail } = require("../auth/mail.util");

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
      teamABannerUrl: match.teamABannerUrl || "",
      teamBBannerUrl: match.teamBBannerUrl || "",
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
  const registrationFeeAmount = Math.max(0, Number(tournament.registrationFeeAmount) || 0);

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
    registrationFeeAmount,
    registrationFeePesos: registrationFeeAmount / 100,
  };
}

async function createTournament({ title, gameName, startDate, endDate, status, isActive, teams, registrationFeeAmount, registrationFeePesos }) {
  const trimmedTitle = String(title || "").trim();
  if (!trimmedTitle) {
    const error = new Error("Tournament title is required.");
    error.statusCode = 400;
    throw error;
  }
  const feeAmount = normalizeRegistrationFeeAmount({ registrationFeeAmount, registrationFeePesos });

  const tournament = await tournamentRepo.createTournament({
    title: trimmedTitle,
    gameName: String(gameName || "").trim() || null,
    startDate: startDate || null,
    endDate: endDate || null,
    status: String(status || "Pending").trim(),
    isActive: isActive !== false,
    registrationFeeAmount: feeAmount,
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

async function endTournament(tournamentId) {
  const tournament = await getTournamentOrThrow(tournamentId);

  const updated = await tournamentRepo.updateTournamentStatus({
    tournamentId: tournament.tournamentId,
    status: "Completed",
    isActive: false,
  });

  if (!updated) {
    const error = new Error("Tournament could not be ended.");
    error.statusCode = 500;
    throw error;
  }

  return mapTournament(updated);
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

// MATCH STATS

async function getMatchStats(matchId) {
  return tournamentRepo.listMatchStats(parsePositiveInt(matchId));
}

async function saveMatchStats({ actor, matchId, stats }) {
  const mid = parsePositiveInt(matchId);
  if (!Array.isArray(stats)) {
    const e = new Error("stats must be an array.");
    e.statusCode = 400;
    throw e;
  }
  for (const s of stats) {
    if (!String(s.statKey || "").trim()) {
      const e = new Error("Each stat entry must have a non-empty statKey.");
      e.statusCode = 400;
      throw e;
    }
    if (s.statValue == null || String(s.statValue).trim() === "") {
      const e = new Error("Each stat entry must have a statValue.");
      e.statusCode = 400;
      throw e;
    }
  }
  return tournamentRepo.replaceMatchStats(mid, stats, actor.userId);
}

// TOURNAMENT REGISTRATION

async function listRegistrations({ tournamentId, status }) {
  const rows = await tournamentRepo.listRegistrations({
    tournamentId: tournamentId ? Number(tournamentId) : null,
    status: status || null,
  });
  return { items: rows, total: rows.length };
}

async function submitRegistration({ tournamentId, teamName, contactName, contactEmail, contactPhone, rosterNotes, paymentProofUrl, teamBannerUrl, participants }) {
  if (!tournamentId || !teamName || !contactName || !contactEmail) {
    const e = new Error("Tournament, team name, contact name, and contact email are required.");
    e.statusCode = 400;
    throw e;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(String(contactEmail).trim().toLowerCase())) {
    const e = new Error("Please provide a valid contact email address.");
    e.statusCode = 400;
    throw e;
  }
  const tournament = await getTournamentOrThrow(tournamentId);
  const feeAmount = Math.max(0, Number(tournament.registrationFeeAmount) || 0);
  const reg = await tournamentRepo.createRegistration({
    tournamentId: Number(tournamentId),
    teamName: String(teamName).trim(),
    contactName: String(contactName).trim(),
    contactEmail: String(contactEmail).trim().toLowerCase(),
    contactPhone: contactPhone ? String(contactPhone).trim() : null,
    rosterNotes: rosterNotes ? String(rosterNotes).trim() : null,
    paymentProofUrl: paymentProofUrl || null,
    teamBannerUrl: teamBannerUrl || null,
    feeAmount,
    paymentStatus: feeAmount > 0 ? "unpaid" : "paid",
  });

  let usernameList = [];
  if (Array.isArray(participants)) {
    usernameList = participants;
  } else if (typeof participants === "string" && participants.trim()) {
    try {
      usernameList = JSON.parse(participants);
    } catch {
      const e = new Error("Participants must be a JSON array of usernames.");
      e.statusCode = 400;
      throw e;
    }
  }
  const cleaned = usernameList.map((u) => String(u || "").trim()).filter(Boolean);
  if (cleaned.length && reg) {
    await tournamentRepo.createRegistrationParticipants(reg.registrationId, cleaned);
  }

  // Create PayMongo payment link if key is configured and the tournament has a fee.
  let checkoutUrl = null;
  const secretKey = process.env.PAYMONGO_SECRET_KEY || "";
  if (feeAmount > 0 && secretKey && !secretKey.startsWith("sk_test_REPLACE") && reg) {
    try {
      const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
      const successUrl = `${baseUrl}/public/payment-success.html?ref=${reg.publicId}`;
      const link = await createPaymentLink({
        amount: feeAmount,
        description: `Registration fee - ${tournament?.title || "Tournament"}`,
        remarks: String(teamName).trim(),
        redirectSuccess: successUrl,
      });
      await tournamentRepo.updateRegistrationPaymongoLink(reg.registrationId, link.linkId);
      checkoutUrl = link.checkoutUrl;
    } catch (err) {
      console.error("PayMongo link creation failed:", err.message);
    }
  }

  return { ...reg, feeAmount, checkoutUrl };
}

async function approveRegistration({ actor, registrationId }) {
  const reg = await tournamentRepo.findRegistrationByPublicId(registrationId);
  if (!reg) {
    const e = new Error("Registration not found.");
    e.statusCode = 404;
    throw e;
  }
  if (reg.status === "approved") {
    const e = new Error("Registration is already approved.");
    e.statusCode = 409;
    throw e;
  }
  const feeAmount = Math.max(0, Number(reg.feeAmount) || 0);
  if (feeAmount > 0 && reg.paymentStatus !== "paid") {
    const e = new Error("Payment must be marked paid before this registration can be approved.");
    e.statusCode = 409;
    throw e;
  }

  const joinCode = generateJoinCode();
  const updated = await tournamentRepo.updateRegistrationStatus({
    registrationId: reg.registrationId,
    status: "approved",
    rejectionReason: null,
    joinCode,
    reviewedBy: actor.userId,
  });

  await sendRegistrationApprovalEmail({
    to: reg.contactEmail,
    teamName: reg.teamName,
    tournamentTitle: reg.tournamentTitle,
    joinCode,
  }).catch(() => {});

  // Notify each participant who has a GamersHub account
  const participants = await tournamentRepo.listParticipantsByRegistrationId(reg.registrationId);
  const notifyTargets = participants.filter((p) => p.userId);
  for (const participant of notifyTargets) {
    await notificationRepo.createNotification({
      userId: participant.userId,
      notificationType: "tournament_approved",
      title: `Your team "${reg.teamName}" has been approved!`,
      body: `You're registered for ${reg.tournamentTitle}. Use join code ${joinCode} to enter the tournament.`,
      linkUrl: null,
    }).catch(() => {});
  }

  return updated;
}

async function rejectRegistration({ actor, registrationId, reason }) {
  const reg = await tournamentRepo.findRegistrationByPublicId(registrationId);
  if (!reg) {
    const e = new Error("Registration not found.");
    e.statusCode = 404;
    throw e;
  }

  const updated = await tournamentRepo.updateRegistrationStatus({
    registrationId: reg.registrationId,
    status: "rejected",
    rejectionReason: reason ? String(reason).trim() : null,
    joinCode: null,
    reviewedBy: actor.userId,
  });

  await sendRegistrationRejectionEmail({
    to: reg.contactEmail,
    teamName: reg.teamName,
    tournamentTitle: reg.tournamentTitle,
    reason: reason || null,
  }).catch(() => {});

  return updated;
}

async function confirmRegistrationPayment({ actor, registrationId }) {
  const reg = await tournamentRepo.findRegistrationByPublicId(registrationId);
  if (!reg) {
    const e = new Error("Registration not found.");
    e.statusCode = 404;
    throw e;
  }
  await tournamentRepo.updateRegistrationPayment({
    registrationId: reg.registrationId,
    paymentStatus: "paid",
    paymentProofUrl: null,
  });
  return { message: "Payment confirmed." };
}

async function joinTournamentByCode({ tournamentId, joinCode }) {
  if (!joinCode) {
    const e = new Error("Join code is required.");
    e.statusCode = 400;
    throw e;
  }

  const reg = await tournamentRepo.findRegistrationByJoinCode(String(joinCode).trim().toUpperCase());
  if (!reg) {
    const e = new Error("Invalid join code.");
    e.statusCode = 400;
    throw e;
  }
  if (reg.status !== "approved") {
    const e = new Error("This registration has not been approved yet.");
    e.statusCode = 400;
    throw e;
  }
  if (reg.joinCodeUsed) {
    const e = new Error("This join code has already been used.");
    e.statusCode = 409;
    throw e;
  }
  if (tournamentId && Number(tournamentId) !== Number(reg.tournamentId)) {
    const e = new Error("This code is for a different tournament.");
    e.statusCode = 400;
    throw e;
  }

  const joinResult = await tournamentRepo.consumeJoinCodeAndAddTeam({
    registrationId: reg.registrationId,
    tournamentId: reg.tournamentId,
    teamName: reg.teamName,
  });
  if (!joinResult?.joined) {
    const e = new Error("This join code has already been used.");
    e.statusCode = 409;
    throw e;
  }

  return {
    message: `Team "${reg.teamName}" has joined the tournament.`,
    teamName: reg.teamName,
    tournamentId: reg.tournamentId,
    tournament: { tournamentId: reg.tournamentId, title: reg.tournamentTitle },
  };
}

function generateJoinCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
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

function normalizeRegistrationFeeAmount({ registrationFeeAmount, registrationFeePesos }) {
  if (registrationFeeAmount != null && registrationFeeAmount !== "") {
    const parsed = Number(registrationFeeAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      const error = new Error("Registration fee must be zero or greater.");
      error.statusCode = 400;
      throw error;
    }
    return Math.round(parsed);
  }

  const pesos = registrationFeePesos == null || registrationFeePesos === ""
    ? 0
    : Number(registrationFeePesos);
  if (!Number.isFinite(pesos) || pesos < 0) {
    const error = new Error("Registration fee must be zero or greater.");
    error.statusCode = 400;
    throw error;
  }
  return Math.round(pesos * 100);
}

async function getRegistrationByPublicId(publicId) {
  if (!publicId) {
    const e = new Error("publicId is required.");
    e.statusCode = 400;
    throw e;
  }
  const reg = await tournamentRepo.findRegistrationByPublicId(publicId);
  return reg || null;
}


async function updateProofByPublicId({ publicId, paymentProofUrl }) {
  if (!publicId) return null;
  const reg = await tournamentRepo.findRegistrationByPublicId(publicId);
  if (!reg) return null;
  await tournamentRepo.updateRegistrationProof(reg.registrationId, paymentProofUrl);
  return { ...reg, paymentProofUrl };
}


async function updateRegistrationBanner({ publicId, teamBannerUrl }) {
  if (!publicId || !teamBannerUrl) {
    const e = new Error("publicId and teamBannerUrl are required.");
    e.statusCode = 400;
    throw e;
  }
  const updated = await tournamentRepo.updateRegistrationBanner({ publicId, teamBannerUrl });
  if (!updated) {
    const e = new Error("Registration not found.");
    e.statusCode = 404;
    throw e;
  }
  return updated;
}

module.exports = {
  updateRegistrationBanner,
  listTournaments,
  endTournament,
  getScheduleByTournamentId,
  getLeaderboardByTournamentId,
  createTournament,
  listTeamsByTournament,
  listLeaderboardEntries,
  upsertLeaderboardEntry,
  createMatch,
  updateMatch,
  getMatchStats,
  saveMatchStats,
  listRegistrations,
  submitRegistration,
  getRegistrationByPublicId,
  updateProofByPublicId,
  approveRegistration,
  rejectRegistration,
  confirmRegistrationPayment,
  joinTournamentByCode,
};
