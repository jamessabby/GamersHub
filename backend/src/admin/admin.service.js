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
        username: item.username,
        email: item.email,
        role: item.userRole,
        authProvider: item.authProvider || "local",
        avatarUrl: item.avatarUrl || "",
        mfaEnrolled: Boolean(item.mfaEnrolled),
        isActive: Boolean(item.isActive),
        createdAt: item.createdAt || null,
        displayName: profile?.displayName || item.username,
        studentId: profile?.studentId || "",
        school: profile?.school || "",
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
  const [roleCounts, registrations, totals] = await Promise.all([
    userRepo.countUsersByRole(),
    userRepo.countRegistrationsByDay({ days: parsedRange }),
    adminRepo.getAnalyticsCounts(),
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
  };
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
      startedAt: stream.startedAt || null,
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
        "userId",
        "username",
        "email",
        "role",
        "authProvider",
        "mfaEnrolled",
        "isActive",
        "school",
        "studentId",
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

module.exports = {
  listUsers,
  updateUserRole,
  getAnalyticsOverview,
  listStreamsModeration,
  moderateStream,
  getReportsSummary,
  buildCsvReport,
};
