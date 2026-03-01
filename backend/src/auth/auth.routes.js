const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

router.post("/register", authController.register);

router.post("/login", authController.login);

router.get("/test", (req, res) => {
  res.json({ message: "auth route works" });
});

module.exports = router;
