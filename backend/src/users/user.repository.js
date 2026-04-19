const { sql, pool, poolConnect } = require("../config/db.auth");

async function createUser({
  username,
  email,
  passwordHash,
  mfaSecret,
  role = "user",
  authProvider = "local",
  googleSub = null,
  avatarUrl = null,
  mfaEnrolled = false,
}) {
  await poolConnect;

  const result = await pool
    .request()
    .input("username", sql.NVarChar(50), username)
    .input("email", sql.NVarChar(255), email)
    .input("passwordHash", sql.NVarChar(sql.MAX), passwordHash)
    .input("mfaSecret", sql.NVarChar(50), mfaSecret)
    .input("role", sql.NVarChar(50), role)
    .input("authProvider", sql.NVarChar(30), authProvider)
    .input("googleSub", sql.NVarChar(255), googleSub)
    .input("avatarUrl", sql.NVarChar(1000), avatarUrl)
    .input("mfaEnrolled", sql.Bit, mfaEnrolled ? 1 : 0).query(`
        INSERT INTO dbo.USERS (
          USERNAME,
          EMAIL,
          PASSWORD_HASH,
          MFA_SECRET,
          USER_ROLE,
          AUTH_PROVIDER,
          GOOGLE_SUB,
          AVATAR_URL,
          MFA_ENROLLED,
          CREATED_AT
        )
        OUTPUT
          INSERTED.USERID AS userId,
          INSERTED.USERNAME AS username,
          INSERTED.EMAIL AS email,
          INSERTED.PASSWORD_HASH AS passwordHash,
          INSERTED.MFA_SECRET AS mfaSecret,
          INSERTED.USER_ROLE AS userRole,
          INSERTED.AUTH_PROVIDER AS authProvider,
          INSERTED.GOOGLE_SUB AS googleSub,
          INSERTED.AVATAR_URL AS avatarUrl,
          INSERTED.MFA_ENROLLED AS mfaEnrolled,
          INSERTED.IS_ACTIVE AS isActive,
          INSERTED.CREATED_AT AS createdAt
        VALUES (
          @username,
          @email,
          @passwordHash,
          @mfaSecret,
          @role,
          @authProvider,
          @googleSub,
          @avatarUrl,
          @mfaEnrolled,
          SYSDATETIME()
        )
      `);
  return result.recordset[0];
}

async function findByUsername(username) {
  await poolConnect;

  const result = await pool
    .request()
    .input("username", sql.NVarChar(50), username).query(`
      SELECT
        USERID AS userId,
        USERNAME AS username,
        EMAIL AS email,
        PASSWORD_HASH AS passwordHash,
        MFA_SECRET AS mfaSecret,
        USER_ROLE AS userRole,
        AUTH_PROVIDER AS authProvider,
        GOOGLE_SUB AS googleSub,
        AVATAR_URL AS avatarUrl,
        MFA_ENROLLED AS mfaEnrolled,
        IS_ACTIVE AS isActive,
        CREATED_AT AS createdAt
      FROM dbo.USERS
      WHERE USERNAME = @username
    `);
  return result.recordset[0];
}

async function findByEmail(email) {
  await poolConnect;

  const result = await pool
    .request()
    .input("email", sql.NVarChar(255), email).query(`
      SELECT
        USERID AS userId,
        USERNAME AS username,
        EMAIL AS email,
        PASSWORD_HASH AS passwordHash,
        MFA_SECRET AS mfaSecret,
        USER_ROLE AS userRole,
        AUTH_PROVIDER AS authProvider,
        GOOGLE_SUB AS googleSub,
        AVATAR_URL AS avatarUrl,
        MFA_ENROLLED AS mfaEnrolled,
        IS_ACTIVE AS isActive,
        CREATED_AT AS createdAt
      FROM dbo.USERS
      WHERE EMAIL = @email
    `);
  return result.recordset[0];
}

async function findByGoogleSub(googleSub) {
  await poolConnect;

  const result = await pool
    .request()
    .input("googleSub", sql.NVarChar(255), googleSub).query(`
      SELECT
        USERID AS userId,
        USERNAME AS username,
        EMAIL AS email,
        PASSWORD_HASH AS passwordHash,
        MFA_SECRET AS mfaSecret,
        USER_ROLE AS userRole,
        AUTH_PROVIDER AS authProvider,
        GOOGLE_SUB AS googleSub,
        AVATAR_URL AS avatarUrl,
        MFA_ENROLLED AS mfaEnrolled,
        IS_ACTIVE AS isActive,
        CREATED_AT AS createdAt
      FROM dbo.USERS
      WHERE GOOGLE_SUB = @googleSub
    `);

  return result.recordset[0] || null;
}

