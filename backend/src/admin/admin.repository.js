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
      USERID        AS userId,
      STUDENT_ID    AS studentId,
      IN_GAME_NAME  AS displayName,
      FIRST_NAME    AS firstName,
      LAST_NAME     AS lastName,
      SCHOOL        AS school,
      COURSE_YEAR   AS courseYear,
      PHONE_NUMBER  AS phoneNumber,
      DATE_OF_BIRTH AS dateOfBirth,
      PRIMARY_GAME  AS primaryGame
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
      s.PLAYBACK_URL AS playbackUrl,
      s.THUMBNAIL_URL AS thumbnailUrl,
      s.STREAM_DESCRIPTION AS description,
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
    .input("title", feedSql.NVarChar(500), title)
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
    .input("title", feedSql.NVarChar(500), title)
    .input("gameName", feedSql.NVarChar(100), gameName || null)
    .input("playbackUrl", feedSql.NVarChar(feedSql.MAX), playbackUrl)
    .input("thumbnailUrl", feedSql.NVarChar(feedSql.MAX), thumbnailUrl || null)
    .input("description", feedSql.NVarChar(feedSql.MAX), description || null)
    .input("isLive", feedSql.Bit, isLive ? 1 : 0)
    .input("isVisible", feedSql.Bit, isVisible ? 1 : 0)
    .input("tournamentId", feedSql.Int, tournamentId || null).query(`
      UPDATE dbo.STREAM
      SET
        STREAM_TITLE       = @title,
        GAME_NAME          = @gameName,
        PLAYBACK_URL       = @playbackUrl,
        THUMBNAIL_URL      = @thumbnailUrl,
        STREAM_DESCRIPTION = @description,
        IS_LIVE            = @isLive,
        IS_VISIBLE         = @isVisible,
        TOURNAMENT_ID      = @tournamentId,
        ENDED_AT = CASE
          WHEN @isLive = 0 AND ENDED_AT IS NULL THEN SYSDATETIME()
          WHEN @isLive = 1 THEN NULL
          ELSE ENDED_AT
        END
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
        INSERTED.TOURNAMENT_ID AS tournamentId,
        INSERTED.ENDED_AT AS endedAt
      WHERE STREAM_ID = @streamId
    `);

  return result.recordset[0] || null;
}

async function listAllEvents() {
  await feedPoolConnect;
  const result = await feedPool.request().query(`
    SELECT
      EVENT_ID   AS eventId,
      TITLE      AS title,
      CATEGORY   AS category,
      DESCRIPTION AS description,
      CONVERT(varchar(10), EVENT_DATE, 23)  AS eventDate,
      CONVERT(varchar(8),  EVENT_TIME, 108) AS eventTime,
      VENUE        AS venue,
      IS_PUBLISHED AS isPublished,
      CONVERT(varchar(23), CREATED_AT, 126) AS createdAt
    FROM dbo.EVENT
    ORDER BY EVENT_DATE ASC, CREATED_AT DESC
  `);
  return result.recordset.map((r) => ({ ...r, isPublished: Boolean(r.isPublished) }));
}

async function listPublishedEvents() {
  await feedPoolConnect;
  const result = await feedPool.request().query(`
    SELECT
      EVENT_ID   AS eventId,
      TITLE      AS title,
      CATEGORY   AS category,
      DESCRIPTION AS description,
      CONVERT(varchar(10), EVENT_DATE, 23)  AS eventDate,
      CONVERT(varchar(8),  EVENT_TIME, 108) AS eventTime,
      VENUE      AS venue,
      CONVERT(varchar(23), CREATED_AT, 126) AS createdAt
    FROM dbo.EVENT
    WHERE IS_PUBLISHED = 1
    ORDER BY EVENT_DATE ASC, CREATED_AT DESC
  `);
  return result.recordset;
}

