const sessionRepo = require("../auth/session.repository");
const userRepo = require("../users/user.repository");
const { hashToken } = require("../auth/token.util");

async function optionalAuth(req, _res, next) {
  try {
    req.auth = await loadAuthContext(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    req.auth = await loadAuthContext(req);
    if (!req.auth?.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());
  return (req, res, next) => {
    if (!req.auth?.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const currentRole = String(req.auth.user.userRole || "").toLowerCase();
    if (!normalizedRoles.includes(currentRole)) {
      res.status(403).json({ message: "You do not have permission to perform this action." });
      return;
    }

    next();
  };
}

function ensureScopedUserAccess(paramName = "userId", { allowRoles = ["admin", "superadmin"] } = {}) {
  return (req, res, next) => {
    if (!req.auth?.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    const targetUserId = Number(req.params[paramName]);
    if (!Number.isInteger(targetUserId) || targetUserId < 1) {
      res.status(400).json({ message: `A valid ${paramName} is required.` });
      return;
    }

    const currentRole = String(req.auth.user.userRole || "").toLowerCase();
    if (targetUserId === req.auth.user.userId || allowRoles.includes(currentRole)) {
      next();
      return;
    }

    res.status(403).json({ message: "You do not have permission to access this resource." });
  };
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

async function loadAuthContext(req) {
  const token = readBearerToken(req);
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await sessionRepo.findActiveSessionByTokenHash(tokenHash);
  if (!session) {
    return null;
  }

  const user = await userRepo.findById(session.userId);
  if (!user || !user.isActive) {
    return null;
  }

  await sessionRepo.touchSession(session.sessionId);
  return {
    token,
    tokenHash,
    session,
    user,
  };
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireRole,
  ensureScopedUserAccess,
};
