const { sql, pool, poolConnect } = require("../config/db.feed");

async function listPosts({ limit = 20 } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const result = await pool.request().input("limit", sql.Int, safeLimit).query(`
    SELECT TOP (@limit)
      POST_ID AS postId,
      USER_ID AS userId,
      CONTENT AS content,
      MEDIA_URL AS mediaUrl,
      MEDIA_TYPE AS mediaType,
      LIKE_COUNT AS likeCount,
      CREATED_AT AS createdAt
    FROM dbo.POST
    ORDER BY CREATED_AT DESC, POST_ID DESC
  `);

  return result.recordset;
}

async function createPost({ userId, content, mediaUrl, mediaType }) {
  await poolConnect;

  const safeContent = content ?? "";
  const safeMediaUrl = mediaUrl ?? "";
  const safeMediaType = mediaType ?? "";

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("content", sql.NVarChar(sql.MAX), safeContent)
    .input("mediaUrl", sql.NVarChar(500), safeMediaUrl)
    .input("mediaType", sql.NVarChar(50), safeMediaType)
    .input("likeCount", sql.Int, 0).query(`
      INSERT INTO dbo.POST (
        USER_ID,
        CONTENT,
        MEDIA_URL,
        MEDIA_TYPE,
        LIKE_COUNT
      )
      OUTPUT
        INSERTED.POST_ID AS postId,
        INSERTED.USER_ID AS userId,
        INSERTED.CONTENT AS content,
        INSERTED.MEDIA_URL AS mediaUrl,
        INSERTED.MEDIA_TYPE AS mediaType,
        INSERTED.LIKE_COUNT AS likeCount,
        INSERTED.CREATED_AT AS createdAt
      VALUES (
        @userId,
        @content,
        @mediaUrl,
        @mediaType,
        @likeCount
      )
    `);

  return result.recordset[0];
}

async function findPostById(postId) {
  await poolConnect;

  const result = await pool.request().input("postId", sql.Int, postId).query(`
    SELECT
      POST_ID AS postId,
      USER_ID AS userId,
      CONTENT AS content,
      MEDIA_URL AS mediaUrl,
      MEDIA_TYPE AS mediaType,
      LIKE_COUNT AS likeCount,
      CREATED_AT AS createdAt
    FROM dbo.POST
    WHERE POST_ID = @postId
  `);

  return result.recordset[0] || null;
}

async function deletePostById(postId) {
  await poolConnect;

  const result = await pool.request().input("postId", sql.Int, postId).query(`
    DELETE FROM dbo.POST
    OUTPUT DELETED.POST_ID AS postId, DELETED.USER_ID AS userId
    WHERE POST_ID = @postId
  `);

  return result.recordset[0] || null;
}

async function listFeedForUser({ viewerUserId, limit = 20 } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;

  const result = await pool
    .request()
    .input("viewerUserId", sql.Int, viewerUserId)
    .input("limit", sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit)
        p.POST_ID  AS postId,
        p.USER_ID  AS userId,
        p.CONTENT  AS content,
        p.MEDIA_URL  AS mediaUrl,
        p.MEDIA_TYPE AS mediaType,
        p.LIKE_COUNT AS likeCount,
        p.CREATED_AT AS createdAt
      FROM dbo.POST p
      WHERE p.USER_ID = @viewerUserId
         OR p.USER_ID IN (
           SELECT
             CASE
               WHEN f.USERA_ID = @viewerUserId THEN f.USERB_ID
               ELSE f.USERA_ID
             END
           FROM GAMERSHUB_USER.dbo.FRIENDS f
           WHERE (f.USERA_ID = @viewerUserId OR f.USERB_ID = @viewerUserId)
             AND f.STATUS = 'accepted'
         )
      ORDER BY p.CREATED_AT DESC, p.POST_ID DESC
    `);

  return result.recordset;
}

async function listPostsByUserId({ userId, limit = 20 } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("limit", sql.Int, safeLimit)
    .query(`
      SELECT TOP (@limit)
        POST_ID AS postId,
        USER_ID AS userId,
        CONTENT AS content,
        MEDIA_URL AS mediaUrl,
        MEDIA_TYPE AS mediaType,
        LIKE_COUNT AS likeCount,
        CREATED_AT AS createdAt
      FROM dbo.POST
      WHERE USER_ID = @userId
      ORDER BY CREATED_AT DESC, POST_ID DESC
    `);

  return result.recordset;
}

module.exports = {
  listPosts,
  listFeedForUser,
  listPostsByUserId,
  createPost,
  findPostById,
  deletePostById,
};
