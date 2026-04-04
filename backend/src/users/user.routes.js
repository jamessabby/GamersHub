const express = require("express");
const router = express.Router();
const userController = require("./user.controller");

router.get("/profile/:userId", userController.getProfile);
router.put("/profile/:userId", userController.updateProfile);

module.exports = router;
