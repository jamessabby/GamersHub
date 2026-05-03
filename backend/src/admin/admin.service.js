const userRepo = require("../users/user.repository");
const adminRepo = require("./admin.repository");
const auditService = require("../audit/audit.service");

async function listUsers({ query, role, page, pageSize }) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 25;
  const offset = (safePage - 1) * safePageSize;
  const users = await userRepo.listUsers({
    query,
    role,
    limit: safePageSize,
    offset,
  });
  const profiles = await adminRepo.listUserProfiles(users.items.map((item) => item.userId));

  return {
    items: users.items.map((item) => {
      const profile = profiles.get(item.userId);
      return {
        userId: item.userId,
        publicId: item.publicId || "",
        username: item.username,
        email: item.email,
        role: item.userRole,
        authProvider: item.authProvider || "local",
        avatarUrl: item.avatarUrl || "",
        mfaEnrolled: Boolean(item.mfaEnrolled),
        isActive: Boolean(item.isActive),
        createdAt: item.createdAt || null,
        displayName: profile?.displayName || item.username,
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        studentId: profile?.studentId || "",
        school: profile?.school || "",
        courseYear: profile?.courseYear || "",
        phoneNumber: profile?.phoneNumber || "",
        dateOfBirth: profile?.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
        primaryGame: profile?.primaryGame || "",
      };
    }),
    total: users.total,
    page: safePage,
    pageSize: safePageSize,
  };
}

async function updateUserRole({ actor, targetUserId, role }) {
  const normalizedRole = String(role || "").toLowerCase();
  if (!["user", "admin"].includes(normalizedRole)) {
    const error = new Error('Role must be either "user" or "admin".');
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await userRepo.findById(Number(targetUserId));
  if (!targetUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  if (targetUser.userRole === "superadmin") {
    const error = new Error("Superadmin accounts cannot be modified here.");
    error.statusCode = 403;
    throw error;
  }

  const updatedUser = await userRepo.updateUserRole(targetUser.userId, normalizedRole);
  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.role_changed",
    entityType: "user",
    entityId: updatedUser.userId,
    details: {
      previousRole: targetUser.userRole,
      nextRole: updatedUser.userRole,
    },
  });

  return {
    userId: updatedUser.userId,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.userRole,
    authProvider: updatedUser.authProvider || "local",
    mfaEnrolled: Boolean(updatedUser.mfaEnrolled),
    isActive: Boolean(updatedUser.isActive),
    createdAt: updatedUser.createdAt || null,
  };
}

async function getAnalyticsOverview({ range }) {
  const parsedRange = normalizeRange(range);
  const [roleCounts, registrations, totals, topGames] = await Promise.all([
    userRepo.countUsersByRole(),
    userRepo.countRegistrationsByDay({ days: parsedRange }),
    adminRepo.getAnalyticsCounts(),
    adminRepo.getTopGames().catch(() => []),
  ]);

  return {
    rangeDays: parsedRange,
    roleCounts: roleCounts.map((row) => ({
      role: row.userRole,
      total: Number(row.total) || 0,
    })),
    registrations: registrations.map((row) => ({
      date: row.createdDate,
      total: Number(row.total) || 0,
    })),
    totals,
    topGames: topGames.map((row) => ({
      game: String(row.gameName || "").trim(),
      total: Number(row.total) || 0,
    })),
  };
}

async function listRecentActivity({ limit } = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 15;
  return auditService.listAuditLogs({ page: 1, pageSize: safeLimit });
}

