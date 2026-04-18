const authUserRepo = require("./user.repository");
const profileRepo = require("./profile.repository");
const friendRepo = require("./friend.repository");
const notificationRepo = require("./notification.repository");

async function ensureProfileForUser({ userId, username, email }) {
  let profile = await profileRepo.findByUserId(userId);
  const fallbackStudentId = buildFallbackStudentId(userId);

  if (!profile) {
    profile = await profileRepo.createProfile({
      userId,
      username,
      email,
      studentId: fallbackStudentId,
    });
  } else if (
    !hasText(profile.studentId) ||
    (profile.email || null) !== (email || null)
  ) {
    profile = await profileRepo.updateProfile(userId, {
      ...profile,
      studentId: hasText(profile.studentId) ? profile.studentId : fallbackStudentId,
      email,
    });
  }

  return profile;
}

async function getProfileByUserId(userId) {
  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
    const error = new Error("A valid userId is required.");
    error.statusCode = 400;
    throw error;
  }

  const authUser = await authUserRepo.findById(parsedUserId);
  if (!authUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const profile = await ensureProfileForUser({
    userId: authUser.userId,
    username: authUser.username,
    email: authUser.email,
  });

  return mapProfileResponse(authUser, profile);
}

async function updateProfileByUserId(userId, payload) {
  const parsedUserId = Number(userId);
  if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
    const error = new Error("A valid userId is required.");
    error.statusCode = 400;
    throw error;
  }

  const authUser = await authUserRepo.findById(parsedUserId);
  if (!authUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const currentProfile = await ensureProfileForUser({
    userId: authUser.userId,
    username: authUser.username,
    email: authUser.email,
  });

  const mergedProfile = {
    studentId: normalizeText(payload.studentId ?? currentProfile.studentId),
    firstName: normalizeText(payload.firstName ?? currentProfile.firstName),
    lastName: normalizeText(payload.lastName ?? currentProfile.lastName),
    dateOfBirth: normalizeDate(
      payload.dateOfBirth ?? currentProfile.dateOfBirth,
    ),
    displayName: normalizeText(
      payload.displayName ?? currentProfile.displayName ?? authUser.username,
    ),
    email: authUser.email,
    phoneNumber: normalizeText(payload.phoneNumber ?? currentProfile.phoneNumber),
    school: normalizeText(payload.school ?? currentProfile.school),
    primaryGame: normalizePrimaryGames(
      payload.primaryGames ?? currentProfile.primaryGame,
    ),
  };

  const updatedProfile = await profileRepo.updateProfile(parsedUserId, mergedProfile);

  return mapProfileResponse(authUser, updatedProfile);
}

async function searchPlayers({ viewerUserId, query, limit }) {
  const parsedViewerUserId = parsePositiveUserId(viewerUserId);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return {
      items: [],
      total: 0,
    };
  }

  await assertUserExists(parsedViewerUserId);

  const profiles = await profileRepo.searchProfiles({
    query: normalizedQuery,
    excludeUserId: parsedViewerUserId,
    limit: Number.isInteger(limit) ? limit : Number(limit) || 8,
  });
  const items = await Promise.all(
    profiles.map((profile) => mapRelationshipProfile(profile, parsedViewerUserId)),
  );

  return {
    items,
    total: items.length,
  };
}

async function getFriendsByUserId(userId) {
  const parsedUserId = parsePositiveUserId(userId);
  await assertUserExists(parsedUserId);

  const relationships = await friendRepo.listRelationshipsForUser(parsedUserId);
  const accepted = [];
  const incoming = [];
  const outgoing = [];

  for (const relationship of relationships) {
    const isRequester = relationship.userAId === parsedUserId;
    const counterpartUserId = isRequester ? relationship.userBId : relationship.userAId;
    const person = await loadPersonSummary(counterpartUserId);
    const item = {
      ...person,
      relationshipState: relationship.status === "accepted"
        ? "friends"
        : isRequester
          ? "outgoing_pending"
          : "incoming_pending",
      requestedByUserId: relationship.userAId,
      requestedToUserId: relationship.userBId,
    };

    if (relationship.status === "accepted") {
      accepted.push(item);
    } else if (isRequester) {
      outgoing.push(item);
    } else {
      incoming.push(item);
    }
  }

  return {
    accepted,
    incoming,
    outgoing,
  };
}

