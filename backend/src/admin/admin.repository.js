const { pool: authPool, poolConnect: authPoolConnect } = require("../config/db.auth");
const { pool: feedPool, poolConnect: feedPoolConnect, sql: feedSql } = require("../config/db.feed");
const { pool: reactionPool, poolConnect: reactionPoolConnect } = require("../config/db.reaction");
const { pool: tournamentPool, poolConnect: tournamentPoolConnect } = require("../config/db.tournament");
const { pool: userPool, poolConnect: userPoolConnect, sql: userSql } = require("../config/db.user");

async function listUserProfiles(userIds) {
  await userPoolConnect;

  if (!Array.isArray(userIds) || !userIds.length) {
    return new Map();
  }

  const uniqueIds = [...new Set(userIds)].filter((userId) => Number.isInteger(userId));
  const placeholders = uniqueIds.map((_, index) => `@userId${index}`);
  const request = userPool.request();
  uniqueIds.forEach((userId, index) => {
    request.input(`userId${index}`, userSql.Int, userId);
  });

  const result = await request.query(`
    SELECT
      USERID AS userId,
      STUDENT_ID AS studentId,
      IN_GAME_NAME AS displayName,
      SCHOOL AS school
    FROM dbo.USER_PROFILE
    WHERE USERID IN (${placeholders.join(", ")})
  `);

  return new Map((result.recordset || []).map((row) => [row.userId, row]));
}

async function getAnalyticsCounts() {
  await Promise.all([
    authPoolConnect,
    feedPoolConnect,
    reactionPoolConnect,
    tournamentPoolConnect,
  ]);

  const [postTotal, streamTotal, reactionTotal, commentTotal, tournamentTotal] = await Promise.all([
    feedPool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.POST postRow
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS author
        ON author.USERID = postRow.USER_ID
    `),
    feedPool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.STREAM streamRow
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS author
        ON author.USERID = streamRow.USER_ID
    `),
    reactionPool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.POST_REACTION reactionRow
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS reactingUser
        ON reactingUser.USERID = reactionRow.USER_ID
      INNER JOIN GAMERSHUB_FEED.dbo.POST postRow
        ON postRow.POST_ID = reactionRow.POST_ID
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS postAuthor
        ON postAuthor.USERID = postRow.USER_ID
    `),
    reactionPool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.POST_COMMENT commentRow
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS commentingUser
        ON commentingUser.USERID = commentRow.USER_ID
      INNER JOIN GAMERSHUB_FEED.dbo.POST postRow
        ON postRow.POST_ID = commentRow.POST_ID
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS postAuthor
        ON postAuthor.USERID = postRow.USER_ID
    `),
    tournamentPool.request().query("SELECT COUNT(*) AS total FROM dbo.TOURNAMENT"),
  ]);

  return {
    posts: Number(postTotal.recordset[0]?.total) || 0,
    streams: Number(streamTotal.recordset[0]?.total) || 0,
    reactions: Number(reactionTotal.recordset[0]?.total) || 0,
    comments: Number(commentTotal.recordset[0]?.total) || 0,
    tournaments: Number(tournamentTotal.recordset[0]?.total) || 0,
  };
}

async function listStreamsForModeration() {
  await feedPoolConnect;

  const result = await feedPool.request().query(`
    SELECT
      s.STREAM_ID AS streamId,
      s.USER_ID AS userId,
      s.STREAM_TITLE AS title,
      s.GAME_NAME AS gameName,
      CAST(s.IS_LIVE AS bit) AS isLive,
      CAST(s.IS_VISIBLE AS bit) AS isVisible,
      s.VIEW_COUNT AS viewerCount,
      s.TOURNAMENT_ID AS tournamentId,
      s.STARTED_AT AS startedAt,
      (
        SELECT COUNT(*)
        FROM dbo.STREAM_REACTION sr
        WHERE sr.STREAM_ID = s.STREAM_ID
      ) AS likeCount
    FROM dbo.STREAM s
    ORDER BY s.IS_LIVE DESC, s.STARTED_AT DESC, s.STREAM_ID DESC
  `);

  return result.recordset || [];
}

async function updateStreamVisibility({ streamId, isVisible }) {
  await feedPoolConnect;

  const result = await feedPool
    .request()
    .input("streamId", feedSql.Int, streamId)
    .input("isVisible", feedSql.Bit, isVisible ? 1 : 0).query(`
      UPDATE dbo.STREAM
      SET
        IS_VISIBLE = @isVisible,
        MODERATED_AT = SYSDATETIME()
      OUTPUT
        INSERTED.STREAM_ID AS streamId,
        INSERTED.USER_ID AS userId,
        INSERTED.STREAM_TITLE AS title,
        CAST(INSERTED.IS_VISIBLE AS bit) AS isVisible,
        INSERTED.MODERATED_AT AS moderatedAt
      WHERE STREAM_ID = @streamId
    `);

  return result.recordset[0] || null;
}

