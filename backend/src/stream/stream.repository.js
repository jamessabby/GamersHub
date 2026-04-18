const { sql, pool, poolConnect } = require("../config/db.feed");

async function listStreams({ limit = 12, liveOnly = false } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 24) : 12;
  const result = await pool
    .request()
    .input("limit", sql.Int, safeLimit)
    .input("liveOnly", sql.Bit, liveOnly ? 1 : 0).query(`
      SELECT TOP (@limit)
        STREAM_ID AS streamId,
        USER_ID AS userId,
        STREAM_TITLE AS title,
        VIEW_COUNT AS viewerCount,
        IS_LIVE AS isLive,
        PLAYBACK_URL AS playbackUrl,
        THUMBNAIL_URL AS thumbnailUrl,
        GAME_NAME AS gameName,
        STREAM_DESCRIPTION AS description,
        STARTED_AT AS startedAt,
        ENDED_AT AS endedAt
      FROM dbo.STREAM
      WHERE (@liveOnly = 0 OR IS_LIVE = 1)
      ORDER BY
        IS_LIVE DESC,
        STARTED_AT DESC,
        STREAM_ID DESC
    `);

  return result.recordset;
}

async function findStreamById(streamId) {
  await poolConnect;

  const result = await pool.request().input("streamId", sql.Int, streamId).query(`
    SELECT
      STREAM_ID AS streamId,
      USER_ID AS userId,
      STREAM_TITLE AS title,
      VIEW_COUNT AS viewerCount,
      IS_LIVE AS isLive,
      PLAYBACK_URL AS playbackUrl,
      THUMBNAIL_URL AS thumbnailUrl,
      GAME_NAME AS gameName,
      STREAM_DESCRIPTION AS description,
      STARTED_AT AS startedAt,
      ENDED_AT AS endedAt
    FROM dbo.STREAM
    WHERE STREAM_ID = @streamId
  `);

  return result.recordset[0] || null;
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
  listComments,
  createComment,
  insertGift,
};
