const express = require("express");
const reactionController = require("./reaction.controller");

const router = express.Router();

router.get("/posts/:postId/summary", reactionController.getPostSummary);
router.put("/posts/:postId", reactionController.setPostReaction);
router.delete("/posts/:postId", reactionController.removePostReaction);
router.get("/posts/:postId/comments", reactionController.getPostComments);
router.post("/posts/:postId/comments", reactionController.createPostComment);

module.exports = router;
