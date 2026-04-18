const { sql, pool, poolConnect } = require("../config/db.feed");

async function createNotification({
  userId,
  notificationType,
  title,
  body,
  linkUrl,
}) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("notificationType", sql.NVarChar(50), notificationType)
    .input("title", sql.NVarChar(150), title)
    .input("body", sql.NVarChar(500), body || null)
    .input("linkUrl", sql.NVarChar(1000), linkUrl || null).query(`
      INSERT INTO dbo.NOTIFICATION (
        USER_ID,
        NOTIFICATION_TYPE,
        TITLE,
        BODY,
        LINK_URL
      )
      OUTPUT
        INSERTED.NOTIFICATION_ID AS notificationId,
        INSERTED.USER_ID AS userId,
        INSERTED.NOTIFICATION_TYPE AS notificationType,
        INSERTED.TITLE AS title,
        INSERTED.BODY AS body,
        INSERTED.LINK_URL AS linkUrl,
        INSERTED.IS_READ AS isRead,
        INSERTED.CREATED_AT AS createdAt,
        INSERTED.READ_AT AS readAt
      VALUES (
        @userId,
        @notificationType,
        @title,
        @body,
        @linkUrl
      )
    `);

  return result.recordset[0] || null;
}

async function listNotificationsByUserId(userId) {
  await poolConnect;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    SELECT
      NOTIFICATION_ID AS notificationId,
      USER_ID AS userId,
      NOTIFICATION_TYPE AS notificationType,
      TITLE AS title,
      BODY AS body,
      LINK_URL AS linkUrl,
      IS_READ AS isRead,
      CREATED_AT AS createdAt,
      READ_AT AS readAt
    FROM dbo.NOTIFICATION
    WHERE USER_ID = @userId
    ORDER BY CREATED_AT DESC, NOTIFICATION_ID DESC
  `);

  return result.recordset;
}

async function markNotificationRead(userId, notificationId) {
  await poolConnect;

  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("notificationId", sql.Int, notificationId).query(`
      UPDATE dbo.NOTIFICATION
      SET
        IS_READ = 1,
        READ_AT = COALESCE(READ_AT, SYSDATETIME())
      OUTPUT
        INSERTED.NOTIFICATION_ID AS notificationId,
        INSERTED.USER_ID AS userId,
        INSERTED.NOTIFICATION_TYPE AS notificationType,
        INSERTED.TITLE AS title,
        INSERTED.BODY AS body,
        INSERTED.LINK_URL AS linkUrl,
        INSERTED.IS_READ AS isRead,
        INSERTED.CREATED_AT AS createdAt,
        INSERTED.READ_AT AS readAt
      WHERE USER_ID = @userId
        AND NOTIFICATION_ID = @notificationId
    `);

  return result.recordset[0] || null;
}

async function markAllNotificationsRead(userId) {
  await poolConnect;

  const result = await pool.request().input("userId", sql.Int, userId).query(`
    UPDATE dbo.NOTIFICATION
    SET
      IS_READ = 1,
      READ_AT = COALESCE(READ_AT, SYSDATETIME())
    WHERE USER_ID = @userId
      AND IS_READ = 0
  `);

  return result.rowsAffected[0] || 0;
}

module.exports = {
  createNotification,
  listNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
};
