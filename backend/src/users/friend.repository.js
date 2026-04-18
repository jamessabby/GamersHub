const { sql, pool, poolConnect } = require("../config/db.user");

async function findRelationship(userIdA, userIdB) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userIdA", sql.Int, userIdA)
    .input("userIdB", sql.Int, userIdB).query(`
      SELECT
        USERA_ID AS userAId,
        USERB_ID AS userBId,
        STATUS AS status
      FROM dbo.FRIENDS
      WHERE (USERA_ID = @userIdA AND USERB_ID = @userIdB)
         OR (USERA_ID = @userIdB AND USERB_ID = @userIdA)
    `);

  return result.recordset[0] || null;
}

async function listRelationshipsForUser(userId) {
  await poolConnect;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      USERA_ID AS userAId,
      USERB_ID AS userBId,
      STATUS AS status
    FROM dbo.FRIENDS
    WHERE USERA_ID = @userId OR USERB_ID = @userId
  `);

  return result.recordset;
}

async function createFriendRequest({ requesterUserId, targetUserId }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("requesterUserId", sql.Int, requesterUserId)
    .input("targetUserId", sql.Int, targetUserId)
    .input("status", sql.NVarChar(50), "pending").query(`
      INSERT INTO dbo.FRIENDS (
        USERA_ID,
        USERB_ID,
        STATUS
      )
      OUTPUT
        INSERTED.USERA_ID AS userAId,
        INSERTED.USERB_ID AS userBId,
        INSERTED.STATUS AS status
      VALUES (
        @requesterUserId,
        @targetUserId,
        @status
      )
    `);

  return result.recordset[0] || null;
}

async function updateRelationshipStatus({ requesterUserId, targetUserId, status }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("requesterUserId", sql.Int, requesterUserId)
    .input("targetUserId", sql.Int, targetUserId)
    .input("status", sql.NVarChar(50), status).query(`
      UPDATE dbo.FRIENDS
      SET STATUS = @status
      OUTPUT
        INSERTED.USERA_ID AS userAId,
        INSERTED.USERB_ID AS userBId,
        INSERTED.STATUS AS status
      WHERE USERA_ID = @requesterUserId
        AND USERB_ID = @targetUserId
    `);

  return result.recordset[0] || null;
}

async function deleteRelationship({ requesterUserId, targetUserId }) {
  await poolConnect;

  const result = await pool
    .request()
    .input("requesterUserId", sql.Int, requesterUserId)
    .input("targetUserId", sql.Int, targetUserId).query(`
      DELETE FROM dbo.FRIENDS
      OUTPUT
        DELETED.USERA_ID AS userAId,
        DELETED.USERB_ID AS userBId,
        DELETED.STATUS AS status
      WHERE USERA_ID = @requesterUserId
        AND USERB_ID = @targetUserId
    `);

  return result.recordset[0] || null;
}

async function deleteAcceptedRelationshipBetweenUsers(userIdA, userIdB) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userIdA", sql.Int, userIdA)
    .input("userIdB", sql.Int, userIdB)
    .input("status", sql.NVarChar(50), "accepted").query(`
      DELETE FROM dbo.FRIENDS
      OUTPUT
        DELETED.USERA_ID AS userAId,
        DELETED.USERB_ID AS userBId,
        DELETED.STATUS AS status
      WHERE STATUS = @status
        AND (
          (USERA_ID = @userIdA AND USERB_ID = @userIdB)
          OR
          (USERA_ID = @userIdB AND USERB_ID = @userIdA)
        )
    `);

  return result.recordset[0] || null;
}

module.exports = {
  findRelationship,
  listRelationshipsForUser,
  createFriendRequest,
  updateRelationshipStatus,
  deleteRelationship,
  deleteAcceptedRelationshipBetweenUsers,
};
