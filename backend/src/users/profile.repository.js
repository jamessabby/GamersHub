const { sql, pool, poolConnect } = require("../config/db.user");

async function findByUserId(userId) {
  await poolConnect;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      USERID AS userId,
      STUDENT_ID AS studentId,
      FIRST_NAME AS firstName,
      LAST_NAME AS lastName,
      CONVERT(varchar(10), DATE_OF_BIRTH, 23) AS dateOfBirth,
      IN_GAME_NAME AS displayName,
      EMAIL AS email,
      PHONE_NUMBER AS phoneNumber,
      SCHOOL AS school,
      COURSE_YEAR AS courseYear,
      PRIMARY_GAME AS primaryGame
    FROM dbo.USER_PROFILE
    WHERE USERID = @userId
  `);

  return result.recordset[0] || null;
}

async function searchProfiles({ query, excludeUserId, limit = 8 }) {
  await poolConnect;

  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 12) : 8;
  const searchTerm = `%${String(query || "").trim()}%`;
  const result = await pool
    .request()
    .input("excludeUserId", sql.Int, excludeUserId)
    .input("limit", sql.Int, safeLimit)
    .input("searchTerm", sql.NVarChar(255), searchTerm).query(`
      SELECT TOP (@limit)
        USERID AS userId,
        STUDENT_ID AS studentId,
        FIRST_NAME AS firstName,
        LAST_NAME AS lastName,
        CONVERT(varchar(10), DATE_OF_BIRTH, 23) AS dateOfBirth,
        IN_GAME_NAME AS displayName,
        EMAIL AS email,
        PHONE_NUMBER AS phoneNumber,
        SCHOOL AS school,
        COURSE_YEAR AS courseYear,
        PRIMARY_GAME AS primaryGame
      FROM dbo.USER_PROFILE
      WHERE USERID <> @excludeUserId
        AND (
          IN_GAME_NAME LIKE @searchTerm
          OR FIRST_NAME LIKE @searchTerm
          OR LAST_NAME LIKE @searchTerm
          OR SCHOOL LIKE @searchTerm
        )
      ORDER BY
        CASE
          WHEN IN_GAME_NAME LIKE @searchTerm THEN 0
          WHEN FIRST_NAME LIKE @searchTerm THEN 1
          WHEN LAST_NAME LIKE @searchTerm THEN 2
          ELSE 3
        END,
        IN_GAME_NAME ASC,
        USERID ASC
    `);

  return result.recordset;
}

async function createProfile({ userId, username, email, studentId }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("studentId", sql.NVarChar(50), studentId || null)
    .input("displayName", sql.NVarChar(100), username)
    .input("email", sql.NVarChar(255), email || null).query(`
      INSERT INTO dbo.USER_PROFILE (
        USERID,
        STUDENT_ID,
        IN_GAME_NAME,
        EMAIL
      )
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.STUDENT_ID AS studentId,
        INSERTED.FIRST_NAME AS firstName,
        INSERTED.LAST_NAME AS lastName,
        CONVERT(varchar(10), INSERTED.DATE_OF_BIRTH, 23) AS dateOfBirth,
        INSERTED.IN_GAME_NAME AS displayName,
        INSERTED.EMAIL AS email,
        INSERTED.PHONE_NUMBER AS phoneNumber,
        INSERTED.SCHOOL AS school,
        INSERTED.COURSE_YEAR AS courseYear,
        INSERTED.PRIMARY_GAME AS primaryGame
      VALUES (
        @userId,
        @studentId,
        @displayName,
        @email
      )
    `);

  return result.recordset[0];
}

async function updateProfile(
  userId,
  {
    studentId,
    firstName,
    lastName,
    dateOfBirth,
    displayName,
    email,
    phoneNumber,
    school,
    courseYear,
    primaryGame,
  },
) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("studentId", sql.NVarChar(50), studentId || null)
    .input("firstName", sql.NVarChar(100), firstName || null)
    .input("lastName", sql.NVarChar(100), lastName || null)
    .input("dateOfBirth", sql.NVarChar(10), dateOfBirth || null)
    .input("displayName", sql.NVarChar(100), displayName || null)
    .input("email", sql.NVarChar(255), email || null)
    .input("phoneNumber", sql.NVarChar(50), phoneNumber || null)
    .input("school", sql.NVarChar(255), school || null)
    .input("courseYear", sql.NVarChar(100), courseYear || null)
    .input("primaryGame", sql.NVarChar(255), primaryGame || null).query(`
      UPDATE dbo.USER_PROFILE
      SET
        STUDENT_ID = @studentId,
        FIRST_NAME = @firstName,
        LAST_NAME = @lastName,
        DATE_OF_BIRTH = TRY_CONVERT(date, @dateOfBirth, 23),
        IN_GAME_NAME = @displayName,
        EMAIL = @email,
        PHONE_NUMBER = @phoneNumber,
        SCHOOL = @school,
        COURSE_YEAR = @courseYear,
        PRIMARY_GAME = @primaryGame
      OUTPUT
        INSERTED.USERID AS userId,
        INSERTED.STUDENT_ID AS studentId,
        INSERTED.FIRST_NAME AS firstName,
        INSERTED.LAST_NAME AS lastName,
        CONVERT(varchar(10), INSERTED.DATE_OF_BIRTH, 23) AS dateOfBirth,
        INSERTED.IN_GAME_NAME AS displayName,
        INSERTED.EMAIL AS email,
        INSERTED.PHONE_NUMBER AS phoneNumber,
        INSERTED.SCHOOL AS school,
        INSERTED.COURSE_YEAR AS courseYear,
        INSERTED.PRIMARY_GAME AS primaryGame
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

module.exports = {
  findByUserId,
  searchProfiles,
  createProfile,
  updateProfile,
};
