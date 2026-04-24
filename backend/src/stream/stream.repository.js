const { sql, pool, poolConnect } = require("../config/db.feed");

async function listStreams({ limit = 12, liveOnly = false, includeHidden = false } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 24) : 12;
  const result = await pool
    .request()
    .input("limit", sql.Int, safeLimit)
    .input("liveOnly", sql.Bit, liveOnly ? 1 : 0)
    .input("includeHidden", sql.Bit, includeHidden ? 1 : 0).query(`
      SELECT TOP (@limit)
        STREAM_ID AS streamId,
        USER_ID AS userId,
        STREAM_TITLE AS title,
        VIEW_COUNT AS viewerCount,
        IS_LIVE AS isLive,
        CAST(IS_VISIBLE AS bit) AS isVisible,
        PLAYBACK_URL AS playbackUrl,
        THUMBNAIL_URL AS thumbnailUrl,
        GAME_NAME AS gameName,
        STREAM_DESCRIPTION AS description,
        TOURNAMENT_ID AS tournamentId,
        STARTED_AT AS startedAt,
        ENDED_AT AS endedAt
      FROM dbo.STREAM
      WHERE (@liveOnly = 0 OR IS_LIVE = 1)
        AND (@includeHidden = 1 OR IS_VISIBLE = 1)
      ORDER BY
        IS_LIVE DESC,
        STARTED_AT DESC,
        STREAM_ID DESC
    `);

  return result.recordset;
}

async function findStreamById(streamId, { includeHidden = false } = {}) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("includeHidden", sql.Bit, includeHidden ? 1 : 0).query(`
    SELECT
      STREAM_ID AS streamId,
      USER_ID AS userId,
      STREAM_TITLE AS title,
      VIEW_COUNT AS viewerCount,
      IS_LIVE AS isLive,
      CAST(IS_VISIBLE AS bit) AS isVisible,
      PLAYBACK_URL AS playbackUrl,
      THUMBNAIL_URL AS thumbnailUrl,
      GAME_NAME AS gameName,
      STREAM_DESCRIPTION AS description,
      TOURNAMENT_ID AS tournamentId,
      STARTED_AT AS startedAt,
      ENDED_AT AS endedAt
    FROM dbo.STREAM
    WHERE STREAM_ID = @streamId
      AND (@includeHidden = 1 OR IS_VISIBLE = 1)
  `);

  return result.recordset[0] || null;
}

async function incrementViewCount(streamId) {
  await poolConnect;

  await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .query(`
      UPDATE dbo.STREAM
      SET VIEW_COUNT = VIEW_COUNT + 1
      WHERE STREAM_ID = @streamId
    `);
}

async function getStreamLikeCount(streamId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .query(`
      SELECT COUNT(*) AS total
      FROM dbo.STREAM_REACTION
      WHERE STREAM_ID = @streamId
    `);

  return Number(result.recordset[0]?.total) || 0;
}

async function findStreamReaction(streamId, userId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("userId", sql.Int, userId)
    .query(`
      SELECT REACTION_ID AS reactionId, STREAM_ID AS streamId, USER_ID AS userId, CREATED_AT AS createdAt
      FROM dbo.STREAM_REACTION
      WHERE STREAM_ID = @streamId AND USER_ID = @userId
    `);

  return result.recordset[0] || null;
}

async function upsertStreamReaction(streamId, userId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("userId", sql.Int, userId)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM dbo.STREAM_REACTION WHERE STREAM_ID = @streamId AND USER_ID = @userId
      )
        INSERT INTO dbo.STREAM_REACTION (STREAM_ID, USER_ID) VALUES (@streamId, @userId);
      SELECT COUNT(*) AS total FROM dbo.STREAM_REACTION WHERE STREAM_ID = @streamId;
    `);

  return Number(result.recordset[0]?.total) || 0;
}

async function deleteStreamReaction(streamId, userId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("userId", sql.Int, userId)
    .query(`
      DELETE FROM dbo.STREAM_REACTION WHERE STREAM_ID = @streamId AND USER_ID = @userId;
      SELECT COUNT(*) AS total FROM dbo.STREAM_REACTION WHERE STREAM_ID = @streamId;
    `);

  return Number(result.recordset[0]?.total) || 0;
}

async function listComments({ streamId, limit = 50 } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("limit", sql.Int, safeLimit).query(`
      SELECT TOP (@limit)
        COMMENT_ID AS commentId,
        STREAM_ID AS streamId,
        USER_ID AS userId,
        MESSAGE AS message,
        CREATED_AT AS createdAt
      FROM dbo.COMMENT
      WHERE STREAM_ID = @streamId
      ORDER BY CREATED_AT DESC, COMMENT_ID DESC
    `);

  return result.recordset.reverse();
}

async function createComment({ streamId, userId, message }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("userId", sql.Int, userId)
    .input("message", sql.NVarChar(sql.MAX), message).query(`
      INSERT INTO dbo.COMMENT (
        STREAM_ID,
        USER_ID,
        MESSAGE
      )
      OUTPUT
        INSERTED.COMMENT_ID AS commentId,
        INSERTED.STREAM_ID AS streamId,
        INSERTED.USER_ID AS userId,
        INSERTED.MESSAGE AS message,
        INSERTED.CREATED_AT AS createdAt
      VALUES (
        @streamId,
        @userId,
        @message
      )
    `);

  return result.recordset[0] || null;
}

async function insertGift({
  streamId,
  userId,
  giftType,
  giftValue,
  quantity,
  totalValue,
}) {
  await poolConnect;

  const result = await pool
    .request()
    .input("streamId", sql.Int, streamId)
    .input("userId", sql.Int, userId)
    .input("giftType", sql.NVarChar(50), giftType)
    .input("giftValue", sql.Int, giftValue)
    .input("quantity", sql.Int, quantity)
    .input("totalValue", sql.Int, totalValue).query(`
      INSERT INTO dbo.STREAM_GIFTS
        (STREAM_ID, SENDER_USERID, GIFT_TYPE, GIFT_VALUE, QUANTITY, TOTAL_VALUE, CREATED_AT)
      VALUES
        (@streamId, @userId, @giftType, @giftValue, @quantity, @totalValue, SYSDATETIME());

      SELECT SCOPE_IDENTITY() AS GiftID;
    `);

  if (!result.recordset?.[0]?.GiftID) {
    throw new Error("Gift insert succeeded but no GiftID was returned.");
  }

  return parseInt(result.recordset[0].GiftID, 10);
}

module.exports = {
  listStreams,
  findStreamById,
  incrementViewCount,
  getStreamLikeCount,
  findStreamReaction,
  upsertStreamReaction,
  deleteStreamReaction,
  listComments,
  createComment,
  insertGift,
};
