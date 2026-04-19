const { sql, pool, poolConnect } = require("../config/db.auth");

async function createAuditLog({
  actorUserId = null,
  actorRole = null,
  actionType,
  entityType,
  entityId = null,
  details = null,
}) {
  await poolConnect;

  const result = await pool
    .request()
    .input("actorUserId", sql.Int, actorUserId)
    .input("actorRole", sql.NVarChar(50), actorRole || null)
    .input("actionType", sql.NVarChar(100), actionType)
    .input("entityType", sql.NVarChar(100), entityType)
    .input("entityId", sql.NVarChar(100), entityId == null ? null : String(entityId))
    .input("detailsJson", sql.NVarChar(sql.MAX), details ? JSON.stringify(details) : null).query(`
      INSERT INTO dbo.AUDIT_LOG (
        ACTOR_USER_ID,
        ACTOR_ROLE,
        ACTION_TYPE,
        ENTITY_TYPE,
        ENTITY_ID,
        DETAILS_JSON,
        CREATED_AT
      )
      OUTPUT
        INSERTED.AUDIT_ID AS auditId,
        INSERTED.ACTOR_USER_ID AS actorUserId,
        INSERTED.ACTOR_ROLE AS actorRole,
        INSERTED.ACTION_TYPE AS actionType,
        INSERTED.ENTITY_TYPE AS entityType,
        INSERTED.ENTITY_ID AS entityId,
        INSERTED.DETAILS_JSON AS detailsJson,
        INSERTED.CREATED_AT AS createdAt
      VALUES (
        @actorUserId,
        @actorRole,
        @actionType,
        @entityType,
        @entityId,
        @detailsJson,
        SYSDATETIME()
      )
    `);

  return mapAuditRow(result.recordset[0] || null);
}

async function listAuditLogs({ actorUserId, actionType, from, to, page = 1, pageSize = 25 } = {}) {
  await poolConnect;

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 25;
  const offset = (safePage - 1) * safePageSize;

  const result = await pool
    .request()
    .input("actorUserId", sql.Int, actorUserId || null)
    .input("actionType", sql.NVarChar(100), actionType || null)
    .input("from", sql.DateTime2, from || null)
    .input("to", sql.DateTime2, to || null)
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, safePageSize).query(`
      WITH filtered AS (
        SELECT
          AUDIT_ID AS auditId,
          ACTOR_USER_ID AS actorUserId,
          ACTOR_ROLE AS actorRole,
          ACTION_TYPE AS actionType,
          ENTITY_TYPE AS entityType,
          ENTITY_ID AS entityId,
          DETAILS_JSON AS detailsJson,
          CREATED_AT AS createdAt
        FROM dbo.AUDIT_LOG
        WHERE (@actorUserId IS NULL OR ACTOR_USER_ID = @actorUserId)
          AND (@actionType IS NULL OR ACTION_TYPE = @actionType)
          AND (@from IS NULL OR CREATED_AT >= @from)
          AND (@to IS NULL OR CREATED_AT < DATEADD(day, 1, @to))
      )
      SELECT *
      FROM filtered
      ORDER BY createdAt DESC, auditId DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

      SELECT COUNT(*) AS total
      FROM dbo.AUDIT_LOG
      WHERE (@actorUserId IS NULL OR ACTOR_USER_ID = @actorUserId)
        AND (@actionType IS NULL OR ACTION_TYPE = @actionType)
        AND (@from IS NULL OR CREATED_AT >= @from)
        AND (@to IS NULL OR CREATED_AT < DATEADD(day, 1, @to));
    `);

  return {
    items: (result.recordsets[0] || []).map(mapAuditRow),
    total: Number(result.recordsets[1]?.[0]?.total) || 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

function mapAuditRow(row) {
  if (!row) {
    return null;
  }

  let details = null;
  try {
    details = row.detailsJson ? JSON.parse(row.detailsJson) : null;
  } catch {
    details = null;
  }

  return {
    auditId: row.auditId,
    actorUserId: row.actorUserId,
    actorRole: row.actorRole || "",
    actionType: row.actionType || "",
    entityType: row.entityType || "",
    entityId: row.entityId || "",
    details,
    createdAt: row.createdAt || null,
  };
}

module.exports = {
  createAuditLog,
  listAuditLogs,
};
