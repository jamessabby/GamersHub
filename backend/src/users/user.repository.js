const { sql, pool, poolConnect } = require("../config/db.auth");

async function createUser({ username, passwordHash, mfaSecret }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("username", sql.NVarChar(50), username)
    .input("passwordHash", sql.NVarChar(sql.MAX), passwordHash)
    .input("mfaSecret", sql.NVarChar(50), mfaSecret)
    .input("role", sql.NVarChar(50), "user").query(`
        INSERT INTO dbo.USERS (USERNAME, PASSWORD_HASH, MFA_SECRET, USER_ROLE)
        OUTPUT INSERTED.USERID
        VALUES (@username, @passwordHash, @mfaSecret, @role)
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

module.exports = {
  createUser,
  findByUsername,
};
