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
const { generateBase32Secret } = require("./totp.util");
const { sendMfaCodeEmail } = require("./mail.util");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";
const MICROSOFT_CALLBACK_URL = process.env.MICROSOFT_CALLBACK_URL || "http://localhost:3000/api/auth/microsoft/callback";
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const FALLBACK_APP_BASE_URL = (process.env.APP_BASE_URL || "http://127.0.0.1:5500/frontend").replace(/\/+$/, "");
const MFA_CODE_TTL_MINUTES = Math.max(1, Number(process.env.MFA_CODE_TTL_MINUTES) || 10);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

async function registerUser(data) {
  const { username, email, password } = data;
  if (!username || !email || !password) {
    throw badRequest("Username, email, and password are required.");
  }

  const normalizedUsername = String(username).trim();
  const normalizedEmail = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw badRequest("Please enter a valid email address.");
  }

  const existingUser = await userRepo.findByUsername(normalizedUsername);
  if (existingUser) {
    throw conflict("User already exists");
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
    mfaSetupRequired: false,
    mfaTicket,
    user: mapUser(user),
  };
}

async function setupMfa(payload) {
  const ticket = verifySignedToken(payload.mfaTicket);
  if (!ticket || !["mfa_ticket", "mfa_email_challenge"].includes(ticket.type)) {
    throw unauthorized("MFA session expired. Please log in again.");
  }

  const user = await userRepo.findById(ticket.userId);
  if (!user || !user.isActive) {
    throw unauthorized("User not found.");
  }

  const code = generateEmailCode();
  await sendMfaCodeEmail({
    to: user.email,
    username: user.username,
    code,
    expiresInMinutes: MFA_CODE_TTL_MINUTES,
  });

  const mfaTicket = createSignedToken(
    {
      type: "mfa_email_challenge",
      userId: user.userId,
      provider: "local",
      email: user.email,
      codeHash: hashEmailVerificationCode(user.userId, code),
    },
    { expiresInSeconds: MFA_CODE_TTL_MINUTES * 60 },
  );

  await auditService.logAuditEvent({
    actorUserId: user.userId,
    actorRole: user.userRole,
    actionType: "auth.mfa_code_sent",
    entityType: "user",
    entityId: user.userId,
    details: { authProvider: "local", delivery: "email" },
  });

  return {
    message: "Verification code sent.",
    mfaTicket,
    delivery: "email",
    maskedEmail: maskEmail(user.email),
    expiresInSeconds: MFA_CODE_TTL_MINUTES * 60,
  };
}

