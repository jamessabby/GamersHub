const auditRepository = require("./audit.repository");

async function logAuditEvent(entry) {
  try {
    return await auditRepository.createAuditLog(entry);
  } catch (error) {
    console.error("Audit logging failed:", error);
    return null;
  }
}

async function listAuditLogs(filters) {
  return auditRepository.listAuditLogs(filters);
}

module.exports = {
  logAuditEvent,
  listAuditLogs,
};
