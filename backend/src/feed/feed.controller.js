const feedService = require("./feed.service");
const fs = require("fs");

async function getFeed(req, res) {
  try {
    const data = await feedService.listFeed({
      viewerUserId: req.auth.user.userId,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(data);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load feed." });
  }
}

async function createPost(req, res) {
  try {
    const { content } = req.body;
    const mediaUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;
    const mediaType = req.file
      ? (req.file.mimetype.startsWith("video/") ? "video" : "image")
      : req.body.mediaType || null;

    const post = await feedService.createPost({
      userId: req.auth.user.userId,
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

async function deletePost(req, res) {
  try {
    const result = await feedService.deletePost(
      req.params.postId,
      req.auth.user.userId,
      req.auth.user.userRole,
    );
    res.status(200).json(result);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to delete post." });
  }
}

module.exports = {
  getFeed,
  createPost,
  deletePost,
};