async function verifyMfa(payload) {
  const ticket = verifySignedToken(payload.mfaTicket);
  if (!ticket || ticket.type !== "mfa_email_challenge") {
    throw unauthorized("Verification code expired. Request a new code and try again.");
  }

  const user = await userRepo.findById(ticket.userId);
  if (!user || !user.isActive) {
    throw unauthorized("User not found.");
  }

  const submittedCode = String(payload.code || "").trim();
  if (!/^\d{6}$/.test(submittedCode) || !matchesVerificationCode(ticket.codeHash, hashEmailVerificationCode(user.userId, submittedCode))) {
    await auditService.logAuditEvent({
      actorUserId: user.userId,
      actorRole: user.userRole,
      actionType: "auth.mfa_failed",
      entityType: "user",
      entityId: user.userId,
      details: { authProvider: "local", delivery: "email" },
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
    details: { authProvider: "local", delivery: "email", mfaVerified: true },
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
  return buildOAuthStartUrl({
    provider: "google",
    redirectBase,
    clientId: GOOGLE_CLIENT_ID,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    callbackUrl: GOOGLE_CALLBACK_URL,
    scopes: ["openid", "email", "profile"],
  });
}

function buildMicrosoftStartUrl({ redirectBase } = {}) {
  ensureMicrosoftConfigured();
  return buildOAuthStartUrl({
    provider: "microsoft",
    redirectBase,
    clientId: MICROSOFT_CLIENT_ID,
    authorizationUrl: getMicrosoftAuthorizationUrl(),
    callbackUrl: MICROSOFT_CALLBACK_URL,
    scopes: ["openid", "email", "profile", "User.Read"],
  });
}

async function handleGoogleCallback({ code, state }) {
  ensureGoogleConfigured();
  const verifiedState = verifyOAuthState(state, "google");
  const tokenPayload = await exchangeOAuthCode({
    providerLabel: "Google",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackUrl: GOOGLE_CALLBACK_URL,
    code,
  });

  const googleProfile = await fetchGoogleProfile(tokenPayload.access_token);
  const user = await upsertGoogleUser(googleProfile);
  return finalizeOAuthSignIn({
    user,
    redirectBase: verifiedState.redirectBase,
    auditActionType: "auth.google_login_success",
  });
}

async function handleMicrosoftCallback({ code, state }) {
  ensureMicrosoftConfigured();
  const verifiedState = verifyOAuthState(state, "microsoft");
  const tokenPayload = await exchangeOAuthCode({
    providerLabel: "Microsoft",
    tokenUrl: getMicrosoftTokenUrl(),
    clientId: MICROSOFT_CLIENT_ID,
    clientSecret: MICROSOFT_CLIENT_SECRET,
    callbackUrl: MICROSOFT_CALLBACK_URL,
    code,
  });

  const microsoftProfile = await fetchMicrosoftProfile(tokenPayload);
  const user = await upsertMicrosoftUser(microsoftProfile);
  return finalizeOAuthSignIn({
    user,
    redirectBase: verifiedState.redirectBase,
    auditActionType: "auth.microsoft_login_success",
  });
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
  if (!googleProfile.sub || !googleProfile.email || googleProfile.emailVerified !== true) {
    throw badRequest("Google account did not return a verified email address.");
  }

  const existingByGoogleSub = await userRepo.findByGoogleSub(googleProfile.sub);
  if (existingByGoogleSub) {
    return existingByGoogleSub;
  }

  const existingByEmail = await userRepo.findByEmail(googleProfile.email);
  if (existingByEmail) {
    return userRepo.updateGoogleLink(existingByEmail.userId, {
      googleSub: googleProfile.sub,
      avatarUrl: googleProfile.picture || null,
      authProvider: "google",
    });
  }

  const username = await generateUniqueUsername(googleProfile);
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const createdUser = await userRepo.createUser({
    username,
    email: googleProfile.email,
    passwordHash,
    mfaSecret: generateBase32Secret(),
    role: "user",
    authProvider: "google",
    googleSub: googleProfile.sub,
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

async function upsertMicrosoftUser(microsoftProfile) {
  if (!microsoftProfile.sub || !microsoftProfile.email) {
    throw badRequest("Microsoft account did not return a usable email address.");
  }

  const existingByMicrosoftSub = await userRepo.findByMicrosoftSub(microsoftProfile.sub);
  if (existingByMicrosoftSub) {
    return existingByMicrosoftSub;
  }

  const existingByEmail = await userRepo.findByEmail(microsoftProfile.email);
  if (existingByEmail) {
    return userRepo.updateMicrosoftLink(existingByEmail.userId, {
      microsoftSub: microsoftProfile.sub,
      avatarUrl: microsoftProfile.picture || null,
      authProvider: "microsoft",
    });
  }

  const username = await generateUniqueUsername(microsoftProfile);
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
  const createdUser = await userRepo.createUser({
    username,
    email: microsoftProfile.email,
    passwordHash,
    mfaSecret: generateBase32Secret(),
    role: "user",
    authProvider: "microsoft",
    microsoftSub: microsoftProfile.sub,
    avatarUrl: microsoftProfile.picture || null,
    mfaEnrolled: false,
  });

  await profileService.ensureProfileForUser({
    userId: createdUser.userId,
    username: createdUser.username,
    email: createdUser.email,
  });

  return createdUser;
}

async function generateUniqueUsername(profile) {
  const preferred = String(
    profile.preferredUsername
      || profile.givenName
      || profile.name
      || normalizeEmail(profile.email).split("@")[0],
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

async function finalizeOAuthSignIn({ user, redirectBase, auditActionType }) {
  const session = await createUserSession(user);
  const needsSchoolVerification = await getNeedsSchoolVerification(user.userId);

  await auditService.logAuditEvent({
    actorUserId: user.userId,
    actorRole: user.userRole,
    actionType: auditActionType,
    entityType: "user",
    entityId: user.userId,
    details: { email: user.email },
  });

  return {
    redirectBase,
    token: session.token,
    redirectPath: resolveRedirectPath(user.userRole, needsSchoolVerification),
  };
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

function buildOAuthStartUrl({ provider, redirectBase, clientId, authorizationUrl, callbackUrl, scopes }) {
  const frontendBase = resolveFrontendBase(redirectBase);
  const state = createSignedToken(
    {
      type: `${provider}_oauth_state`,
      redirectBase: frontendBase,
    },
    { expiresInSeconds: 10 * 60 },
  );

  const url = new URL(authorizationUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeOAuthCode({ providerLabel, tokenUrl, clientId, clientSecret, callbackUrl, code }) {
  if (!code) {
    throw badRequest(`${providerLabel} did not return an authorization code.`);
  }

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw badRequest(`${providerLabel} token exchange failed: ${errorText}`);
  }

  return tokenResponse.json();
}

async function fetchGoogleProfile(accessToken) {
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    const errorText = await userInfoResponse.text();
    throw badRequest(`Google user info lookup failed: ${errorText}`);
  }

  const payload = await userInfoResponse.json();
  return {
    sub: String(payload.sub || "").trim(),
    email: normalizeEmail(payload.email),
    emailVerified: payload.email_verified === true,
    picture: payload.picture || null,
    givenName: payload.given_name || "",
    name: payload.name || "",
    preferredUsername: payload.preferred_username || "",
  };
}

async function fetchMicrosoftProfile(tokenPayload) {
  const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  let graphPayload = {};
  if (graphResponse.ok) {
    graphPayload = await graphResponse.json();
  } else {
    graphPayload = {};
  }

  const idTokenClaims = decodeJwtPayload(tokenPayload.id_token);
  const email = normalizeEmail(
    graphPayload.mail
      || graphPayload.userPrincipalName
      || idTokenClaims.email
      || idTokenClaims.preferred_username,
  );
  const sub = String(
    idTokenClaims.oid
      || idTokenClaims.sub
      || graphPayload.id
      || "",
  ).trim();

  return {
    sub,
    email,
    emailVerified: Boolean(email),
    picture: null,
    givenName: graphPayload.givenName || idTokenClaims.given_name || "",
    name: graphPayload.displayName || idTokenClaims.name || "",
    preferredUsername: graphPayload.userPrincipalName || idTokenClaims.preferred_username || "",
  };
}

function verifyOAuthState(state, provider) {
  const verifiedState = verifySignedToken(state);
  if (!verifiedState || verifiedState.type !== `${provider}_oauth_state`) {
    throw badRequest("OAuth state is invalid or expired.");
  }

  return verifiedState;
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

function ensureGoogleConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw badRequest("Google OAuth is not configured on the backend.");
  }
}

function ensureMicrosoftConfigured() {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw badRequest("Microsoft OAuth is not configured on the backend.");
  }
}

function getMicrosoftAuthorizationUrl() {
  return `https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/authorize`;
}

function getMicrosoftTokenUrl() {
  return `https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`;
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return {};
    }

    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

function generateEmailCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function hashEmailVerificationCode(userId, code) {
  return crypto.createHash("sha256").update(`${userId}:${String(code || "").trim()}`).digest("hex");
}

function matchesVerificationCode(expectedHash, candidateHash) {
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  const candidate = Buffer.from(String(candidateHash || ""), "hex");

  if (!expected.length || expected.length !== candidate.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, candidate);
}

function maskEmail(email) {
  const normalized = normalizeEmail(email);
  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain) {
    return "your email";
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(2, localPart.length - 2))}@${domain}`;
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
  buildMicrosoftStartUrl,
  handleGoogleCallback,
  handleMicrosoftCallback,
};