async function createEvent({ title, category, description, eventDate, eventTime, venue, isPublished }) {
  await feedPoolConnect;
  const result = await feedPool
    .request()
    .input("title",       feedSql.NVarChar(255), title)
    .input("category",    feedSql.NVarChar(100), category    || null)
    .input("description", feedSql.NVarChar(feedSql.MAX), description || null)
    .input("eventDate",   feedSql.NVarChar(10),  eventDate   || null)
    .input("eventTime",   feedSql.NVarChar(8),   eventTime   || null)
    .input("venue",       feedSql.NVarChar(255), venue       || null)
    .input("isPublished", feedSql.Bit,           isPublished !== false ? 1 : 0)
    .query(`
      INSERT INTO dbo.EVENT (TITLE, CATEGORY, DESCRIPTION, EVENT_DATE, EVENT_TIME, VENUE, IS_PUBLISHED)
      OUTPUT
        INSERTED.EVENT_ID    AS eventId,
        INSERTED.TITLE       AS title,
        INSERTED.CATEGORY    AS category,
        INSERTED.DESCRIPTION AS description,
        CONVERT(varchar(10), INSERTED.EVENT_DATE, 23)  AS eventDate,
        CONVERT(varchar(8),  INSERTED.EVENT_TIME, 108) AS eventTime,
        INSERTED.VENUE       AS venue,
        INSERTED.IS_PUBLISHED AS isPublished,
        CONVERT(varchar(23), INSERTED.CREATED_AT, 126) AS createdAt
      VALUES (
        @title, @category, @description,
        TRY_CAST(@eventDate AS date),
        TRY_CAST(@eventTime AS time),
        @venue, @isPublished
      )
    `);
  const row = result.recordset[0];
  return row ? { ...row, isPublished: Boolean(row.isPublished) } : null;
}

async function updateEvent({ eventId, title, category, description, eventDate, eventTime, venue, isPublished }) {
  await feedPoolConnect;
  const result = await feedPool
    .request()
    .input("eventId",     feedSql.Int,           eventId)
    .input("title",       feedSql.NVarChar(255), title)
    .input("category",    feedSql.NVarChar(100), category    || null)
    .input("description", feedSql.NVarChar(feedSql.MAX), description || null)
    .input("eventDate",   feedSql.NVarChar(10),  eventDate   || null)
    .input("eventTime",   feedSql.NVarChar(8),   eventTime   || null)
    .input("venue",       feedSql.NVarChar(255), venue       || null)
    .input("isPublished", feedSql.Bit,           isPublished !== false ? 1 : 0)
    .query(`
      UPDATE dbo.EVENT
      SET
        TITLE       = @title,
        CATEGORY    = @category,
        DESCRIPTION = @description,
        EVENT_DATE  = TRY_CAST(@eventDate AS date),
        EVENT_TIME  = TRY_CAST(@eventTime AS time),
        VENUE       = @venue,
        IS_PUBLISHED = @isPublished,
        UPDATED_AT  = SYSUTCDATETIME()
      OUTPUT
        INSERTED.EVENT_ID    AS eventId,
        INSERTED.TITLE       AS title,
        INSERTED.CATEGORY    AS category,
        INSERTED.DESCRIPTION AS description,
        CONVERT(varchar(10), INSERTED.EVENT_DATE, 23)  AS eventDate,
        CONVERT(varchar(8),  INSERTED.EVENT_TIME, 108) AS eventTime,
        INSERTED.VENUE       AS venue,
        INSERTED.IS_PUBLISHED AS isPublished,
        CONVERT(varchar(23), INSERTED.CREATED_AT, 126) AS createdAt
      WHERE EVENT_ID = @eventId
    `);
  const row = result.recordset[0];
  return row ? { ...row, isPublished: Boolean(row.isPublished) } : null;
}

async function deleteEvent(eventId) {
  await feedPoolConnect;
  const result = await feedPool
    .request()
    .input("eventId", feedSql.Int, eventId)
    .query(`DELETE FROM dbo.EVENT WHERE EVENT_ID = @eventId`);
  return result.rowsAffected[0] > 0;
}

async function setStreamLiveStatus({ streamId, isLive }) {
  await feedPoolConnect;

  const result = await feedPool
    .request()
    .input("streamId", feedSql.Int, streamId)
    .input("isLive", feedSql.Bit, isLive ? 1 : 0)
    .query(`
      UPDATE dbo.STREAM
      SET
        IS_LIVE  = @isLive,
        ENDED_AT = CASE
          WHEN @isLive = 0 AND ENDED_AT IS NULL THEN SYSDATETIME()
          WHEN @isLive = 1 THEN NULL
          ELSE ENDED_AT
        END
      OUTPUT
        INSERTED.STREAM_ID AS streamId,
        CAST(INSERTED.IS_LIVE AS bit) AS isLive,
        INSERTED.ENDED_AT AS endedAt
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
  setStreamLiveStatus,
  getSummaryReportCounts,
  getTopGames,
  listAllEvents,
  listPublishedEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
