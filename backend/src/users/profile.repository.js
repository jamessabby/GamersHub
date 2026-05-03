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

  const normalizedQuery = String(query || "").trim();
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 12) : 8;
  const escapedQuery = escapeLikePattern(normalizedQuery);
  const exactTerm = normalizedQuery;
  const prefixTerm = `${escapedQuery}%`;
  const searchTerm = `%${escapedQuery}%`;
  const result = await pool
    .request()
    .input("excludeUserId", sql.Int, excludeUserId)
    .input("limit", sql.Int, safeLimit)
    .input("exactTerm", sql.NVarChar(255), exactTerm)
    .input("prefixTerm", sql.NVarChar(255), prefixTerm)
    .input("searchTerm", sql.NVarChar(255), searchTerm).query(`
      SELECT TOP (@limit)
        p.USERID AS userId,
        p.STUDENT_ID AS studentId,
        p.FIRST_NAME AS firstName,
        p.LAST_NAME AS lastName,
        CONVERT(varchar(10), p.DATE_OF_BIRTH, 23) AS dateOfBirth,
        p.IN_GAME_NAME AS displayName,
        p.EMAIL AS email,
        p.PHONE_NUMBER AS phoneNumber,
        p.SCHOOL AS school,
        p.COURSE_YEAR AS courseYear,
        p.PRIMARY_GAME AS primaryGame,
        u.USERNAME AS username,
        CASE
          WHEN u.USERNAME = @exactTerm THEN 'username'
          WHEN p.IN_GAME_NAME = @exactTerm THEN 'displayName'
          WHEN u.USERNAME LIKE @prefixTerm ESCAPE '~' THEN 'username'
          WHEN p.IN_GAME_NAME LIKE @prefixTerm ESCAPE '~' THEN 'displayName'
          WHEN u.USERNAME LIKE @searchTerm ESCAPE '~' THEN 'username'
          WHEN p.IN_GAME_NAME LIKE @searchTerm ESCAPE '~' THEN 'displayName'
          WHEN p.FIRST_NAME LIKE @searchTerm ESCAPE '~' THEN 'firstName'
          WHEN p.LAST_NAME LIKE @searchTerm ESCAPE '~' THEN 'lastName'
          WHEN p.SCHOOL LIKE @searchTerm ESCAPE '~' THEN 'school'
          WHEN p.PRIMARY_GAME LIKE @searchTerm ESCAPE '~' THEN 'primaryGame'
          ELSE ''
        END AS matchField,
        CASE
          WHEN u.USERNAME = @exactTerm THEN u.USERNAME
          WHEN p.IN_GAME_NAME = @exactTerm THEN p.IN_GAME_NAME
          WHEN u.USERNAME LIKE @prefixTerm ESCAPE '~' THEN u.USERNAME
          WHEN p.IN_GAME_NAME LIKE @prefixTerm ESCAPE '~' THEN p.IN_GAME_NAME
          WHEN u.USERNAME LIKE @searchTerm ESCAPE '~' THEN u.USERNAME
          WHEN p.IN_GAME_NAME LIKE @searchTerm ESCAPE '~' THEN p.IN_GAME_NAME
          WHEN p.FIRST_NAME LIKE @searchTerm ESCAPE '~' THEN p.FIRST_NAME
          WHEN p.LAST_NAME LIKE @searchTerm ESCAPE '~' THEN p.LAST_NAME
          WHEN p.SCHOOL LIKE @searchTerm ESCAPE '~' THEN p.SCHOOL
          WHEN p.PRIMARY_GAME LIKE @searchTerm ESCAPE '~' THEN p.PRIMARY_GAME
          ELSE ''
        END AS matchValue
      FROM dbo.USER_PROFILE p
      INNER JOIN GAMERSHUB_AUTH.dbo.USERS u
        ON u.USERID = p.USERID
      WHERE p.USERID <> @excludeUserId
        AND u.IS_ACTIVE = 1
        AND (
          u.USERNAME LIKE @searchTerm ESCAPE '~'
          OR p.IN_GAME_NAME LIKE @searchTerm ESCAPE '~'
          OR p.FIRST_NAME LIKE @searchTerm ESCAPE '~'
          OR p.LAST_NAME LIKE @searchTerm ESCAPE '~'
          OR p.SCHOOL LIKE @searchTerm ESCAPE '~'
          OR p.PRIMARY_GAME LIKE @searchTerm ESCAPE '~'
        )
      ORDER BY
        CASE
          WHEN u.USERNAME = @exactTerm THEN 0
          WHEN p.IN_GAME_NAME = @exactTerm THEN 1
          WHEN u.USERNAME LIKE @prefixTerm ESCAPE '~' THEN 2
          WHEN p.IN_GAME_NAME LIKE @prefixTerm ESCAPE '~' THEN 3
          WHEN u.USERNAME LIKE @searchTerm ESCAPE '~' THEN 4
          WHEN p.IN_GAME_NAME LIKE @searchTerm ESCAPE '~' THEN 5
          WHEN p.FIRST_NAME LIKE @searchTerm ESCAPE '~' THEN 6
          WHEN p.LAST_NAME LIKE @searchTerm ESCAPE '~' THEN 7
          WHEN p.PRIMARY_GAME LIKE @searchTerm ESCAPE '~' THEN 8
          ELSE 9
        END,
        p.IN_GAME_NAME ASC,
        p.USERID ASC
    `);

  return result.recordset;
}

function escapeLikePattern(value) {
  return String(value || "")
    .replace(/~/g, "~~")
    .replace(/%/g, "~%")
    .replace(/_/g, "~_")
    .replace(/\[/g, "~[");
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
