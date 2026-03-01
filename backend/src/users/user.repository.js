const { sql, pool, poolConnect } = require("../config/db");

async function createUser({ username, passwordHash }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("username", sql.NVarChar(50), username)
    .input("passwordHash", sql.NVarChar(sql.MAX), passwordHash)
    .input("role", sql.NVarChar(50), "user").query(`
        INSERT INTO dbo.USERS (USERNAME, PASSWORD_HASH, USER_ROLE)
        OUTPUT INSERTED.USERID
        VALUES @username, @passwordHash, @role
      `);
  return result.recordset[0];
}

async function findByUsername({  })
