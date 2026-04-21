const reactionRepo = require("./reaction.repository");
const feedRepo = require("../feed/feed.repository");
const authUserRepo = require("../users/user.repository");
const profileRepo = require("../users/profile.repository");
const auditService = require("../audit/audit.service");

const ALLOWED_REACTIONS = new Set(["like", "love", "wow"]);

async function getPostSummary(postId, viewerUserId) {
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");
  const parsedViewerUserId = viewerUserId == null || viewerUserId === ""
    ? null
    : parsePositiveInt(viewerUserId, "A valid viewerUserId is required.");

  await assertPostExists(parsedPostId);

  if (parsedViewerUserId != null) {
    await assertUserExists(parsedViewerUserId);
  }

  return buildPostSummary(parsedPostId, parsedViewerUserId);
}

async function setPostReaction(postId, payload) {
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");
  const parsedUserId = parsePositiveInt(payload.userId, "A valid userId is required.");
  const reactionType = normalizeReactionType(payload.reactionType);

  if (!reactionType || !ALLOWED_REACTIONS.has(reactionType)) {
    const error = new Error("Reaction type must be like, love, or wow.");
    error.statusCode = 400;
    throw error;
  }

  await Promise.all([
    assertPostExists(parsedPostId),
    assertUserExists(parsedUserId),
  ]);

  await reactionRepo.upsertReaction({
    postId: parsedPostId,
    userId: parsedUserId,
    reactionType,
  });

  await auditService.logAuditEvent({
    actorUserId: parsedUserId,
    actorRole: "user",
    actionType: "reaction.post_reacted",
    entityType: "post",
    entityId: parsedPostId,
    details: { reactionType },
  });

  return buildPostSummary(parsedPostId, parsedUserId);
}

async function removePostReaction(postId, userId) {
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");
  const parsedUserId = parsePositiveInt(userId, "A valid userId is required.");

  await Promise.all([
    assertPostExists(parsedPostId),
    assertUserExists(parsedUserId),
  ]);

  await reactionRepo.deleteReactionByPostAndUser(parsedPostId, parsedUserId);

  await auditService.logAuditEvent({
    actorUserId: parsedUserId,
    actorRole: "user",
    actionType: "reaction.post_unreacted",
    entityType: "post",
    entityId: parsedPostId,
    details: {},
  });

  return buildPostSummary(parsedPostId, parsedUserId);
}

async function listPostComments(postId, { limit } = {}) {
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");
  await assertPostExists(parsedPostId);

  const comments = await reactionRepo.listCommentsByPostId(
    parsedPostId,
    Number.isInteger(limit) ? limit : Number(limit) || 20,
  );
  const authors = await loadAuthors(comments.map((comment) => comment.userId));

  return {
    items: comments.map((comment) => mapComment(comment, authors)),
    total: comments.length,
  };
}

async function createPostComment(postId, payload) {
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");
  const parsedUserId = parsePositiveInt(payload.userId, "A valid userId is required.");
  const message = normalizeText(payload.message);

  if (!message) {
    const error = new Error("Comment message is required.");
    error.statusCode = 400;
    throw error;
  }

  await Promise.all([
    assertPostExists(parsedPostId),
    assertUserExists(parsedUserId),
  ]);

  const comment = await reactionRepo.createComment({
    postId: parsedPostId,
    userId: parsedUserId,
    message,
  });

  await auditService.logAuditEvent({
    actorUserId: parsedUserId,
    actorRole: "user",
    actionType: "reaction.comment_created",
    entityType: "comment",
    entityId: comment.commentId,
    details: { postId: parsedPostId },
  });

  const authors = await loadAuthors([parsedUserId]);
  const summary = await buildPostSummary(parsedPostId, parsedUserId);

  return {
    comment: mapComment(comment, authors),
    summary,
  };
}

