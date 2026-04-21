(() => {
  const auth = window.GamersHubAuth;
  const page = document.body.dataset.consolePage || "";
  const scope = document.body.dataset.consoleScope || "admin";
  const allowedRoles = scope === "superadmin" ? ["superadmin"] : ["admin", "superadmin"];
  const session = auth?.requireRole?.(allowedRoles, { redirectTo: "auth/login.html" });
  if (!session) {
    return;
  }

  const content = document.getElementById("consoleContent");
  const subtitle = document.getElementById("consoleSubtitle");
  const title = document.getElementById("consoleTitle");
  const userChip = document.getElementById("consoleUserChip");
  const flash = document.getElementById("consoleFlash");

  const PAGE_META = {
    "admin-dashboard": {
      title: "Admin Dashboard",
      subtitle: "Platform health, moderation, and quick access for day-to-day operations.",
    },
    "admin-users": {
      title: "User Directory",
      subtitle: "Browse player accounts and review account-level details.",
    },
    "admin-analytics": {
      title: "Analytics Overview",
      subtitle: "Registration, activity, and engagement metrics for the MVP.",
    },
    "admin-tournaments": {
      title: "Tournaments & Streams",
      subtitle: "Tournament visibility plus stream moderation controls.",
    },
    "superadmin-dashboard": {
      title: "Superadmin Dashboard",
      subtitle: "Security, governance, and reporting at a glance.",
    },
    "superadmin-rbac": {
      title: "RBAC Management",
      subtitle: "Promote users to admin or demote admins back to user.",
    },
    "superadmin-audit": {
      title: "Audit Trail",
      subtitle: "Review authentication, role, and moderation activity.",
    },
    "superadmin-reports": {
      title: "Reports",
      subtitle: "Summary reporting plus CSV exports for presentation and documentation.",
    },
  };

  const scopeNav = {
    admin: [
      ["Dashboard", "dashboard.html", "Summary"],
      ["Users", "users.html", "Directory"],
      ["Analytics", "analytics.html", "Metrics"],
      ["Tournaments", "tournaments.html", "Moderation"],
    ],
    superadmin: [
      ["Dashboard", "dashboard.html", "Overview"],
      ["RBAC", "rbac.html", "Role control"],
      ["Audit", "audit.html", "Logs"],
      ["Reports", "reports.html", "Exports"],
    ],
  };

  initShell();
  void renderPage();

  function initShell() {
    const meta = PAGE_META[page] || { title: "Console", subtitle: "" };
    title.textContent = meta.title;
    subtitle.textContent = meta.subtitle;
    userChip.textContent = `${session.username} • ${session.role}`;
    renderSidebar();

    document.getElementById("consoleLogoutBtn")?.addEventListener("click", async () => {
      try {
        await fetch(`${auth.apiBase}/api/auth/logout`, { method: "POST" });
      } catch {
        // Ignore logout failures and clear the local session anyway.
      }
      auth.clearSession();
      window.location.replace(auth.buildAppUrl("auth/login.html"));
    });
  }

  function renderSidebar() {
    const nav = document.getElementById("consoleNav");
    const items = scopeNav[scope] || [];
    nav.innerHTML = items
      .map(([label, href, helper]) => {
        const isActive = window.location.pathname.endsWith(`/${href}`);
        const prefix = scope === "superadmin" ? "superadmin" : "admin";
        return `
          <a href="${auth.buildAppUrl(`${prefix}/${href}`)}" class="${isActive ? "is-active" : ""}">
            <span>${label}</span>
            <small>${helper}</small>
          </a>
        `;
      })
      .join("");

    document.getElementById("consolePlayerHome").setAttribute("href", auth.buildAppUrl("player/dashboard.html"));
  }

  async function renderPage() {
    switch (page) {
      case "admin-dashboard":
        await renderAdminDashboard();
        break;
      case "admin-users":
        await renderUsersPage(false);
        break;
      case "admin-analytics":
        await renderAnalyticsPage();
        break;
      case "admin-tournaments":
        await renderTournamentsPage();
        break;
      case "superadmin-dashboard":
        await renderSuperadminDashboard();
        break;
      case "superadmin-rbac":
        await renderUsersPage(true);
        break;
      case "superadmin-audit":
        await renderAuditPage();
        break;
      case "superadmin-reports":
        await renderReportsPage();
        break;
      default:
        content.innerHTML = '<div class="console-empty">This page is not configured yet.</div>';
    }
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.message || "Request failed.");
    }

    return payload;
  }

  async function renderAdminDashboard() {
    const [analytics, streams] = await Promise.all([
      fetchJson(`${auth.apiBase}/api/admin/analytics/overview?range=30d`),
      fetchJson(`${auth.apiBase}/api/admin/streams`),
    ]);

    const roleCards = analytics.roleCounts
      .map((item) => `<div class="console-card"><span>${escapeHtml(item.role)}</span><strong>${item.total}</strong></div>`)
      .join("");

    const latestStreams = streams.items
      .slice(0, 5)
      .map((stream) => `
        <tr>
          <td>${escapeHtml(stream.title)}</td>
          <td>${escapeHtml(stream.authorName)}</td>
          <td>${escapeHtml(stream.gameName || "—")}</td>
          <td>${stream.isVisible ? "Visible" : "Hidden"}</td>
        </tr>
      `)
      .join("");

    const totalUsers = analytics.roleCounts.reduce((sum, row) => sum + row.total, 0);

    content.innerHTML = `
      <div class="console-grid cards">
        <div class="console-card"><span>Total users</span><strong>${totalUsers}</strong></div>
        <div class="console-card"><span>Total posts</span><strong>${analytics.totals.posts}</strong></div>
        <div class="console-card"><span>Total streams</span><strong>${analytics.totals.streams}</strong></div>
        <div class="console-card"><span>Total reactions</span><strong>${analytics.totals.reactions}</strong></div>
        <div class="console-card"><span>Total tournaments</span><strong>${analytics.totals.tournaments}</strong></div>
      </div>

      <div class="console-row">
        <section class="console-panel">
          <h2>Users by role</h2>
          <div class="console-grid cards">${roleCards || '<div class="console-empty">No role data found.</div>'}</div>
        </section>
        <section class="console-panel">
          <h2>Quick actions</h2>
          <div class="console-actions">
            <a class="console-btn primary" href="${auth.buildAppUrl("admin/users.html")}">Open user directory</a>
            <a class="console-btn" href="${auth.buildAppUrl("admin/analytics.html")}">View analytics</a>
            <a class="console-btn" href="${auth.buildAppUrl("admin/tournaments.html")}">Open moderation</a>
            ${session.role === "superadmin" ? `<a class="console-btn" href="${auth.buildAppUrl("superadmin/dashboard.html")}">Open superadmin tools</a>` : ""}
          </div>
        </section>
      </div>

      <section class="console-panel" style="margin-top:18px;">
        <h2>Recent stream moderation targets</h2>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead>
              <tr><th>Stream</th><th>Author</th><th>Game</th><th>Status</th></tr>
            </thead>
            <tbody>${latestStreams || '<tr><td colspan="4">No streams found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;
  }

  async function renderUsersPage(allowRoleEdits) {
    const payload = await fetchJson(`${auth.apiBase}/api/admin/users?pageSize=100`);
    const rows = payload.items
      .map((user) => `
        <tr>
          <td>
            <div>${escapeHtml(user.displayName || user.username)}</div>
            <div class="console-kicker">@${escapeHtml(user.username)}</div>
          </td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.school || "—")}</td>
          <td><span class="console-pill ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td>
          <td>${escapeHtml(user.authProvider || "local")}</td>
          <td>${user.mfaEnrolled ? "Enabled" : "Pending"}</td>
          <td>
            ${
              allowRoleEdits
                ? renderRoleActions(user)
                : '<span class="console-kicker">Read-only for admin accounts.</span>'
            }
          </td>
        </tr>
      `)
      .join("");

    content.innerHTML = `
      <section class="console-panel">
        <h2>${allowRoleEdits ? "Role management" : "All users"}</h2>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>School</th>
                <th>Role</th>
                <th>Provider</th>
                <th>MFA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">No users found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    if (allowRoleEdits) {
      bindRoleActions();
    }
  }

  function renderRoleActions(user) {
    if (user.role === "superadmin") {
      return '<span class="console-kicker">Superadmin role is fixed.</span>';
    }

    const nextRole = user.role === "admin" ? "user" : "admin";
    const label = user.role === "admin" ? "Demote to User" : "Promote to Admin";
    return `
      <button class="console-btn primary" data-role-user-id="${user.userId}" data-next-role="${nextRole}">
        ${label}
      </button>
    `;
  }

  function bindRoleActions() {
    content.querySelectorAll("[data-role-user-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const userId = button.dataset.roleUserId;
        const nextRole = button.dataset.nextRole;
        button.disabled = true;
        button.textContent = "Saving...";
        try {
          await fetchJson(`${auth.apiBase}/api/admin/users/${userId}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: nextRole }),
          });
          setFlash(`Updated role to ${nextRole}.`);
          await renderUsersPage(true);
        } catch (error) {
          setFlash(error.message || "Failed to update role.", true);
          button.disabled = false;
          button.textContent = nextRole === "admin" ? "Promote to Admin" : "Demote to User";
        }
      });
    });
  }

  async function renderAnalyticsPage(range = "30d") {
    const analytics = await fetchJson(`${auth.apiBase}/api/admin/analytics/overview?range=${encodeURIComponent(range)}`);

    const totalUsers = analytics.roleCounts.reduce((sum, row) => sum + row.total, 0);
    const totals = [
      ["Total users", totalUsers],
      ["Posts", analytics.totals.posts],
      ["Streams", analytics.totals.streams],
      ["Reactions", analytics.totals.reactions],
      ["Comments", analytics.totals.comments],
      ["Tournaments", analytics.totals.tournaments],
    ]
      .map(([label, total]) => `<div class="console-card"><span>${label}</span><strong>${total}</strong></div>`)
      .join("");

    const roles = analytics.roleCounts
      .map((row) => `<tr><td>${escapeHtml(row.role)}</td><td>${row.total}</td></tr>`)
      .join("");

    const maxReg = Math.max(1, ...analytics.registrations.map((row) => row.total));
    const barRows = analytics.registrations
      .map((row) => `
        <div class="analytics-bar-row">
          <span class="analytics-bar-date">${escapeHtml(row.date)}</span>
          <div class="analytics-bar-track">
            <div class="analytics-bar-fill" style="width:${Math.max(2, Math.round((row.total / maxReg) * 100))}%"></div>
          </div>
          <span class="analytics-bar-value">${row.total}</span>
        </div>
      `)
      .join("");

    const rangeTabs = [
      ["7d", "Last 7 days"],
      ["30d", "Last 30 days"],
      ["90d", "Last 90 days"],
    ]
      .map(([value, label]) => `
        <button class="console-btn${value === range ? " primary" : ""}" data-analytics-range="${value}">${label}</button>
      `)
      .join("");

    content.innerHTML = `
      <div class="console-actions" style="margin-bottom:20px;">${rangeTabs}</div>
      <div class="console-grid cards">${totals}</div>
      <div class="console-row">
        <section class="console-panel">
          <h2>Users by role</h2>
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Role</th><th>Total</th></tr></thead>
              <tbody>${roles || '<tr><td colspan="2">No role data found.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="console-panel">
          <h2>New registrations — last ${analytics.rangeDays} days</h2>
          ${
            analytics.registrations.length
              ? `<div class="analytics-bar-chart">${barRows}</div>`
              : '<div class="console-empty">No registrations in this period.</div>'
          }
        </section>
      </div>
    `;

    content.querySelectorAll("[data-analytics-range]").forEach((button) => {
      button.addEventListener("click", () => void renderAnalyticsPage(button.dataset.analyticsRange));
    });
  }

  async function renderTournamentsPage() {
    const [tournaments, streams] = await Promise.all([
      fetchJson(`${auth.apiBase}/api/tournaments`),
      fetchJson(`${auth.apiBase}/api/admin/streams`),
    ]);

    const tournamentRows = tournaments.items
      .map((tournament) => `
        <tr>
          <td>${escapeHtml(tournament.title)}</td>
          <td>${escapeHtml(tournament.gameName)}</td>
          <td>${escapeHtml(tournament.status)}</td>
          <td>${tournament.teamCount ?? 0}</td>
          <td>${tournament.matchCount ?? 0}</td>
        </tr>
      `)
      .join("");

    const streamRows = streams.items
      .map((stream) => `
        <tr>
          <td>${escapeHtml(stream.title)}</td>
          <td>${escapeHtml(stream.authorName)}</td>
          <td>${escapeHtml(stream.gameName || "—")}</td>
          <td>${stream.isLive ? "Live" : "Offline"}</td>
          <td>${stream.isVisible ? "Visible" : "Hidden"}</td>
          <td>
            <button class="console-btn ${stream.isVisible ? "warn" : "primary"}" data-stream-id="${stream.streamId}" data-next-visible="${stream.isVisible ? "false" : "true"}">
              ${stream.isVisible ? "Hide stream" : "Show stream"}
            </button>
          </td>
        </tr>
      `)
      .join("");

    content.innerHTML = `
      <div class="console-row">
        <section class="console-panel">
          <h2>Tournament overview</h2>
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Title</th><th>Game</th><th>Status</th><th>Teams</th><th>Matches</th></tr></thead>
              <tbody>${tournamentRows || '<tr><td colspan="5">No tournaments found.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="console-panel">
          <h2>Stream moderation</h2>
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Stream</th><th>Author</th><th>Game</th><th>Live</th><th>Visibility</th><th>Action</th></tr></thead>
              <tbody>${streamRows || '<tr><td colspan="6">No streams found.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    content.querySelectorAll("[data-stream-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const streamId = button.dataset.streamId;
        const isVisible = button.dataset.nextVisible === "true";
        button.disabled = true;
        button.textContent = "Saving...";
        try {
          await fetchJson(`${auth.apiBase}/api/admin/streams/${streamId}/moderation`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVisible }),
          });
          setFlash(`Stream visibility updated to ${isVisible ? "visible" : "hidden"}.`);
          await renderTournamentsPage();
        } catch (error) {
          setFlash(error.message || "Failed to update stream visibility.", true);
          button.disabled = false;
        }
      });
    });
  }

  async function renderSuperadminDashboard() {
    const [reports, audit] = await Promise.all([
      fetchJson(`${auth.apiBase}/api/superadmin/reports/summary?range=30d`),
      fetchJson(`${auth.apiBase}/api/superadmin/audit?pageSize=10`),
    ]);

    const cards = [
      ["Users", reports.summary.users],
      ["Posts", reports.summary.posts],
      ["Streams", reports.summary.streams],
      ["Reactions", reports.summary.reactions],
      ["Tournaments", reports.summary.tournaments],
    ]
      .map(([label, total]) => `<div class="console-card"><span>${label}</span><strong>${total}</strong></div>`)
      .join("");

    const recentAudit = audit.items
      .map((item) => `
        <tr>
          <td>${escapeHtml(item.actionType)}</td>
          <td>${escapeHtml(item.actorRole || "system")}</td>
          <td>${escapeHtml(item.entityType)}</td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `)
      .join("");

    content.innerHTML = `
      <div class="console-grid cards">${cards}</div>
      <div class="console-row">
        <section class="console-panel">
          <h2>Quick actions</h2>
          <div class="console-actions">
            <a class="console-btn primary" href="${auth.buildAppUrl("superadmin/rbac.html")}">Open RBAC</a>
            <a class="console-btn" href="${auth.buildAppUrl("superadmin/audit.html")}">Review audit log</a>
            <a class="console-btn" href="${auth.buildAppUrl("superadmin/reports.html")}">Open reports</a>
          </div>
        </section>
        <section class="console-panel">
          <h2>Latest audit activity</h2>
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Action</th><th>Actor role</th><th>Entity</th><th>When</th></tr></thead>
              <tbody>${recentAudit || '<tr><td colspan="4">No audit activity found.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  async function renderAuditPage(filters = {}) {
    const query = new URLSearchParams();
    if (filters.actorUserId) query.set("actorUserId", filters.actorUserId);
    if (filters.actionType) query.set("actionType", filters.actionType);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    query.set("pageSize", "100");

    const payload = await fetchJson(`${auth.apiBase}/api/superadmin/audit?${query.toString()}`);
    const rows = payload.items
      .map((item) => `
        <tr>
          <td>${escapeHtml(item.actionType)}</td>
          <td>${item.actorUserId || "—"}</td>
          <td>${escapeHtml(item.actorRole || "system")}</td>
          <td>${escapeHtml(item.entityType)}</td>
          <td>${escapeHtml(item.entityId || "—")}</td>
          <td>${formatDate(item.createdAt)}</td>
        </tr>
      `)
      .join("");

    content.innerHTML = `
      <section class="console-panel">
        <h2>Audit filters</h2>
        <form class="console-form" id="auditFilterForm">
          <input class="console-input" name="actorUserId" placeholder="Actor user ID" value="${escapeAttribute(filters.actorUserId || "")}" />
          <input class="console-input" name="actionType" placeholder="Action type" value="${escapeAttribute(filters.actionType || "")}" />
          <input class="console-input" type="date" name="from" value="${escapeAttribute(filters.from || "")}" />
          <input class="console-input" type="date" name="to" value="${escapeAttribute(filters.to || "")}" />
          <button class="console-btn primary" type="submit">Apply filters</button>
        </form>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead><tr><th>Action</th><th>Actor ID</th><th>Role</th><th>Entity</th><th>Entity ID</th><th>Created</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6">No audit logs found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById("auditFilterForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      await renderAuditPage({
        actorUserId: formData.get("actorUserId") || "",
        actionType: formData.get("actionType") || "",
        from: formData.get("from") || "",
        to: formData.get("to") || "",
      });
    });
  }

  async function renderReportsPage() {
    const payload = await fetchJson(`${auth.apiBase}/api/superadmin/reports/summary?range=30d`);
    const cards = [
      ["Users", payload.summary.users],
      ["Posts", payload.summary.posts],
      ["Streams", payload.summary.streams],
      ["Reactions", payload.summary.reactions],
      ["Comments", payload.summary.comments],
      ["Tournaments", payload.summary.tournaments],
    ]
      .map(([label, total]) => `<div class="console-card"><span>${label}</span><strong>${total}</strong></div>`)
      .join("");

    content.innerHTML = `
      <div class="console-grid cards">${cards}</div>
      <section class="console-panel">
        <h2>Export reports</h2>
        <div class="console-actions">
          <button class="console-btn primary" data-export-type="activity">Export activity CSV</button>
          <button class="console-btn" data-export-type="users">Export users CSV</button>
          <button class="console-btn" data-export-type="audit">Export audit CSV</button>
        </div>
      </section>
      <section class="console-panel" style="margin-top:18px;">
        <h2>Registration trend</h2>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead><tr><th>Date</th><th>Registrations</th></tr></thead>
            <tbody>
              ${
                payload.analytics.registrations.map((item) => `<tr><td>${escapeHtml(item.date)}</td><td>${item.total}</td></tr>`).join("")
                || '<tr><td colspan="2">No registration data found.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>
    `;

    content.querySelectorAll("[data-export-type]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        const originalLabel = button.textContent;
        button.textContent = "Exporting...";
        try {
          const response = await fetch(`${auth.apiBase}/api/superadmin/reports/export?type=${encodeURIComponent(button.dataset.exportType)}`);
          if (!response.ok) {
            throw new Error("Failed to export report.");
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${button.dataset.exportType}-report.csv`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          setFlash(`Exported ${button.dataset.exportType} report.`);
        } catch (error) {
          setFlash(error.message || "Export failed.", true);
        } finally {
          button.disabled = false;
          button.textContent = originalLabel;
        }
      });
    });
  }

  function setFlash(message, isError = false) {
    flash.textContent = message;
    flash.classList.remove("hidden");
    flash.classList.toggle("is-error", Boolean(isError));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
})();
