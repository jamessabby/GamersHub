const { sql, pool, poolConnect } = require("../config/db.auth");

async function createSession({ userId, tokenHash, expiresAt }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("tokenHash", sql.NVarChar(128), tokenHash)
    .input("expiresAt", sql.DateTime2, expiresAt).query(`
      INSERT INTO dbo.AUTH_SESSION (
        USER_ID,
        TOKEN_HASH,
        EXPIRES_AT,
        CREATED_AT,
        LAST_SEEN_AT
      )
      OUTPUT
        INSERTED.SESSION_ID AS sessionId,
        INSERTED.USER_ID AS userId,
        INSERTED.TOKEN_HASH AS tokenHash,
        INSERTED.EXPIRES_AT AS expiresAt,
        INSERTED.CREATED_AT AS createdAt,
        INSERTED.LAST_SEEN_AT AS lastSeenAt,
        INSERTED.REVOKED_AT AS revokedAt
      VALUES (
        @userId,
        @tokenHash,
        @expiresAt,
        SYSDATETIME(),
        SYSDATETIME()
      )
    `);

  return result.recordset[0] || null;
}

async function findActiveSessionByTokenHash(tokenHash) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tokenHash", sql.NVarChar(128), tokenHash).query(`
      SELECT
        SESSION_ID AS sessionId,
        USER_ID AS userId,
        TOKEN_HASH AS tokenHash,
        EXPIRES_AT AS expiresAt,
        CREATED_AT AS createdAt,
        LAST_SEEN_AT AS lastSeenAt,
        REVOKED_AT AS revokedAt
      FROM dbo.AUTH_SESSION
      WHERE TOKEN_HASH = @tokenHash
        AND REVOKED_AT IS NULL
        AND EXPIRES_AT > SYSDATETIME()
    `);

  return result.recordset[0] || null;
}

async function touchSession(sessionId) {
  await poolConnect;

  await pool.request().input("sessionId", sql.Int, sessionId).query(`
    UPDATE dbo.AUTH_SESSION
    SET LAST_SEEN_AT = SYSDATETIME()
    WHERE SESSION_ID = @sessionId
      AND REVOKED_AT IS NULL
  `);
}

async function revokeSessionByTokenHash(tokenHash) {
  await poolConnect;

  const result = await pool
    .request()
    .input("tokenHash", sql.NVarChar(128), tokenHash).query(`
      UPDATE dbo.AUTH_SESSION
      SET REVOKED_AT = COALESCE(REVOKED_AT, SYSDATETIME())
      OUTPUT
        INSERTED.SESSION_ID AS sessionId,
        INSERTED.USER_ID AS userId
      WHERE TOKEN_HASH = @tokenHash
        AND REVOKED_AT IS NULL
    `);

  return result.recordset[0] || null;
}

module.exports = {
  createSession,
  findActiveSessionByTokenHash,
  touchSession,
  revokeSessionByTokenHash,
};
