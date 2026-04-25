const express = require("express");
const adminRepo = require("../admin/admin.repository");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const items = await adminRepo.listPublishedEvents();
    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ message: "Failed to load events." });
  }
});

module.exports = router;
