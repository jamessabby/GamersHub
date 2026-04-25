const express = require("express");
const authController = require("./auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/mfa/setup", authController.setupMfa);
router.post("/mfa/verify", authController.verifyMfa);
router.get("/google/start", authController.googleStart);
router.get("/google/callback", authController.googleCallback);
router.get("/microsoft/start", authController.microsoftStart);
router.get("/microsoft/callback", authController.microsoftCallback);
router.post("/forgot-password/request", authController.requestPasswordReset);
router.post("/forgot-password/reset", authController.resetPassword);
router.get("/me", requireAuth, authController.me);
router.post("/logout", requireAuth, authController.logout);
router.get("/test", (_req, res) => {
  res.json({ message: "auth route works" });
});

module.exports = router;
