const express = require("express");
const router = express.Router();
const streamController = require("./stream.controller");

router.get("/", streamController.getStreams);
router.post("/send-gift", streamController.sendGift);
router.get("/:streamId/comments", streamController.getComments);
router.post("/:streamId/comments", streamController.createComment);
router.get("/:streamId", streamController.getStreamById);

module.exports = router;
