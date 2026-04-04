const express = require("express");
const feedController = require("./feed.controller");

const router = express.Router();

router.get("/", feedController.getFeed);

module.exports = router;
