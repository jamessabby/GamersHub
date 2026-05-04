const { sql, pool, poolConnect } = require("../config/db.reaction");

async function getReactionCountsByPostId(postId) {
  await poolConnect;

  const result = await pool.request().input("postId", sql.Int, postId).query(`
    SELECT
      REACTION_TYPE AS reactionType,
      COUNT(*) AS total
    FROM dbo.POST_REACTION
    WHERE POST_ID = @postId
    GROUP BY REACTION_TYPE
  `);

  return result.recordset;
}

async function findReactionByPostAndUser(postId, userId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId).query(`
      SELECT
        POST_ID AS postId,
        USER_ID AS userId,
        REACTION_TYPE AS reactionType,
        CREATED_AT AS createdAt,
        UPDATED_AT AS updatedAt
      FROM dbo.POST_REACTION
      WHERE POST_ID = @postId
        AND USER_ID = @userId
    `);

  return result.recordset[0] || null;
}

async function upsertReaction({ postId, userId, reactionType }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .input("reactionType", sql.NVarChar(20), reactionType).query(`
      MERGE dbo.POST_REACTION AS target
      USING (
        SELECT
          @postId AS POST_ID,
          @userId AS USER_ID,
          @reactionType AS REACTION_TYPE
      ) AS source
      ON target.POST_ID = source.POST_ID
         AND target.USER_ID = source.USER_ID
      WHEN MATCHED THEN
        UPDATE SET
          REACTION_TYPE = source.REACTION_TYPE,
          UPDATED_AT = SYSDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (POST_ID, USER_ID, REACTION_TYPE, CREATED_AT, UPDATED_AT)
        VALUES (source.POST_ID, source.USER_ID, source.REACTION_TYPE, SYSDATETIME(), SYSDATETIME())
      OUTPUT
        INSERTED.POST_ID AS postId,
        INSERTED.USER_ID AS userId,
        INSERTED.REACTION_TYPE AS reactionType,
        INSERTED.CREATED_AT AS createdAt,
        INSERTED.UPDATED_AT AS updatedAt;
    `);

  return result.recordset[0] || null;
}

async function deleteReactionByPostAndUser(postId, userId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId).query(`
      DELETE FROM dbo.POST_REACTION
      OUTPUT
        DELETED.POST_ID AS postId,
        DELETED.USER_ID AS userId,
        DELETED.REACTION_TYPE AS reactionType
      WHERE POST_ID = @postId
        AND USER_ID = @userId
    `);

  return result.recordset[0] || null;
}

async function countCommentsByPostId(postId) {
  await poolConnect;

  const result = await pool.request().input("postId", sql.Int, postId).query(`
    SELECT COUNT(*) AS total
    FROM dbo.POST_COMMENT
    WHERE POST_ID = @postId
  `);

  return Number(result.recordset[0]?.total) || 0;
}

async function listCommentsByPostId(postId, limit = 20) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const result = await pool
    .request()
    .input("postId", sql.Int, postId)
    .input("limit", sql.Int, safeLimit).query(`
      SELECT TOP (@limit)
        COMMENT_ID AS commentId,
        POST_ID AS postId,
        USER_ID AS userId,
        MESSAGE AS message,
        GIF_URL AS gifUrl,
        CREATED_AT AS createdAt
      FROM dbo.POST_COMMENT
      WHERE POST_ID = @postId
      ORDER BY CREATED_AT ASC, COMMENT_ID ASC
    `);

  return result.recordset;
}

async function createComment({ postId, userId, message, gifUrl }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .input("message", sql.NVarChar(sql.MAX), message || "")
    .input("gifUrl", sql.NVarChar(1000), gifUrl || null).query(`
      INSERT INTO dbo.POST_COMMENT (
        POST_ID,
        USER_ID,
        MESSAGE,
        GIF_URL,
        CREATED_AT
      )
      OUTPUT
        INSERTED.COMMENT_ID AS commentId,
        INSERTED.POST_ID AS postId,
        INSERTED.USER_ID AS userId,
        INSERTED.MESSAGE AS message,
        INSERTED.GIF_URL AS gifUrl,
        INSERTED.CREATED_AT AS createdAt
      VALUES (
        @postId,
        @userId,
        @message,
        @gifUrl,
        SYSDATETIME()
      )
    `);

  return result.recordset[0] || null;
}

async function findCommentById(commentId) {
  await poolConnect;

  const result = await pool.request().input("commentId", sql.Int, commentId).query(`
    SELECT
      COMMENT_ID AS commentId,
      POST_ID AS postId,
      USER_ID AS userId,
      MESSAGE AS message,
      CREATED_AT AS createdAt
    FROM dbo.POST_COMMENT
    WHERE COMMENT_ID = @commentId
  `);

  return result.recordset[0] || null;
}

async function deleteCommentById(commentId) {
  await poolConnect;

  const result = await pool.request().input("commentId", sql.Int, commentId).query(`
    DELETE FROM dbo.POST_COMMENT
    OUTPUT DELETED.COMMENT_ID AS commentId, DELETED.POST_ID AS postId, DELETED.USER_ID AS userId
    WHERE COMMENT_ID = @commentId
  `);

  return result.recordset[0] || null;
}

module.exports = {
  getReactionCountsByPostId,
  findReactionByPostAndUser,
  upsertReaction,
  deleteReactionByPostAndUser,
  countCommentsByPostId,
  listCommentsByPostId,
  createComment,
  findCommentById,
  deleteCommentById,
};
