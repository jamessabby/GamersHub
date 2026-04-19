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
    feedPool.request().query("SELECT COUNT(*) AS total FROM dbo.POST"),
    feedPool.request().query("SELECT COUNT(*) AS total FROM dbo.STREAM"),
    reactionPool.request().query("SELECT COUNT(*) AS total FROM dbo.POST_REACTION"),
    reactionPool.request().query("SELECT COUNT(*) AS total FROM dbo.POST_COMMENT"),
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
      STREAM_ID AS streamId,
      USER_ID AS userId,
      STREAM_TITLE AS title,
      GAME_NAME AS gameName,
      CAST(IS_LIVE AS bit) AS isLive,
      CAST(IS_VISIBLE AS bit) AS isVisible,
      VIEW_COUNT AS viewerCount,
      STARTED_AT AS startedAt
    FROM dbo.STREAM
    ORDER BY IS_LIVE DESC, STARTED_AT DESC, STREAM_ID DESC
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

async function getSummaryReportCounts() {
  await authPoolConnect;
  const userCounts = await authPool.request().query("SELECT COUNT(*) AS total FROM dbo.USERS");
  const analytics = await getAnalyticsCounts();

  return {
    users: Number(userCounts.recordset[0]?.total) || 0,
    ...analytics,
  };
}

module.exports = {
  listUserProfiles,
  getAnalyticsCounts,
  listStreamsForModeration,
  updateStreamVisibility,
  getSummaryReportCounts,
};
