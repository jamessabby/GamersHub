const streamRepository = require("./stream.repository");
const authUserRepo = require("../users/user.repository");
const profileRepo = require("../users/profile.repository");

async function listStreams({ limit, liveOnly } = {}) {
  const streams = await streamRepository.listStreams({ limit, liveOnly });
  const authors = await loadAuthors(streams.map((stream) => stream.userId));

  return {
    items: streams.map((stream) => mapStream(stream, authors)),
    total: streams.length,
  };
}

async function getStreamById(streamId) {
  const parsedStreamId = parsePositiveInt(streamId, "A valid streamId is required.");
  const stream = await streamRepository.findStreamById(parsedStreamId);

  if (!stream) {
    const error = new Error("Stream not found.");
    error.statusCode = 404;
    throw error;
  }

  const authors = await loadAuthors([stream.userId]);
  return mapStream(stream, authors);
}

async function listComments(streamId, { limit } = {}) {
  const parsedStreamId = parsePositiveInt(streamId, "A valid streamId is required.");
  await getStreamById(parsedStreamId);

  const comments = await streamRepository.listComments({
    streamId: parsedStreamId,
    limit,
  });
  const authors = await loadAuthors(comments.map((comment) => comment.userId));

  return {
    items: comments.map((comment) => mapComment(comment, authors)),
    total: comments.length,
  };
}

async function createComment(streamId, payload) {
  const parsedStreamId = parsePositiveInt(streamId, "A valid streamId is required.");
  const userId = parsePositiveInt(payload.userId, "A valid userId is required.");
  const message = normalizeText(payload.message);

  if (!message) {
    const error = new Error("Comment message is required.");
    error.statusCode = 400;
    throw error;
  }

  await getStreamById(parsedStreamId);

  const author = await authUserRepo.findById(userId);
  if (!author) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const comment = await streamRepository.createComment({
    streamId: parsedStreamId,
    userId,
    message,
  });
  const authors = await loadAuthors([userId]);
  return mapComment(comment, authors);
}

async function sendGift(giftData) {
  return streamRepository.insertGift(giftData);
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
          username: authUser?.username || `user-${userId}`,
          displayName: profile?.displayName || authUser?.username || `User ${userId}`,
          schoolTag: buildSchoolTag(profile?.school),
        },
      ];
    }),
  );

  return new Map(authorEntries);
}

function mapStream(stream, authors) {
  const author =
    authors.get(stream.userId) || {
      userId: stream.userId,
      username: `user-${stream.userId}`,
      displayName: `User ${stream.userId}`,
      schoolTag: "",
    };

  return {
    streamId: stream.streamId,
    userId: stream.userId,
    title: stream.title || "Untitled stream",
    viewerCount: Number(stream.viewerCount) || 0,
    isLive: Boolean(stream.isLive),
    playbackUrl: stream.playbackUrl || "",
    thumbnailUrl: stream.thumbnailUrl || "",
    gameName: stream.gameName || "",
    description: stream.description || "",
    startedAt: stream.startedAt || null,
    endedAt: stream.endedAt || null,
    startedLabel: formatRelativeTime(stream.startedAt, "Not started yet"),
    author,
  };
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
    streamId: comment.streamId,
    userId: comment.userId,
    message: comment.message || "",
    createdAt: comment.createdAt || null,
    createdLabel: formatRelativeTime(comment.createdAt, "Just now"),
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

function formatRelativeTime(value, fallback) {
  if (!value) {
    return fallback;
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return fallback;
  }

  const diffMs = Date.now() - timestamp.getTime();
  if (diffMs < 60 * 1000) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} d ago`;
  }

  return timestamp.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

module.exports = {
  listStreams,
  getStreamById,
  listComments,
  createComment,
  sendGift,
};
