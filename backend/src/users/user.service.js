const authUserRepo = require("./user.repository");
const profileRepo = require("./profile.repository");

async function ensureProfileForUser({ userId, username, email }) {
  let profile = await profileRepo.findByUserId(userId);

  if (!profile) {
    profile = await profileRepo.createProfile({
      userId,
      username,
      email,
    });
  } else if ((profile.email || null) !== (email || null)) {
    profile = await profileRepo.updateProfile(userId, {
      ...profile,
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

module.exports = {
  ensureProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
};
