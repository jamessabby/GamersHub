const express = require("express");
const reactionController = require("./reaction.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/posts/:postId/summary", reactionController.getPostSummary);
router.put("/posts/:postId", requireAuth, reactionController.setPostReaction);
router.delete("/posts/:postId", requireAuth, reactionController.removePostReaction);
router.get("/posts/:postId/comments", reactionController.getPostComments);
router.post("/posts/:postId/comments", requireAuth, reactionController.createPostComment);

module.exports = router;
