const express = require("express");
const feedController = require("./feed.controller");
const upload = require("./feed.upload");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", feedController.getFeed);
router.post("/", requireAuth, upload.single("media"), feedController.createPost);
router.delete("/:postId", requireAuth, feedController.deletePost);

module.exports = router;
