const express = require("express");
const feedController = require("./feed.controller");
const upload = require("./feed.upload");

const router = express.Router();

router.get("/", feedController.getFeed);
router.post("/", upload.single("media"), feedController.createPost);

module.exports = router;
