const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const {
  requireAuth,
  ensureScopedUserAccess,
} = require("../middleware/auth.middleware");

router.get("/search", requireAuth, userController.searchPlayers);
router.get("/profile/:userId", requireAuth, userController.getProfile);
router.put("/profile/:userId", requireAuth, ensureScopedUserAccess("userId"), userController.updateProfile);
router.get("/:userId/friends", requireAuth, ensureScopedUserAccess("userId"), userController.getFriends);
router.post("/:userId/friends/requests", requireAuth, ensureScopedUserAccess("userId"), userController.createFriendRequest);
router.delete("/:userId/friends/:friendUserId", requireAuth, ensureScopedUserAccess("userId"), userController.removeFriend);
router.put(
  "/:userId/friends/requests/:requesterUserId",
  requireAuth,
  ensureScopedUserAccess("userId"),
  userController.respondToFriendRequest,
);
router.get("/:userId/notifications", requireAuth, ensureScopedUserAccess("userId"), userController.getNotifications);
router.put(
  "/:userId/notifications/read-all",
  requireAuth,
  ensureScopedUserAccess("userId"),
  userController.markAllNotificationsRead,
);
router.put(
  "/:userId/notifications/:notificationId/read",
  requireAuth,
  ensureScopedUserAccess("userId"),
  userController.markNotificationRead,
);

module.exports = router;
