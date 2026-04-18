const feedRepo = require("./feed.repository");
const authUserRepo = require("../users/user.repository");
const profileRepo = require("../users/profile.repository");

async function listFeed({ limit } = {}) {
  const posts = await feedRepo.listPosts({ limit });
  const authors = await loadAuthors(posts.map((post) => post.userId));

  return {
    items: posts.map((post) => mapFeedItem(post, authors)),
    total: posts.length,
  };
}

async function createPost(payload) {
  const userId = Number(payload.userId);
  const content = normalizeText(payload.content);
  const mediaUrl = normalizeMediaUrl(payload.mediaUrl);
  const mediaType = normalizeMediaType(payload.mediaType, mediaUrl);

  if (!Number.isInteger(userId) || userId < 1) {
    const error = new Error("A valid userId is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!content && !mediaUrl) {
    const error = new Error("A post must include text content or a media URL.");
    error.statusCode = 400;
    throw error;
  }

  const author = await authUserRepo.findById(userId);
  if (!author) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  let post;
  try {
    post = await feedRepo.createPost({
      userId,
      content,
      mediaUrl,
      mediaType,
    });
  } catch (error) {
    if (isOptionalPostColumnError(error)) {
      const friendlyError = new Error(
        "The feed post table still needs its optional content/media columns updated in SQL Server.",
      );
      friendlyError.statusCode = 500;
      throw friendlyError;
    }
    throw error;
  }

  const authors = await loadAuthors([userId]);
  return mapFeedItem(post, authors);
}

async function loadAuthors(userIds) {
  const uniqueUserIds = [...new Set(userIds.filter((userId) => Number.isInteger(userId)))];
  const authorEntries = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const [authUser, profile] = await Promise.all([
        authUserRepo.findById(userId),
        profileRepo.findByUserId(userId).catch(() => null),
      ]);

      const displayName = profile?.displayName || authUser?.username || `User ${userId}`;
      return [
        userId,
        {
          userId,
          username: authUser?.username || `user-${userId}`,
          displayName,
          school: profile?.school || "",
          schoolTag: buildSchoolTag(profile?.school),
        },
      ];
    }),
  );

  return new Map(authorEntries);
}

function mapFeedItem(post, authors) {
  const author =
    authors.get(post.userId) || {
      userId: post.userId,
      username: `user-${post.userId}`,
      displayName: `User ${post.userId}`,
      school: "",
      schoolTag: "",
    };

  return {
    postId: post.postId,
    userId: post.userId,
    content: post.content || "",
    mediaUrl: post.mediaUrl || "",
    mediaType: post.mediaType || "",
    likeCount: Number(post.likeCount) || 0,
    createdAt: post.createdAt || null,
    createdLabel: formatRelativeTime(post.createdAt),
    author,
  };
}

function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeMediaType(mediaType, mediaUrl) {
  const explicitType = normalizeText(mediaType);
  if (explicitType) {
    return explicitType.toLowerCase();
  }

  if (!mediaUrl) {
    return null;
  }

  if (String(mediaUrl).startsWith("/uploads/posts/")) {
    return /\.(mp4|webm|ogg|mov)$/i.test(mediaUrl) ? "video" : "image";
  }

  if (String(mediaUrl).startsWith("data:image/")) {
    return "image";
  }

  if (String(mediaUrl).startsWith("data:video/")) {
    return "video";
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(mediaUrl) ? "image" : "link";
}

function normalizeMediaUrl(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (/^\/uploads\/posts\/[a-z0-9._-]+$/i.test(normalized)) {
    return normalized;
  }

  if (/^data:(image|video)\/[a-z0-9.+-]+;base64,/i.test(normalized)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    return /^https?:$/i.test(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function isOptionalPostColumnError(error) {
  const message = String(error?.message || "").toUpperCase();
  return (
    message.includes("CANNOT INSERT THE VALUE NULL INTO COLUMN") &&
    (
      message.includes("CONTENT") ||
      message.includes("MEDIA_URL") ||
      message.includes("MEDIA_TYPE")
    )
  );
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
    return "Recently posted";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Recently posted";
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
  listFeed,
  createPost,
};
