const express = require("express");
const router = express.Router();
const userController = require("./user.controller");

router.get("/search", userController.searchPlayers);
router.get("/profile/:userId", userController.getProfile);
router.put("/profile/:userId", userController.updateProfile);
router.get("/:userId/friends", userController.getFriends);
router.post("/:userId/friends/requests", userController.createFriendRequest);
router.delete("/:userId/friends/:friendUserId", userController.removeFriend);
router.put(
  "/:userId/friends/requests/:requesterUserId",
  userController.respondToFriendRequest,
);
router.get("/:userId/notifications", userController.getNotifications);
router.put(
  "/:userId/notifications/read-all",
  userController.markAllNotificationsRead,
);
router.put(
  "/:userId/notifications/:notificationId/read",
  userController.markNotificationRead,
);

module.exports = router;