async function createStream({ userId, title, gameName, playbackUrl, thumbnailUrl, description, isLive, isVisible, startedAt, tournamentId }) {
  await feedPoolConnect;

  const request = feedPool
    .request()
    .input("userId", feedSql.Int, userId)
    .input("title", feedSql.NVarChar(255), title)
    .input("gameName", feedSql.NVarChar(100), gameName || null)
    .input("playbackUrl", feedSql.NVarChar(feedSql.MAX), playbackUrl)
    .input("thumbnailUrl", feedSql.NVarChar(feedSql.MAX), thumbnailUrl || null)
    .input("description", feedSql.NVarChar(feedSql.MAX), description || null)
    .input("isLive", feedSql.Bit, isLive ? 1 : 0)
    .input("isVisible", feedSql.Bit, isVisible ? 1 : 0)
    .input("startedAt", feedSql.DateTime2, startedAt || null)
    .input("tournamentId", feedSql.Int, tournamentId || null);

  const result = await request.query(`
    INSERT INTO dbo.STREAM (
      USER_ID,
      STREAM_TITLE,
      GAME_NAME,
      PLAYBACK_URL,
      THUMBNAIL_URL,
      STREAM_DESCRIPTION,
      IS_LIVE,
      IS_VISIBLE,
      VIEW_COUNT,
      STARTED_AT,
      TOURNAMENT_ID
    )
    OUTPUT
      INSERTED.STREAM_ID AS streamId,
      INSERTED.USER_ID AS userId,
      INSERTED.STREAM_TITLE AS title,
      INSERTED.GAME_NAME AS gameName,
      CAST(INSERTED.IS_LIVE AS bit) AS isLive,
      CAST(INSERTED.IS_VISIBLE AS bit) AS isVisible,
      INSERTED.PLAYBACK_URL AS playbackUrl,
      INSERTED.VIEW_COUNT AS viewerCount,
      INSERTED.TOURNAMENT_ID AS tournamentId,
      INSERTED.STARTED_AT AS startedAt
    VALUES (
      @userId,
      @title,
      @gameName,
      @playbackUrl,
      @thumbnailUrl,
      @description,
      @isLive,
      @isVisible,
      0,
      @startedAt,
      @tournamentId
    )
  `);

  return result.recordset[0] || null;
}

async function getSummaryReportCounts() {
  await authPoolConnect;
  const userCounts = await authPool.request().query("SELECT COUNT(*) AS total FROM dbo.USERS");
  const analytics = await getAnalyticsCounts();

  return {
    users: Number(userCounts.recordset[0]?.total) || 0,
    ...analytics,
  };
}

async function getTopGames({ limit = 6 } = {}) {
  await userPoolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 6;
  const result = await userPool.request().input("limit", userSql.Int, safeLimit).query(`
    SELECT TOP (@limit)
      TRIM(VALUE) AS gameName,
      COUNT(*) AS total
    FROM dbo.USER_PROFILE
    CROSS APPLY STRING_SPLIT(PRIMARY_GAME, ',')
    WHERE PRIMARY_GAME IS NOT NULL AND TRIM(PRIMARY_GAME) != ''
      AND LEN(TRIM(VALUE)) > 0
    GROUP BY TRIM(VALUE)
    ORDER BY total DESC
  `);

  return result.recordset || [];
}

async function updateStream({ streamId, title, gameName, playbackUrl, thumbnailUrl, description, isLive, isVisible, tournamentId }) {
  await feedPoolConnect;

  const result = await feedPool
    .request()
    .input("streamId", feedSql.Int, streamId)
    .input("title", feedSql.NVarChar(255), title)
    .input("gameName", feedSql.NVarChar(100), gameName || null)
    .input("playbackUrl", feedSql.NVarChar(feedSql.MAX), playbackUrl)
    .input("thumbnailUrl", feedSql.NVarChar(feedSql.MAX), thumbnailUrl || null)
    .input("description", feedSql.NVarChar(feedSql.MAX), description || null)
    .input("isLive", feedSql.Bit, isLive ? 1 : 0)
    .input("isVisible", feedSql.Bit, isVisible ? 1 : 0)
    .input("tournamentId", feedSql.Int, tournamentId || null).query(`
      UPDATE dbo.STREAM
      SET
        STREAM_TITLE      = @title,
        GAME_NAME         = @gameName,
        PLAYBACK_URL      = @playbackUrl,
        THUMBNAIL_URL     = @thumbnailUrl,
        STREAM_DESCRIPTION = @description,
        IS_LIVE           = @isLive,
        IS_VISIBLE        = @isVisible,
        TOURNAMENT_ID     = @tournamentId
      OUTPUT
        INSERTED.STREAM_ID AS streamId,
        INSERTED.USER_ID AS userId,
        INSERTED.STREAM_TITLE AS title,
        INSERTED.GAME_NAME AS gameName,
        CAST(INSERTED.IS_LIVE AS bit) AS isLive,
        CAST(INSERTED.IS_VISIBLE AS bit) AS isVisible,
        INSERTED.PLAYBACK_URL AS playbackUrl,
        INSERTED.THUMBNAIL_URL AS thumbnailUrl,
        INSERTED.STREAM_DESCRIPTION AS description,
        INSERTED.TOURNAMENT_ID AS tournamentId
      WHERE STREAM_ID = @streamId
    `);

  return result.recordset[0] || null;
}

module.exports = {
  listUserProfiles,
  getAnalyticsCounts,
  listStreamsForModeration,
  updateStreamVisibility,
  createStream,
  updateStream,
  getSummaryReportCounts,
  getTopGames,
};