async function listStreamsModeration() {
  const streams = await adminRepo.listStreamsForModeration();
  const profiles = await adminRepo.listUserProfiles(streams.map((stream) => stream.userId));

  return {
    items: streams.map((stream) => ({
      streamId: stream.streamId,
      userId: stream.userId,
      title: stream.title || "Untitled stream",
      gameName: stream.gameName || "",
      isLive: Boolean(stream.isLive),
      isVisible: Boolean(stream.isVisible),
      viewerCount: Number(stream.viewerCount) || 0,
      likeCount: Number(stream.likeCount) || 0,
      tournamentId: stream.tournamentId || null,
      startedAt: stream.startedAt || null,
      playbackUrl: stream.playbackUrl || "",
      thumbnailUrl: stream.thumbnailUrl || "",
      description: stream.description || "",
      authorName: profiles.get(stream.userId)?.displayName || `User ${stream.userId}`,
    })),
    total: streams.length,
  };
}

async function moderateStream({ actor, streamId, isVisible }) {
  const updated = await adminRepo.updateStreamVisibility({
    streamId: Number(streamId),
    isVisible: Boolean(isVisible),
  });

  if (!updated) {
    const error = new Error("Stream not found.");
    error.statusCode = 404;
    throw error;
  }

  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.stream_moderated",
    entityType: "stream",
    entityId: updated.streamId,
    details: {
      isVisible: updated.isVisible,
      title: updated.title,
    },
  });

  return updated;
}

async function publishStream({ actor, title, gameName, playbackUrl, thumbnailUrl, description, isLive, isVisible, startedAt, tournamentId }) {
  const trimmedTitle = String(title || "").trim();
  if (!trimmedTitle) {
    const error = new Error("Stream title is required.");
    error.statusCode = 400;
    throw error;
  }

  const trimmedUrl = String(playbackUrl || "").trim();
  if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
    const error = new Error("A valid playback URL (http or https) is required.");
    error.statusCode = 400;
    throw error;
  }

  const isLiveBool = Boolean(isLive);

  let resolvedStartedAt = startedAt ? new Date(startedAt) : null;
  if (isLiveBool && !resolvedStartedAt) {
    resolvedStartedAt = new Date();
  }
  if (resolvedStartedAt && Number.isNaN(resolvedStartedAt.getTime())) {
    resolvedStartedAt = null;
  }

  const resolvedTournamentId = tournamentId ? Number(tournamentId) : null;

  const stream = await adminRepo.createStream({
    userId: actor.userId,
    title: trimmedTitle,
    gameName: String(gameName || "").trim() || null,
    playbackUrl: trimmedUrl,
    thumbnailUrl: String(thumbnailUrl || "").trim() || null,
    description: String(description || "").trim() || null,
    isLive: isLiveBool,
    isVisible: isVisible !== false,
    startedAt: resolvedStartedAt,
    tournamentId: Number.isInteger(resolvedTournamentId) && resolvedTournamentId > 0 ? resolvedTournamentId : null,
  });

  if (!stream) {
    const error = new Error("Stream was not created. The database did not return the new record.");
    error.statusCode = 500;
    throw error;
  }

  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.stream_published",
    entityType: "stream",
    entityId: stream.streamId,
    details: { title: stream.title, isLive: stream.isLive },
  });

  return stream;
}

async function getReportsSummary({ range }) {
  const overview = await getAnalyticsOverview({ range });
  const summary = await adminRepo.getSummaryReportCounts();

  return {
    summary,
    analytics: overview,
  };
}

function buildCsvReport(type, payload) {
  switch (type) {
    case "users":
      return toCsv(payload.items || [], [
        "publicId",
        "userId",
        "username",
        "firstName",
        "lastName",
        "email",
        "studentId",
        "phoneNumber",
        "school",
        "courseYear",
        "primaryGame",
        "dateOfBirth",
        "role",
        "authProvider",
        "mfaEnrolled",
        "isActive",
        "createdAt",
      ]);
    case "audit":
      return toCsv(payload.items || [], [
        "auditId",
        "actorUserId",
        "actorRole",
        "actionType",
        "entityType",
        "entityId",
        "createdAt",
      ]);
    default:
      return toCsv([
        payload.summary || {},
      ], ["users", "posts", "streams", "reactions", "comments", "tournaments"]);
  }
}

