const express = require("express");
const router = express.Router();
const streamController = require("./stream.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/", streamController.getStreams);
router.post("/send-gift", requireAuth, streamController.sendGift);
router.get("/:streamId/comments", streamController.getComments);
router.post("/:streamId/comments", requireAuth, streamController.createComment);
router.get("/:streamId", streamController.getStreamById);

module.exports = router;
