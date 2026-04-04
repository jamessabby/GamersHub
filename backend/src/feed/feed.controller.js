const feedService = require("./feed.service");

async function getFeed(req, res) {
  try {
    const data = await feedService.listFeed({ userId: req.query.userId || null });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load feed." });
  }
}

module.exports = {
  getFeed,
};