function toCsv(items, columns) {
  const lines = [
    columns.join(","),
    ...items.map((item) => columns.map((column) => csvEscape(item[column])).join(",")),
  ];
  return lines.join("\n");
}

function csvEscape(value) {
  const normalized = value == null ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function normalizeRange(value) {
  switch (String(value || "").toLowerCase()) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

async function updateStream({ actor, streamId, title, gameName, playbackUrl, thumbnailUrl, description, isLive, isVisible, tournamentId }) {
  const trimmedTitle = String(title || "").trim();
  if (!trimmedTitle) {
    const error = new Error("Stream title is required.");
    error.statusCode = 400;
    throw error;
  }

  const trimmedUrl = String(playbackUrl || "").trim();
  if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
    const error = new Error("A valid playback URL (http or https) is required.");
    error.statusCode = 400;
    throw error;
  }

  const updated = await adminRepo.updateStream({
    streamId: Number(streamId),
    title: trimmedTitle,
    gameName: String(gameName || "").trim() || null,
    playbackUrl: trimmedUrl,
    thumbnailUrl: String(thumbnailUrl || "").trim() || null,
    description: String(description || "").trim() || null,
    isLive: Boolean(isLive),
    isVisible: isVisible !== false,
    tournamentId: tournamentId ? Number(tournamentId) : null,
  });

  if (!updated) {
    const error = new Error("Stream not found.");
    error.statusCode = 404;
    throw error;
  }

  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.stream_updated",
    entityType: "stream",
    entityId: updated.streamId,
    details: { title: updated.title, isLive: updated.isLive },
  });

  return updated;
}

async function listAllEvents() {
  return adminRepo.listAllEvents();
}

async function createEvent({ actor, title, category, description, eventDate, eventTime, venue, isPublished }) {
  if (!String(title || "").trim()) {
    const error = new Error("Event title is required.");
    error.statusCode = 400;
    throw error;
  }
  const event = await adminRepo.createEvent({
    title: String(title).trim(),
    category: category || null,
    description: description || null,
    eventDate: eventDate || null,
    eventTime: eventTime || null,
    venue: venue || null,
    isPublished: isPublished !== false,
  });
  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.event_created",
    entityType: "event",
    entityId: event.eventId,
    details: { title: event.title },
  });
  return event;
}

async function updateEvent({ actor, eventId, title, category, description, eventDate, eventTime, venue, isPublished }) {
  if (!String(title || "").trim()) {
    const error = new Error("Event title is required.");
    error.statusCode = 400;
    throw error;
  }
  const event = await adminRepo.updateEvent({
    eventId: Number(eventId),
    title: String(title).trim(),
    category: category || null,
    description: description || null,
    eventDate: eventDate || null,
    eventTime: eventTime || null,
    venue: venue || null,
    isPublished: isPublished !== false,
  });
  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }
  return event;
}

async function deleteEvent({ eventId }) {
  const deleted = await adminRepo.deleteEvent(Number(eventId));
  if (!deleted) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }
  return { message: "Event deleted." };
}

async function setStreamLiveStatus({ actor, streamId, isLive }) {
  const updated = await adminRepo.setStreamLiveStatus({
    streamId: Number(streamId),
    isLive: Boolean(isLive),
  });

  if (!updated) {
    const error = new Error("Stream not found.");
    error.statusCode = 404;
    throw error;
  }

  await auditService.logAuditEvent({
    actorUserId: actor.userId,
    actorRole: actor.userRole,
    actionType: "admin.stream_updated",
    entityType: "stream",
    entityId: updated.streamId,
    details: { isLive: updated.isLive },
  });

  return updated;
}

module.exports = {
  listUsers,
  updateUserRole,
  getAnalyticsOverview,
  listRecentActivity,
  listStreamsModeration,
  moderateStream,
  publishStream,
  updateStream,
  setStreamLiveStatus,
  getReportsSummary,
  buildCsvReport,
  listAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