async function createFriendRequest(userId, payload) {
  const requesterUserId = parsePositiveUserId(userId);
  const targetUserId = parsePositiveUserId(payload.targetUserId);

  if (requesterUserId === targetUserId) {
    const error = new Error("You cannot add yourself as a friend.");
    error.statusCode = 400;
    throw error;
  }

  await Promise.all([
    assertUserExists(requesterUserId),
    assertUserExists(targetUserId),
  ]);

  const existingRelationship = await friendRepo.findRelationship(requesterUserId, targetUserId);
  if (existingRelationship) {
    const error = new Error(resolveExistingRelationshipMessage(existingRelationship, requesterUserId));
    error.statusCode = 409;
    throw error;
  }

  await friendRepo.createFriendRequest({
    requesterUserId,
    targetUserId,
  });

  const requester = await loadPersonSummary(requesterUserId);
  await notificationRepo.createNotification({
    userId: targetUserId,
    notificationType: "friend_request",
    title: "New friend request",
    body: `${requester.displayName} sent you a friend request.`,
    linkUrl: "../player/dashboard.html",
  });

  return getFriendsByUserId(requesterUserId);
}

async function respondToFriendRequest(userId, requesterUserId, payload) {
  const targetUserId = parsePositiveUserId(userId);
  const parsedRequesterUserId = parsePositiveUserId(requesterUserId);
  const action = normalizeText(payload.action)?.toLowerCase();

  if (!["accept", "decline"].includes(action)) {
    const error = new Error('Action must be "accept" or "decline".');
    error.statusCode = 400;
    throw error;
  }

  await Promise.all([
    assertUserExists(targetUserId),
    assertUserExists(parsedRequesterUserId),
  ]);

  const relationship = await friendRepo.findRelationship(targetUserId, parsedRequesterUserId);
  if (!relationship || relationship.status !== "pending") {
    const error = new Error("Friend request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (
    relationship.userAId !== parsedRequesterUserId ||
    relationship.userBId !== targetUserId
  ) {
    const error = new Error("Only the requested player can respond to this friend request.");
    error.statusCode = 403;
    throw error;
  }

  if (action === "accept") {
    await friendRepo.updateRelationshipStatus({
      requesterUserId: parsedRequesterUserId,
      targetUserId,
      status: "accepted",
    });

    const target = await loadPersonSummary(targetUserId);
    await notificationRepo.createNotification({
      userId: parsedRequesterUserId,
      notificationType: "friend_accept",
      title: "Friend request accepted",
      body: `${target.displayName} accepted your friend request.`,
      linkUrl: "../player/dashboard.html",
    });
  } else {
    await friendRepo.deleteRelationship({
      requesterUserId: parsedRequesterUserId,
      targetUserId,
    });
  }

  return getFriendsByUserId(targetUserId);
}

async function removeFriendByUserId(userId, friendUserId) {
  const parsedUserId = parsePositiveUserId(userId);
  const parsedFriendUserId = parsePositiveUserId(
    friendUserId,
    "A valid friendUserId is required.",
  );

  if (parsedUserId === parsedFriendUserId) {
    const error = new Error("You cannot remove yourself from your friends list.");
    error.statusCode = 400;
    throw error;
  }

  await Promise.all([
    assertUserExists(parsedUserId),
    assertUserExists(parsedFriendUserId),
  ]);

  const relationship = await friendRepo.findRelationship(parsedUserId, parsedFriendUserId);
  if (!relationship || relationship.status !== "accepted") {
    const error = new Error("Accepted friendship not found.");
    error.statusCode = 404;
    throw error;
  }

  await friendRepo.deleteAcceptedRelationshipBetweenUsers(
    parsedUserId,
    parsedFriendUserId,
  );

  return getFriendsByUserId(parsedUserId);
}

async function getNotificationsByUserId(userId) {
  const parsedUserId = parsePositiveUserId(userId);
  await assertUserExists(parsedUserId);

  const items = await notificationRepo.listNotificationsByUserId(parsedUserId);
  return {
    items: items.map(mapNotification),
    total: items.length,
  };
}

async function markNotificationReadByUserId(userId, notificationId) {
  const parsedUserId = parsePositiveUserId(userId);
  const parsedNotificationId = parsePositiveUserId(notificationId, "A valid notificationId is required.");
  await assertUserExists(parsedUserId);

  const notification = await notificationRepo.markNotificationRead(
    parsedUserId,
    parsedNotificationId,
  );

  if (!notification) {
    const error = new Error("Notification not found.");
    error.statusCode = 404;
    throw error;
  }

  return mapNotification(notification);
}

async function markAllNotificationsReadByUserId(userId) {
  const parsedUserId = parsePositiveUserId(userId);
  await assertUserExists(parsedUserId);

  const updatedCount = await notificationRepo.markAllNotificationsRead(parsedUserId);
  return {
    updatedCount,
  };
}

function mapProfileResponse(authUser, profile) {
  const primaryGames = splitPrimaryGames(profile?.primaryGame);

  return {
    userId: authUser.userId,
    username: authUser.username,
    email: authUser.email,
    role: authUser.userRole,
    studentId: profile?.studentId || "",
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    dateOfBirth: profile?.dateOfBirth || "",
    displayName: profile?.displayName || authUser.username,
    phoneNumber: profile?.phoneNumber || "",
    school: profile?.school || "",
    primaryGames,
    primaryGame: primaryGames[0] || "",
    schoolTag: buildSchoolTag(profile?.school),
  };
}

async function mapRelationshipProfile(profile, viewerUserId) {
  const authUser = await authUserRepo.findById(profile.userId);
  const relationship = await friendRepo.findRelationship(viewerUserId, profile.userId);

  return {
    userId: profile.userId,
    username: authUser?.username || `user-${profile.userId}`,
    displayName: profile.displayName || authUser?.username || `User ${profile.userId}`,
    school: profile.school || "",
    schoolTag: buildSchoolTag(profile.school),
    primaryGame: profile.primaryGame || "",
    relationshipState: mapRelationshipState(relationship, viewerUserId, profile.userId),
  };
}

async function loadPersonSummary(userId) {
  const [authUser, profile] = await Promise.all([
    authUserRepo.findById(userId),
    profileRepo.findByUserId(userId),
  ]);

  if (!authUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId,
    username: authUser.username,
    displayName: profile?.displayName || authUser.username,
    school: profile?.school || "",
    schoolTag: buildSchoolTag(profile?.school),
    primaryGame: profile?.primaryGame || "",
  };
}

function mapRelationshipState(relationship, viewerUserId, targetUserId) {
  if (!relationship) {
    return "none";
  }

  if (relationship.status === "accepted") {
    return "friends";
  }

  if (relationship.userAId === viewerUserId && relationship.userBId === targetUserId) {
    return "outgoing_pending";
  }

  return "incoming_pending";
}

function resolveExistingRelationshipMessage(relationship, requesterUserId) {
  if (relationship.status === "accepted") {
    return "You are already friends with this player.";
  }

  return relationship.userAId === requesterUserId
    ? "A friend request is already pending."
    : "This player has already sent you a friend request.";
}

function mapNotification(notification) {
  return {
    notificationId: notification.notificationId,
    userId: notification.userId,
    notificationType: notification.notificationType,
    title: notification.title,
    body: notification.body || "",
    linkUrl: notification.linkUrl || "#",
    isRead: Boolean(notification.isRead),
    createdAt: notification.createdAt || null,
    readAt: notification.readAt || null,
  };
}

async function assertUserExists(userId) {
  const authUser = await authUserRepo.findById(userId);
  if (!authUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return authUser;
}

function parsePositiveUserId(value, message = "A valid userId is required.") {
  const parsedUserId = Number(value);
  if (!Number.isInteger(parsedUserId) || parsedUserId < 1) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  return parsedUserId;
}

function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizePrimaryGames(primaryGames) {
  if (Array.isArray(primaryGames)) {
    const cleaned = primaryGames
      .map((game) => String(game || "").trim())
      .filter(Boolean);

    return cleaned.length ? cleaned.join(", ") : null;
  }

  return normalizeText(primaryGames);
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function splitPrimaryGames(primaryGameText) {
  if (!primaryGameText) {
    return [];
  }

  return String(primaryGameText)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildSchoolTag(school) {
  if (!school) {
    return "";
  }

  const words = String(school)
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 4);

  if (!words.length) {
    return "";
  }

  return words.map((word) => word[0].toUpperCase()).join("");
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function buildFallbackStudentId(userId) {
  return `TEMP-${userId}`;
}

module.exports = {
  ensureProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  searchPlayers,
  getFriendsByUserId,
  createFriendRequest,
  respondToFriendRequest,
  removeFriendByUserId,
  getNotificationsByUserId,
  markNotificationReadByUserId,
  markAllNotificationsReadByUserId,
};
