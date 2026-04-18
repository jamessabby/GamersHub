const feedService = require("./feed.service");
const fs = require("fs");

async function getFeed(req, res) {
  try {
    const data = await feedService.listFeed({
      userId: req.query.userId || null,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load feed." });
  }
}

async function createPost(req, res) {
  try {
    const { userId, content } = req.body;
    const mediaUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;
    const mediaType = req.file
      ? (req.file.mimetype.startsWith("video/") ? "video" : "image")
      : req.body.mediaType || null;

    const post = await feedService.createPost({
      userId,
      content,
      mediaUrl,
      mediaType,
    });
    res.status(201).json(post);
  } catch (error) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to create post." });
  }
}

module.exports = {
  getFeed,
  createPost,
};
