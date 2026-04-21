const authService = require("./auth.service");
const auditService = require("../audit/audit.service");

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Registration failed" });
  }
}

async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 401).json({ message: error.message || "Login failed" });
  }
}

async function setupMfa(req, res) {
  try {
    const result = await authService.setupMfa(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message || "Failed to send verification code." });
  }
}

async function verifyMfa(req, res) {
  try {
    const result = await authService.verifyMfa(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 401).json({ message: error.message || "Failed to verify MFA." });
  }
}

async function me(req, res) {
  try {
    const result = await authService.getCurrentUser(req.auth);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 401).json({ message: error.message || "Authentication required." });
  }
}

async function logout(req, res) {
  try {
    const result = await authService.logoutUser(req.auth);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Logout failed." });
  }
}

async function googleStart(req, res) {
  try {
    const url = authService.buildGoogleStartUrl({
      redirectBase: req.query.redirectBase,
    });
    res.redirect(url);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to start Google OAuth." });
  }
}

async function microsoftStart(req, res) {
  try {
    const url = authService.buildMicrosoftStartUrl({
      redirectBase: req.query.redirectBase,
    });
    res.redirect(url);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to start Microsoft OAuth." });
  }
}

async function googleCallback(req, res) {
  try {
    const result = await authService.handleGoogleCallback({
      code: req.query.code,
      state: req.query.state,
    });

    const redirectUrl = new URL(`${result.redirectBase}/auth/login.html`);
    redirectUrl.hash = new URLSearchParams({
      oauth: "success",
      token: result.token,
      redirectPath: result.redirectPath,
    }).toString();

    res.redirect(redirectUrl.toString());
  } catch (error) {
    await auditService.logAuditEvent({
      actorUserId: null,
      actorRole: null,
      actionType: "auth.google_login_failed",
      entityType: "user",
      entityId: null,
      details: { reason: error.message || "Google OAuth failed." },
    });
    const fallbackBase = process.env.APP_BASE_URL || "http://127.0.0.1:5500/frontend";
    const redirectUrl = new URL(`${String(fallbackBase).replace(/\/+$/, "")}/auth/login.html`);
    redirectUrl.hash = new URLSearchParams({
      oauth: "error",
      message: error.message || "Google OAuth failed.",
    }).toString();
    res.redirect(redirectUrl.toString());
  }
}

async function microsoftCallback(req, res) {
  try {
    const result = await authService.handleMicrosoftCallback({
      code: req.query.code,
      state: req.query.state,
    });

    const redirectUrl = new URL(`${result.redirectBase}/auth/login.html`);
    redirectUrl.hash = new URLSearchParams({
      oauth: "success",
      token: result.token,
      redirectPath: result.redirectPath,
    }).toString();

    res.redirect(redirectUrl.toString());
  } catch (error) {
    await auditService.logAuditEvent({
      actorUserId: null,
      actorRole: null,
      actionType: "auth.microsoft_login_failed",
      entityType: "user",
      entityId: null,
      details: { reason: error.message || "Microsoft OAuth failed." },
    });
    const fallbackBase = process.env.APP_BASE_URL || "http://127.0.0.1:5500/frontend";
    const redirectUrl = new URL(`${String(fallbackBase).replace(/\/+$/, "")}/auth/login.html`);
    redirectUrl.hash = new URLSearchParams({
      oauth: "error",
      message: error.message || "Microsoft OAuth failed.",
    }).toString();
    res.redirect(redirectUrl.toString());
  }
}

module.exports = {
  register,
  login,
  setupMfa,
  verifyMfa,
  me,
  logout,
  googleStart,
  googleCallback,
  microsoftStart,
  microsoftCallback,
};
