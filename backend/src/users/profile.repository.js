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
      PRIMARY_GAME AS primaryGame
    FROM dbo.USER_PROFILE
    WHERE USERID = @userId
  `);

  return result.recordset[0] || null;
}

async function createProfile({ userId, username, email }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("displayName", sql.NVarChar(100), username)
    .input("email", sql.NVarChar(255), email || null).query(`
      INSERT INTO dbo.USER_PROFILE (
        USERID,
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
        INSERTED.PRIMARY_GAME AS primaryGame
      VALUES (
        @userId,
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
    primaryGame,
  },
) {
  await poolConnect;

  const sqlDateValue = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : null;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("studentId", sql.NVarChar(50), studentId || null)
    .input("firstName", sql.NVarChar(100), firstName || null)
    .input("lastName", sql.NVarChar(100), lastName || null)
    .input("dateOfBirth", sql.Date, sqlDateValue)
    .input("displayName", sql.NVarChar(100), displayName || null)
    .input("email", sql.NVarChar(255), email || null)
    .input("phoneNumber", sql.NVarChar(50), phoneNumber || null)
    .input("school", sql.NVarChar(255), school || null)
    .input("primaryGame", sql.NVarChar(255), primaryGame || null).query(`
      UPDATE dbo.USER_PROFILE
      SET
        STUDENT_ID = @studentId,
        FIRST_NAME = @firstName,
        LAST_NAME = @lastName,
        DATE_OF_BIRTH = @dateOfBirth,
        IN_GAME_NAME = @displayName,
        EMAIL = @email,
        PHONE_NUMBER = @phoneNumber,
        SCHOOL = @school,
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
        INSERTED.PRIMARY_GAME AS primaryGame
      WHERE USERID = @userId
    `);

  return result.recordset[0] || null;
}

module.exports = {
  findByUserId,
  createProfile,
  updateProfile,
};
