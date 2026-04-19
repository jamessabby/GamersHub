const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userRepo = require("../users/user.repository");
const profileRepo = require("../users/profile.repository");
const profileService = require("../users/user.service");
const sessionRepo = require("./session.repository");
const auditService = require("../audit/audit.service");
const {
  createOpaqueToken,
  hashToken,
  createSignedToken,
  verifySignedToken,
} = require("./token.util");
const {
  generateBase32Secret,
  buildOtpAuthUri,
  verifyTotp,
} = require("./totp.util");

const APPROVED_EMAIL_DOMAIN = String(process.env.APPROVED_EMAIL_DOMAIN || "").trim().toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";
const FALLBACK_APP_BASE_URL = (process.env.APP_BASE_URL || "http://127.0.0.1:5500/frontend").replace(/\/+$/, "");
const MFA_ISSUER = process.env.MFA_ISSUER || "GamersHub";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

async function registerUser(data) {
  const { username, email, password } = data;
  if (!username || !email || !password) {
    throw badRequest("Username, email, and password are required.");
  }

  const normalizedUsername = String(username).trim();
  const normalizedEmail = normalizeEmail(email);
  validateApprovedEmail(normalizedEmail);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw badRequest("Please enter a valid email address.");
  }

  const [existingUser, existingEmail] = await Promise.all([
    userRepo.findByUsername(normalizedUsername),
    userRepo.findByEmail(normalizedEmail),
  ]);
  if (existingUser) {
    throw conflict("User already exists");
  }
  if (existingEmail) {
    throw conflict("Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const createdUser = await userRepo.createUser({
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: hashedPassword,
    mfaSecret: generateBase32Secret(),
    authProvider: "local",
    mfaEnrolled: false,
  });

  await profileService.ensureProfileForUser({
    userId: createdUser.userId,
    username: createdUser.username,
    email: createdUser.email,
  });

  return {
    message: "User created successfully",
    user: mapUser(createdUser),
  };
}

