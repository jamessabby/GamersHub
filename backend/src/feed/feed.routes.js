const express = require("express");
const feedController = require("./feed.controller");
const upload = require("./feed.upload");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, feedController.getFeed);
router.get("/users/:userId/posts", requireAuth, feedController.getUserPosts);
router.post("/", requireAuth, upload.single("media"), feedController.createPost);
router.delete("/:postId", requireAuth, feedController.deletePost);

module.exports = router;
