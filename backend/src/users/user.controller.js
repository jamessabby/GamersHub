const userService = require("./user.service");

async function getProfile(req, res) {
  try {
    const profile = await userService.getProfileByUserId(req.params.userId, {
      viewerUserId: req.auth.user.userId,
    });
    res.status(200).json(profile);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load profile." });
  }
}

async function updateProfile(req, res) {
  try {
    const profile = await userService.updateProfileByUserId(
      req.params.userId,
      req.body,
    );
    res.status(200).json(profile);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to update profile." });
  }
}

async function searchPlayers(req, res) {
  try {
    const data = await userService.searchPlayers({
      viewerUserId: req.auth.user.userId,
      query: req.query.q,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to search players." });
  }
}

async function getFriends(req, res) {
  try {
    const data = await userService.getFriendsByUserId(req.params.userId);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load friends." });
  }
}

async function createFriendRequest(req, res) {
  try {
    const data = await userService.createFriendRequest(req.params.userId, req.body);
    res.status(201).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to create friend request." });
  }
}

async function respondToFriendRequest(req, res) {
  try {
    const data = await userService.respondToFriendRequest(
      req.params.userId,
      req.params.requesterUserId,
      req.body,
    );
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to respond to friend request." });
  }
}

async function removeFriend(req, res) {
  try {
    const data = await userService.removeFriendByUserId(
      req.params.userId,
      req.params.friendUserId,
    );
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to remove friend." });
  }
}

async function getNotifications(req, res) {
  try {
    const data = await userService.getNotificationsByUserId(req.params.userId);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load notifications." });
  }
}

async function markNotificationRead(req, res) {
  try {
    const data = await userService.markNotificationReadByUserId(
      req.params.userId,
      req.params.notificationId,
    );
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to mark notification as read." });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    const data = await userService.markAllNotificationsReadByUserId(req.params.userId);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to mark notifications as read." });
  }
}

async function setActivity(req, res) {
  try {
    const data = await userService.setActivityStatus({
      userId: req.params.userId,
      actorUserId: req.auth.user.userId,
      activityStatus: req.body.activityStatus,
    });
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to update activity status." });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  searchPlayers,
  getFriends,
  createFriendRequest,
  respondToFriendRequest,
  removeFriend,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setActivity,
};