async function loginUser(data) {
  const { username, password } = data;
  if (!username || !password) {
    throw badRequest("Username and password are required.");
  }

  const user = await userRepo.findByUsername(String(username).trim());
  if (!user || !user.isActive) {
    await auditService.logAuditEvent({
      actorUserId: user?.userId || null,
      actorRole: user?.userRole || null,
      actionType: "auth.login_failed",
      entityType: "user",
      entityId: user?.userId || null,
      details: { username: String(username).trim(), reason: "invalid_credentials" },
    });
    throw unauthorized("Invalid credentials.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash || "");
  if (!isMatch) {
    await auditService.logAuditEvent({
      actorUserId: user.userId,
      actorRole: user.userRole,
      actionType: "auth.login_failed",
      entityType: "user",
      entityId: user.userId,
      details: { reason: "invalid_credentials" },
    });
    throw unauthorized("Invalid credentials.");
  }

  const mfaTicket = createSignedToken(
    {
      type: "mfa_ticket",
      userId: user.userId,
      provider: "local",
    },
    { expiresInSeconds: 5 * 60 },
  );

  await auditService.logAuditEvent({
    actorUserId: user.userId,
    actorRole: user.userRole,
    actionType: "auth.login_password_verified",
    entityType: "user",
    entityId: user.userId,
    details: { authProvider: "local" },
  });

  return {
    message: "Password verified. MFA required.",
    mfaRequired: true,
    mfaSetupRequired: !Boolean(user.mfaEnrolled),
    mfaTicket,
    user: mapUser(user),
  };
}

async function setupMfa(payload) {
  const ticket = verifySignedToken(payload.mfaTicket);
  if (!ticket || ticket.type !== "mfa_ticket") {
    throw unauthorized("MFA session expired. Please log in again.");
  }

  const user = await userRepo.findById(ticket.userId);
  if (!user || !user.isActive) {
    throw unauthorized("User not found.");
  }

  let secret = user.mfaSecret || "";
  if (!isBase32Secret(secret)) {
    secret = generateBase32Secret();
    await userRepo.updateMfaSecret(user.userId, secret);
  }

  return {
    secret,
    issuer: MFA_ISSUER,
    accountName: user.email || user.username,
    otpauthUri: buildOtpAuthUri({
      secret,
      accountName: user.email || user.username,
      issuer: MFA_ISSUER,
    }),
  };
}

async function verifyMfa(payload) {
  const ticket = verifySignedToken(payload.mfaTicket);
  if (!ticket || ticket.type !== "mfa_ticket") {
    throw unauthorized("MFA session expired. Please log in again.");
  }

  const user = await userRepo.findById(ticket.userId);
  if (!user || !user.isActive) {
    throw unauthorized("User not found.");
  }

  const secret = user.mfaSecret;
  if (!secret || !verifyTotp(secret, payload.code)) {
    await auditService.logAuditEvent({
      actorUserId: user.userId,
      actorRole: user.userRole,
      actionType: "auth.mfa_failed",
      entityType: "user",
      entityId: user.userId,
      details: { authProvider: "local" },
    });
    throw unauthorized("Invalid verification code.");
  }

  if (!user.mfaEnrolled) {
    await userRepo.updateMfaEnrollment(user.userId, true);
  }

  const session = await createUserSession(user);
  const needsSchoolVerification = await getNeedsSchoolVerification(user.userId);

  await auditService.logAuditEvent({
    actorUserId: user.userId,
    actorRole: user.userRole,
    actionType: "auth.login_success",
    entityType: "user",
    entityId: user.userId,
    details: { authProvider: "local", mfaVerified: true },
  });

  return buildAuthResponse(user, session.token, needsSchoolVerification);
}

async function getCurrentUser(authContext) {
  if (!authContext?.user) {
    throw unauthorized("Authentication required.");
  }

  const needsSchoolVerification = await getNeedsSchoolVerification(authContext.user.userId);
  return {
    user: mapUser(authContext.user),
    needsSchoolVerification,
    redirectPath: resolveRedirectPath(authContext.user.userRole, needsSchoolVerification),
  };
}

async function logoutUser(authContext) {
  if (!authContext?.tokenHash || !authContext?.user) {
    return { success: true };
  }

  await sessionRepo.revokeSessionByTokenHash(authContext.tokenHash);
  await auditService.logAuditEvent({
    actorUserId: authContext.user.userId,
    actorRole: authContext.user.userRole,
    actionType: "auth.logout",
    entityType: "session",
    entityId: authContext.session?.sessionId || null,
    details: { authProvider: authContext.user.authProvider || "local" },
  });

  return { success: true };
}

function buildGoogleStartUrl({ redirectBase } = {}) {
  ensureGoogleConfigured();
  const frontendBase = resolveFrontendBase(redirectBase);
  const state = createSignedToken(
    {
      type: "google_oauth_state",
      redirectBase: frontendBase,
    },
    { expiresInSeconds: 10 * 60 },
  );

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_CALLBACK_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function handleGoogleCallback({ code, state }) {
  ensureGoogleConfigured();

  const verifiedState = verifySignedToken(state);
  if (!verifiedState || verifiedState.type !== "google_oauth_state") {
    throw badRequest("OAuth state is invalid or expired.");
  }

  if (!code) {
    throw badRequest("Google did not return an authorization code.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw badRequest(`Google token exchange failed: ${errorText}`);
  }

  const tokenPayload = await tokenResponse.json();
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    const errorText = await userInfoResponse.text();
    throw badRequest(`Google user info lookup failed: ${errorText}`);
  }

  const googleProfile = await userInfoResponse.json();
  const user = await upsertGoogleUser(googleProfile);
  const session = await createUserSession(user);
  const needsSchoolVerification = await getNeedsSchoolVerification(user.userId);

  await auditService.logAuditEvent({
    actorUserId: user.userId,
    actorRole: user.userRole,
    actionType: "auth.google_login_success",
    entityType: "user",
    entityId: user.userId,
    details: { email: user.email },
  });

  return {
    redirectBase: verifiedState.redirectBase,
    token: session.token,
    redirectPath: resolveRedirectPath(user.userRole, needsSchoolVerification),
  };
}

async function createUserSession(user) {
  const token = createOpaqueToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await sessionRepo.createSession({
    userId: user.userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

async function upsertGoogleUser(googleProfile) {
  const googleSub = String(googleProfile.sub || "").trim();
  const email = normalizeEmail(googleProfile.email);

  if (!googleSub || !email || googleProfile.email_verified !== true) {
    throw badRequest("Google account did not return a verified email address.");
  }

  validateApprovedEmail(email);

  const existingByGoogleSub = await userRepo.findByGoogleSub(googleSub);
  if (existingByGoogleSub) {
    return existingByGoogleSub;
  }

  const existingByEmail = await userRepo.findByEmail(email);
  if (existingByEmail) {
    return userRepo.updateGoogleLink(existingByEmail.userId, {
      googleSub,
      avatarUrl: googleProfile.picture || null,
      authProvider: "google",
    });
  }

  const username = await generateUniqueUsername(googleProfile);
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const createdUser = await userRepo.createUser({
    username,
    email,
    passwordHash,
    mfaSecret: generateBase32Secret(),
    role: "user",
    authProvider: "google",
    googleSub,
    avatarUrl: googleProfile.picture || null,
    mfaEnrolled: false,
  });

  await profileService.ensureProfileForUser({
    userId: createdUser.userId,
    username: createdUser.username,
    email: createdUser.email,
  });

  return createdUser;
}

async function generateUniqueUsername(googleProfile) {
  const preferred = String(
    googleProfile.preferred_username
      || googleProfile.given_name
      || googleProfile.name
      || normalizeEmail(googleProfile.email).split("@")[0],
  )
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18) || "player";

  let candidate = preferred;
  let suffix = 0;
  while (await userRepo.findByUsername(candidate)) {
    suffix += 1;
    candidate = `${preferred.slice(0, Math.max(1, 18 - String(suffix).length))}${suffix}`;
  }
  return candidate;
}

async function getNeedsSchoolVerification(userId) {
  const profile = await profileRepo.findByUserId(userId).catch(() => null);
  if (!profile) {
    return true;
  }

  const studentId = String(profile.studentId || "").trim();
  const school = String(profile.school || "").trim();
  return !studentId || studentId.startsWith("TEMP-") || !school;
}

function buildAuthResponse(user, token, needsSchoolVerification) {
  return {
    message: "Authentication successful",
    token,
    user: mapUser(user),
    authProvider: user.authProvider || "local",
    needsSchoolVerification,
    redirectPath: resolveRedirectPath(user.userRole, needsSchoolVerification),
  };
}

function mapUser(user) {
  return {
    userId: user.userId,
    username: user.username,
    role: user.userRole,
    email: user.email,
    authProvider: user.authProvider || "local",
    avatarUrl: user.avatarUrl || "",
  };
}

function resolveRedirectPath(role, needsSchoolVerification) {
  if (needsSchoolVerification) {
    return "auth/school-verification.html";
  }

  switch (String(role || "").toLowerCase()) {
    case "superadmin":
      return "superadmin/dashboard.html";
    case "admin":
      return "admin/dashboard.html";
    default:
      return "player/dashboard.html";
  }
}

function resolveFrontendBase(candidate) {
  try {
    if (candidate) {
      const url = new URL(candidate);
      return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
    }
  } catch {
    // Fall through to the configured default.
  }

  return FALLBACK_APP_BASE_URL;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateApprovedEmail(email) {
  if (!APPROVED_EMAIL_DOMAIN) {
    return;
  }

  const domain = email.split("@")[1];
  if (!domain || domain !== APPROVED_EMAIL_DOMAIN) {
    throw badRequest(`Only @${APPROVED_EMAIL_DOMAIN} email addresses are allowed.`);
  }
}

function ensureGoogleConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw badRequest("Google OAuth is not configured on the backend.");
  }
}

function isBase32Secret(secret) {
  return /^[A-Z2-7]{16,50}$/.test(String(secret || ""));
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function unauthorized(message) {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function conflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

module.exports = {
  registerUser,
  loginUser,
  setupMfa,
  verifyMfa,
  getCurrentUser,
  logoutUser,
  buildGoogleStartUrl,
  handleGoogleCallback,
};
