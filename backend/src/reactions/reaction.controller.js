const reactionService = require("./reaction.service");

async function getPostSummary(req, res) {
  try {
    const summary = await reactionService.getPostSummary(
      req.params.postId,
      req.query.viewerUserId,
    );
    res.status(200).json(summary);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load reaction summary." });
  }
}

async function setPostReaction(req, res) {
  try {
    const summary = await reactionService.setPostReaction(req.params.postId, req.body);
    res.status(200).json(summary);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to update reaction." });
  }
}

async function removePostReaction(req, res) {
  try {
    const summary = await reactionService.removePostReaction(
      req.params.postId,
      req.query.userId,
    );
    res.status(200).json(summary);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to remove reaction." });
  }
}

async function getPostComments(req, res) {
  try {
    const payload = await reactionService.listPostComments(req.params.postId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.status(200).json(payload);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to load post comments." });
  }
}

async function createPostComment(req, res) {
  try {
    const payload = await reactionService.createPostComment(req.params.postId, req.body);
    res.status(201).json(payload);
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Failed to create post comment." });
  }
}

module.exports = {
  getPostSummary,
  setPostReaction,
  removePostReaction,
  getPostComments,
  createPostComment,
};
