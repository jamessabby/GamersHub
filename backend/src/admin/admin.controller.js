const adminService = require("./admin.service");
const auditService = require("../audit/audit.service");

async function listUsers(req, res) {
  try {
    const payload = await adminService.listUsers({
      query: req.query.q,
      role: req.query.role,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load users." });
  }
}

async function updateUserRole(req, res) {
  try {
    const payload = await adminService.updateUserRole({
      actor: req.auth.user,
      targetUserId: req.params.userId,
      role: req.body.role,
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to update role." });
  }
}

async function analyticsOverview(req, res) {
  try {
    const payload = await adminService.getAnalyticsOverview({ range: req.query.range });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load analytics." });
  }
}

async function listStreams(req, res) {
  try {
    const payload = await adminService.listStreamsModeration();
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load streams." });
  }
}

async function moderateStream(req, res) {
  try {
    const payload = await adminService.moderateStream({
      actor: req.auth.user,
      streamId: req.params.streamId,
      isVisible: req.body.isVisible,
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to moderate stream." });
  }
}

async function listAudit(req, res) {
  try {
    const payload = await auditService.listAuditLogs({
      actorUserId: req.query.actorUserId ? Number(req.query.actorUserId) : undefined,
      actionType: req.query.actionType,
      from: req.query.from,
      to: req.query.to,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load audit logs." });
  }
}

async function reportsSummary(req, res) {
  try {
    const payload = await adminService.getReportsSummary({ range: req.query.range });
    res.status(200).json(payload);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to load reports." });
  }
}

async function exportReport(req, res) {
  try {
    const type = String(req.query.type || "activity").toLowerCase();
    let payload;
    if (type === "users") {
      payload = await adminService.listUsers({ page: 1, pageSize: 1000 });
    } else if (type === "audit") {
      payload = await auditService.listAuditLogs({ page: 1, pageSize: 1000 });
    } else {
      payload = await adminService.getReportsSummary({ range: req.query.range });
    }

    const csv = adminService.buildCsvReport(type, payload);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to export report." });
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  analyticsOverview,
  listStreams,
  moderateStream,
  listAudit,
  reportsSummary,
  exportReport,
};