async function findById(userId) {
  await poolConnect;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
      SELECT
        USERID AS userId,
        USERNAME AS username,
        EMAIL AS email,
        PASSWORD_HASH AS passwordHash,
        MFA_SECRET AS mfaSecret,
        USER_ROLE AS userRole,
        AUTH_PROVIDER AS authProvider,
        GOOGLE_SUB AS googleSub,
        AVATAR_URL AS avatarUrl,
        MFA_ENROLLED AS mfaEnrolled,
        IS_ACTIVE AS isActive,
        CREATED_AT AS createdAt
      FROM dbo.USERS
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

async function updateMfaSecret(userId, mfaSecret) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("mfaSecret", sql.NVarChar(50), mfaSecret).query(`
      UPDATE dbo.USERS
      SET MFA_SECRET = @mfaSecret
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.MFA_SECRET AS mfaSecret,
        INSERTED.MFA_ENROLLED AS mfaEnrolled
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

async function updateMfaEnrollment(userId, isEnrolled) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("isEnrolled", sql.Bit, isEnrolled ? 1 : 0).query(`
      UPDATE dbo.USERS
      SET MFA_ENROLLED = @isEnrolled
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.MFA_ENROLLED AS mfaEnrolled
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

async function updateGoogleLink(userId, { googleSub, avatarUrl, authProvider = "google" }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("googleSub", sql.NVarChar(255), googleSub)
    .input("avatarUrl", sql.NVarChar(1000), avatarUrl || null)
    .input("authProvider", sql.NVarChar(30), authProvider).query(`
      UPDATE dbo.USERS
      SET
        GOOGLE_SUB = @googleSub,
        AVATAR_URL = COALESCE(@avatarUrl, AVATAR_URL),
        AUTH_PROVIDER = CASE
          WHEN AUTH_PROVIDER = 'local' THEN 'hybrid'
          ELSE @authProvider
        END
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.USERNAME AS username,
        INSERTED.EMAIL AS email,
        INSERTED.PASSWORD_HASH AS passwordHash,
        INSERTED.MFA_SECRET AS mfaSecret,
        INSERTED.USER_ROLE AS userRole,
        INSERTED.AUTH_PROVIDER AS authProvider,
        INSERTED.GOOGLE_SUB AS googleSub,
        INSERTED.AVATAR_URL AS avatarUrl,
        INSERTED.MFA_ENROLLED AS mfaEnrolled,
        INSERTED.IS_ACTIVE AS isActive,
        INSERTED.CREATED_AT AS createdAt
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

async function updateUserRole(userId, role) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("role", sql.NVarChar(50), role).query(`
      UPDATE dbo.USERS
      SET USER_ROLE = @role
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.USERNAME AS username,
        INSERTED.EMAIL AS email,
        INSERTED.USER_ROLE AS userRole,
        INSERTED.AUTH_PROVIDER AS authProvider,
        INSERTED.MFA_ENROLLED AS mfaEnrolled,
        INSERTED.IS_ACTIVE AS isActive,
        INSERTED.CREATED_AT AS createdAt
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

async function listUsers({ query = null, role = null, limit = 50, offset = 0 } = {}) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
  const searchTerm = query ? `%${String(query).trim()}%` : null;

  const result = await pool
    .request()
    .input("role", sql.NVarChar(50), role || null)
    .input("searchTerm", sql.NVarChar(255), searchTerm)
    .input("offset", sql.Int, safeOffset)
    .input("limit", sql.Int, safeLimit).query(`
      WITH filtered AS (
        SELECT
          USERID AS userId,
          USERNAME AS username,
          EMAIL AS email,
          USER_ROLE AS userRole,
          AUTH_PROVIDER AS authProvider,
          AVATAR_URL AS avatarUrl,
          MFA_ENROLLED AS mfaEnrolled,
          IS_ACTIVE AS isActive,
          CREATED_AT AS createdAt
        FROM dbo.USERS
        WHERE (@role IS NULL OR USER_ROLE = @role)
          AND (
            @searchTerm IS NULL
            OR USERNAME LIKE @searchTerm
            OR EMAIL LIKE @searchTerm
          )
      )
      SELECT *
      FROM filtered
      ORDER BY createdAt DESC, userId DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

      SELECT COUNT(*) AS total
      FROM dbo.USERS
      WHERE (@role IS NULL OR USER_ROLE = @role)
        AND (
          @searchTerm IS NULL
          OR USERNAME LIKE @searchTerm
          OR EMAIL LIKE @searchTerm
        );
    `);

  return {
    items: result.recordsets[0] || [],
    total: Number(result.recordsets[1]?.[0]?.total) || 0,
  };
}

async function countUsersByRole() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT
      USER_ROLE AS userRole,
      COUNT(*) AS total
    FROM dbo.USERS
    GROUP BY USER_ROLE
  `);

  return result.recordset;
}

async function countRegistrationsByDay({ days = 30 } = {}) {
  await poolConnect;

  const safeDays = Number.isInteger(days) && days > 0 ? Math.min(days, 365) : 30;
  const result = await pool.request().input("days", sql.Int, safeDays).query(`
    SELECT
      CONVERT(varchar(10), CREATED_AT, 23) AS createdDate,
      COUNT(*) AS total
    FROM dbo.USERS
    WHERE CREATED_AT >= DATEADD(day, -@days, SYSDATETIME())
    GROUP BY CONVERT(varchar(10), CREATED_AT, 23)
    ORDER BY createdDate ASC
  `);

  return result.recordset;
}

module.exports = {
  createUser,
  findByUsername,
  findByEmail,
  findByGoogleSub,
  findById,
  updateMfaSecret,
  updateMfaEnrollment,
  updateGoogleLink,
  updateUserRole,
  listUsers,
  countUsersByRole,
  countRegistrationsByDay,
};
