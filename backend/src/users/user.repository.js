const { sql, pool, poolConnect } = require("../config/db.auth");

async function createUser({ username, email, passwordHash, mfaSecret }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("username", sql.NVarChar(50), username)
    .input("email", sql.NVarChar(255), email)
    .input("passwordHash", sql.NVarChar(sql.MAX), passwordHash)
    .input("mfaSecret", sql.NVarChar(50), mfaSecret)
    .input("role", sql.NVarChar(50), "user").query(`
        INSERT INTO dbo.USERS (USERNAME, EMAIL, PASSWORD_HASH, MFA_SECRET, USER_ROLE)
        OUTPUT INSERTED.USERID
        VALUES (@username, @email, @passwordHash, @mfaSecret, @role)
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
        PASSWORD_HASH AS passwordHash,
        USER_ROLE AS userRole
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
        USER_ROLE AS userRole
      FROM dbo.USERS
      WHERE EMAIL = @email
    `);
  return result.recordset[0];
}

module.exports = {
  createUser,
  findByUsername,
  findByEmail,
};
