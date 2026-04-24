const express = require("express");
const router = express.Router();
const streamController = require("./stream.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

router.get("/", streamController.getStreams);
router.post("/send-gift", requireAuth, streamController.sendGift);
router.post("/:streamId/view", streamController.trackView);
router.get("/:streamId/likes", optionalAuth, streamController.getLikeStatus);
router.post("/:streamId/likes", requireAuth, streamController.toggleLike);
router.delete("/:streamId/likes", requireAuth, streamController.removeLike);
router.get("/:streamId/comments", streamController.getComments);
router.post("/:streamId/comments", requireAuth, streamController.createComment);
router.get("/:streamId", streamController.getStreamById);

module.exports = router;