async function deletePostComment(commentId, postId, requestingUserId, requestingUserRole) {
  const parsedCommentId = parsePositiveInt(commentId, "A valid commentId is required.");
  const parsedPostId = parsePositiveInt(postId, "A valid postId is required.");

  const comment = await reactionRepo.findCommentById(parsedCommentId);
  if (!comment || comment.postId !== parsedPostId) {
    const error = new Error("Comment not found.");
    error.statusCode = 404;
    throw error;
  }

  const role = String(requestingUserRole || "").toLowerCase();
  const isOwner = comment.userId === Number(requestingUserId);
  if (!isOwner && role !== "admin" && role !== "superadmin") {
    const error = new Error("You do not have permission to delete this comment.");
    error.statusCode = 403;
    throw error;
  }

  await reactionRepo.deleteCommentById(parsedCommentId);

  await auditService.logAuditEvent({
    actorUserId: Number(requestingUserId),
    actorRole: role || "user",
    actionType: "reaction.comment_deleted",
    entityType: "comment",
    entityId: parsedCommentId,
    details: { postId: parsedPostId, ownerId: comment.userId, deletedByOwner: isOwner },
  });

  const summary = await buildPostSummary(parsedPostId, Number(requestingUserId));
  return { message: "Comment deleted.", summary };
}

async function buildPostSummary(postId, viewerUserId) {
  const [countsRows, commentCount, viewerReaction] = await Promise.all([
    reactionRepo.getReactionCountsByPostId(postId),
    reactionRepo.countCommentsByPostId(postId),
    viewerUserId != null
      ? reactionRepo.findReactionByPostAndUser(postId, viewerUserId)
      : Promise.resolve(null),
  ]);

  const counts = {
    like: 0,
    love: 0,
    wow: 0,
  };

  for (const row of countsRows) {
    const key = normalizeReactionType(row.reactionType);
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] = Number(row.total) || 0;
    }
  }

  return {
    postId,
    totalReactions: counts.like + counts.love + counts.wow,
    commentCount,
    viewerReaction: viewerReaction?.reactionType || null,
    counts,
  };
}

async function assertPostExists(postId) {
  const post = await feedRepo.findPostById(postId);
  if (!post) {
    const error = new Error("Post not found.");
    error.statusCode = 404;
    throw error;
  }

  return post;
}

async function assertUserExists(userId) {
  const user = await authUserRepo.findById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

async function loadAuthors(userIds) {
  const uniqueUserIds = [...new Set(userIds.filter((userId) => Number.isInteger(userId)))];
  const authorEntries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const [authUser, profile] = await Promise.all([
        authUserRepo.findById(userId),
        profileRepo.findByUserId(userId).catch(() => null),
      ]);

      return [
        userId,
        {
          userId,
          username: authUser?.username || "deleted_user",
          displayName: profile?.displayName || authUser?.username || "Deleted User",
          schoolTag: buildSchoolTag(profile?.school),
        },
      ];
    }),
  );

  return new Map(authorEntries);
}

function mapComment(comment, authors) {
  const author =
    authors.get(comment.userId) || {
      userId: comment.userId,
      username: `user-${comment.userId}`,
      displayName: `User ${comment.userId}`,
      schoolTag: "",
    };

  return {
    commentId: comment.commentId,
    postId: comment.postId,
    userId: comment.userId,
    message: comment.message || "",
    createdAt: comment.createdAt || null,
    createdLabel: formatRelativeTime(comment.createdAt),
    author,
  };
}

function parsePositiveInt(value, message) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeReactionType(value) {
  return normalizeText(value)?.toLowerCase() || null;
}

function buildSchoolTag(school) {
  if (!school) {
    return "";
  }

  return String(school)
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function formatRelativeTime(value) {
  if (!value) {
    return "Just now";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Just now";
  }

  const diffMs = Date.now() - createdAt.getTime();
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} d`;
  }

  return createdAt.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

module.exports = {
  getPostSummary,
  setPostReaction,
  removePostReaction,
  listPostComments,
  createPostComment,
  deletePostComment,
};
