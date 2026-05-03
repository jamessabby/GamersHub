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
      title: "Tournaments",
      subtitle: "Create and manage esports tournaments.",
    },
    "admin-streams": {
      title: "Stream Moderation",
      subtitle: "Publish and moderate livestreams visible to players.",
    },
    "admin-leaderboard": {
      title: "Leaderboard Editor",
      subtitle: "Manually set win/loss records per team and tournament.",
    },
    "admin-schedule": {
      title: "Match Schedule",
      subtitle: "Create and update match schedule entries for each tournament.",
    },
    "admin-events": {
      title: "Events",
      subtitle: "Create and manage campus events that appear on the player Events page.",
    },
    "admin-registrations": {
      title: "Registration Waitlist",
      subtitle: "Review team registrations, approve or reject, and confirm payments.",
    },
    "admin-profile": {
      title: "My Profile",
      subtitle: "Update your admin account profile and display information.",
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
      ["Dashboard",   "dashboard.html",   "Summary"],
      ["Users",       "users.html",       "Directory"],
      ["Analytics",   "analytics.html",   "Metrics"],
      ["Streams",     "streams.html",     "Moderation"],
      ["Tournaments", "tournaments.html", "Management"],
      ["Leaderboard", "leaderboard.html", "Rankings"],
      ["Schedule",    "schedule.html",    "Matches"],
      ["Events",         "events.html",         "Campus"],
      ["Registrations",  "registrations.html",  "Waitlist"],
      ["Profile",        "profile.html",        "My Account"],
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
    try {
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
        case "admin-streams":
          await renderStreamsPage();
          break;
        case "admin-leaderboard":
          await renderLeaderboardPage();
          break;
        case "admin-schedule":
          await renderSchedulePage();
          break;
        case "admin-events":
          await renderEventsPage();
          break;
        case "admin-registrations":
          await renderRegistrationsPage();
          break;
        case "admin-profile":
          await renderAdminProfilePage();
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
    } catch (error) {
      setFlash(getFriendlyErrorMessage(error, "This console page could not load."), true);
      content.innerHTML = `
        <section class="console-panel">
          <h2>Unable to load this page</h2>
          <div class="console-empty">
            ${escapeHtml(getFriendlyErrorMessage(error, "This console page could not load."))}
          </div>
        </section>
      `;
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
    const [analytics, activity] = await Promise.all([
      fetchJson(`${auth.apiBase}/api/admin/analytics/overview?range=30d`),
      fetchJson(`${auth.apiBase}/api/admin/activity?limit=10`).catch(() => ({ items: [] })),
    ]);

    const totalUsers = analytics.roleCounts.reduce((sum, row) => sum + row.total, 0);

    const metricCards = [
      ["Total Users", totalUsers],
      ["Posts", analytics.totals.posts],
      ["Streams", analytics.totals.streams],
      ["Reactions", analytics.totals.reactions],
      ["Tournaments", analytics.totals.tournaments],
    ]
      .map(([label, val]) => `<div class="console-card"><span>${label}</span><strong>${val}</strong></div>`)
      .join("");

    const roleRows = analytics.roleCounts
      .map((row) => `
        <div class="console-role-row">
          <span class="console-pill ${escapeHtml(row.role)}">${escapeHtml(row.role)}</span>
          <strong>${row.total}</strong>
        </div>
      `)
      .join("");

    const maxGame = Math.max(1, ...(analytics.topGames || []).map((g) => g.total));
    const gameRows = (analytics.topGames || []).length
      ? (analytics.topGames || []).map((g) => `
          <div class="analytics-bar-row">
            <span class="analytics-bar-date">${escapeHtml(g.game)}</span>
            <div class="analytics-bar-track">
              <div class="analytics-bar-fill" style="width:${Math.max(4, Math.round((g.total / maxGame) * 100))}%"></div>
            </div>
            <span class="analytics-bar-value">${g.total}</span>
          </div>
        `).join("")
      : '<div class="console-empty" style="font-size:0.85rem;">No game data yet.</div>';

    const activityItems = (activity.items || []).length
      ? (activity.items || []).map((item) => `
          <div class="console-activity-item">
            <div class="console-activity-avatar">${escapeHtml(item.actorRole ? item.actorRole[0].toUpperCase() : "?")}</div>
            <div class="console-activity-body">
              <div>
                <span class="console-activity-user">User #${item.actorUserId || "—"}</span>
                <span class="console-activity-desc">${escapeHtml(formatActionType(item.actionType))}</span>
              </div>
              <span class="console-activity-time">${formatDate(item.createdAt)}</span>
            </div>
          </div>
        `).join("")
      : '<div class="console-empty">No recent activity.</div>';

    content.innerHTML = `
      <div class="console-grid cards">${metricCards}</div>

      <div class="console-row" style="margin-top:0;">
        <section class="console-panel">
          <h2>Recent Activity</h2>
          <div class="console-activity-list">${activityItems}</div>
          <div style="margin-top:12px;">
            <a class="console-btn" href="${auth.buildAppUrl("admin/users.html")}">Open user directory →</a>
          </div>
        </section>
        <div style="display:grid;gap:18px;">
          <section class="console-panel">
            <h2>Users by role</h2>
            <div class="console-role-list">${roleRows || '<div class="console-empty">No data.</div>'}</div>
          </section>
          <section class="console-panel">
            <h2>Top games played</h2>
            <div class="analytics-bar-chart">${gameRows}</div>
          </section>
          <section class="console-panel">
            <h2>Quick actions</h2>
            <div class="console-actions">
              <a class="console-btn primary" href="${auth.buildAppUrl("admin/analytics.html")}">Analytics</a>
              <a class="console-btn" href="${auth.buildAppUrl("admin/tournaments.html")}">Moderation</a>
              ${session.role === "superadmin" ? `<a class="console-btn" href="${auth.buildAppUrl("superadmin/dashboard.html")}">Superadmin</a>` : ""}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  async function renderUsersPage(allowRoleEdits, searchQuery = "") {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (searchQuery) qs.set("q", searchQuery);
    const payload = await fetchJson(`${auth.apiBase}/api/admin/users?${qs.toString()}`);

    const rows = payload.items
      .map((user) => `
        <tr>
          <td>
            <div class="console-user-cell">
              <div class="console-user-avatar">${escapeHtml((user.displayName || user.username || "?")[0].toUpperCase())}</div>
              <div>
                <div>${escapeHtml(user.displayName || user.username)}</div>
                <div class="console-kicker">@${escapeHtml(user.username)}</div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.school || "—")}</td>
          <td><span class="console-pill ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td>
          <td><span class="console-kicker">${escapeHtml(user.authProvider || "local")}</span></td>
          <td><span class="console-kicker">${user.mfaEnrolled ? "✓ Enabled" : "Pending"}</span></td>
          <td>
            ${
              allowRoleEdits
                ? renderRoleActions(user)
                : '<span class="console-kicker">View only</span>'
            }
          </td>
        </tr>
      `)
      .join("");

    content.innerHTML = `
      <section class="console-panel">
        <div class="console-panel-header">
          <h2>${allowRoleEdits ? "Role management" : "User directory"} <span class="console-kicker">${payload.total} total</span></h2>
          <input
            class="console-input console-search-input"
            id="userSearchInput"
            type="search"
            placeholder="Search by username or email…"
            value="${escapeAttribute(searchQuery)}"
          />
        </div>
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

    let debounceTimer = null;
    const searchInput = document.getElementById("userSearchInput");
    searchInput?.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void renderUsersPage(allowRoleEdits, searchInput.value.trim());
      }, 350);
    });
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
    const tournaments = await fetchJson(`${auth.apiBase}/api/tournaments`).catch(() => ({ items: [], total: 0 }));

    const tournamentRows = tournaments.items
      .map((tournament) => {
        const statusColor = (() => {
          const s = String(tournament.status || "").toLowerCase();
          if (s.includes("active") || s.includes("live")) return "color:#4ade80;";
          if (s.includes("open") || s.includes("register")) return "color:#60a5fa;";
          if (s.includes("complet")) return "color:#94a3b8;";
          return "color:#f59e0b;";
        })();
        return `
        <tr>
          <td>${escapeHtml(tournament.title)}</td>
          <td>${escapeHtml(tournament.gameName || "—")}</td>
          <td><span style="${statusColor}">${escapeHtml(tournament.status)}</span></td>
          <td>${tournament.teamCount ?? 0}</td>
          <td>${tournament.matchCount ?? 0}</td>
        </tr>
      `;
      })
      .join("");


    content.innerHTML = `
      <section class="console-panel" style="margin-bottom:18px;">
        <div class="console-panel-header">
          <h2>Create Tournament</h2>
          <button class="console-btn" id="toggleTournamentForm">Show form</button>
        </div>
        <form class="console-form" id="createTournamentForm" style="display:none;margin-top:12px;">
          <input
            class="console-input"
            name="title"
            placeholder="Tournament title *"
            required
            style="flex:2 1 280px;"
          />
          <select class="console-input" name="gameName" style="flex:1 1 180px;">
            <option value="">Game (optional)</option>
            <option value="Valorant">Valorant</option>
            <option value="Mobile Legends: Bang Bang">Mobile Legends: Bang Bang</option>
            <option value="Call of Duty: Mobile">Call of Duty: Mobile</option>
            <option value="PUBG Mobile">PUBG Mobile</option>
            <option value="League of Legends">League of Legends</option>
            <option value="Dota 2">Dota 2</option>
            <option value="Apex Legends">Apex Legends</option>
            <option value="Fortnite">Fortnite</option>
            <option value="Minecraft">Minecraft</option>
            <option value="Other">Other</option>
          </select>
          <select class="console-input" name="status" style="flex:1 1 180px;">
            <option value="Pending">Pending</option>
            <option value="Open">Open / Registration</option>
            <option value="Active">Active / Live</option>
            <option value="Completed">Completed</option>
          </select>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 160px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Start date</label>
            <input class="console-input" type="date" name="startDate" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 160px;">
            <label style="color:#94a3b8;font-size:0.82rem;">End date</label>
            <input class="console-input" type="date" name="endDate" />
          </div>
          <div id="teamsList" style="width:100%;display:flex;flex-direction:column;gap:8px;">
            <span style="color:#94a3b8;font-size:0.85rem;">Participating teams</span>
          </div>
          <button type="button" class="console-btn" id="addTeamBtn">+ Add Team</button>
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;width:100%;">
            <input type="checkbox" name="isActive" checked style="width:16px;height:16px;" />
            Mark as active
          </label>
          <button class="console-btn primary" type="submit" id="createTournamentBtn">Create Tournament</button>
        </form>
      </section>

      <section class="console-panel">
        <h2>Tournament overview <span class="console-kicker">${tournaments.items.length} total</span></h2>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead><tr><th>Title</th><th>Game</th><th>Status</th><th>Teams</th><th>Matches</th></tr></thead>
            <tbody>${tournamentRows || '<tr><td colspan="5" style="color:#64748b;">No tournaments yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <div class="console-panel" style="margin-top:18px;padding:14px 18px;">
        <p style="margin:0;color:#94a3b8;font-size:0.88rem;">
          Manage streams → <a href="${auth.buildAppUrl("admin/streams.html")}" style="color:#60a5fa;">Streams</a> &nbsp;·&nbsp;
          Edit leaderboards → <a href="${auth.buildAppUrl("admin/leaderboard.html")}" style="color:#60a5fa;">Leaderboard</a> &nbsp;·&nbsp;
          Manage matches → <a href="${auth.buildAppUrl("admin/schedule.html")}" style="color:#60a5fa;">Schedule</a>
        </p>
      </div>
    `;


    document.getElementById("publishStreamForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("publishStreamBtn");
      const form = event.currentTarget;
      const data = new FormData(form);
      submitBtn.disabled = true;
      submitBtn.textContent = "Publishing...";
      try {
        let thumbnailUrl = "";
        const thumbnailFile = data.get("thumbnail");
        if (thumbnailFile && thumbnailFile.size > 0) {
          submitBtn.textContent = "Uploading thumbnail...";
          const uploadData = new FormData();
          uploadData.append("thumbnail", thumbnailFile);
          const uploadResult = await fetchJson(`${auth.apiBase}/api/admin/streams/upload-thumbnail`, {
            method: "POST",
            body: uploadData,
          });
          thumbnailUrl = uploadResult.url ? `${auth.apiBase}${uploadResult.url}` : "";
          submitBtn.textContent = "Publishing...";
        }

        const rawTournamentId = data.get("tournamentId");
        await fetchJson(`${auth.apiBase}/api/admin/streams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            gameName: data.get("gameName") || "",
            playbackUrl: data.get("playbackUrl"),
            thumbnailUrl,
            description: data.get("description") || "",
            tournamentId: rawTournamentId ? Number(rawTournamentId) : null,
            isLive: data.get("isLive") === "on",
            isVisible: data.get("isVisible") === "on",
          }),
        });
        setFlash("Stream published successfully. It is now visible on the player livestreams page.");
        form.reset();
        form.style.display = "none";
        document.getElementById("togglePublishForm").textContent = "Show form";
        await renderTournamentsPage();
      } catch (error) {
        setFlash(error.message || "Failed to publish stream.", true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Publish Stream";
      }
    });

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

    // ── Edit stream ──
    document.getElementById("cancelEditStreamBtn")?.addEventListener("click", () => {
      document.getElementById("editStreamPanel").style.display = "none";
    });

    const editTournSel = document.getElementById("editStreamTournament");
    if (editTournSel && tournaments.items.length) {
      tournaments.items.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.tournamentId;
        opt.textContent = `${t.title} (${t.gameName || "No game"})`;
        editTournSel.appendChild(opt);
      });
    }

    content.querySelectorAll("[data-edit-stream-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const s = button.dataset;
        const panel = document.getElementById("editStreamPanel");
        document.getElementById("editStreamId").value = s.editStreamId;
        document.getElementById("editStreamLabel").textContent = `— Stream #${s.editStreamId}`;
        document.getElementById("editStreamTitle").value = s.editTitle || "";
        document.getElementById("editStreamUrl").value = s.editUrl || "";
        document.getElementById("editStreamThumb").value = s.editThumb || "";
        document.getElementById("editStreamDesc").value = s.editDesc || "";
        document.getElementById("editStreamIsLive").checked = s.editIsLive === "true";
        document.getElementById("editStreamIsVisible").checked = s.editIsVisible === "true";
        const gameEl = document.getElementById("editStreamGame");
        if (gameEl) {
          const match = [...gameEl.options].find((opt) => opt.value === s.editGame);
          gameEl.value = match ? match.value : "";
        }
        const tEl = document.getElementById("editStreamTournament");
        if (tEl) tEl.value = s.editTournamentId || "";
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    document.getElementById("editStreamForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("saveEditStreamBtn");
      const streamId = document.getElementById("editStreamId").value;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
      try {
        const tId = document.getElementById("editStreamTournament").value;
        await fetchJson(`${auth.apiBase}/api/admin/streams/${streamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: document.getElementById("editStreamTitle").value,
            gameName: document.getElementById("editStreamGame").value || "",
            playbackUrl: document.getElementById("editStreamUrl").value,
            thumbnailUrl: document.getElementById("editStreamThumb").value || "",
            description: document.getElementById("editStreamDesc").value || "",
            isLive: document.getElementById("editStreamIsLive").checked,
            isVisible: document.getElementById("editStreamIsVisible").checked,
            tournamentId: tId ? Number(tId) : null,
          }),
        });
        setFlash("Stream updated successfully.");
        document.getElementById("editStreamPanel").style.display = "none";
        await renderTournamentsPage();
      } catch (error) {
        setFlash(error.message || "Failed to update stream.", true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      }
    });

    // ── Leaderboard editor ──
    document.getElementById("toggleLbEditor")?.addEventListener("click", () => {
      const body = document.getElementById("lbEditorBody");
      const btn = document.getElementById("toggleLbEditor");
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "Hide" : "Show";
    });

    document.getElementById("loadLeaderboardBtn")?.addEventListener("click", async () => {
      const tournamentId = document.getElementById("lbEditorTournamentSelect")?.value;
      if (!tournamentId) { setFlash("Select a tournament first.", true); return; }
      const lbContent = document.getElementById("lbEditorContent");
      lbContent.innerHTML = "<p style=\"color:#94a3b8;font-size:0.88rem;\">Loading…</p>";
      try {
        const [teamsResult, entriesResult] = await Promise.all([
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/teams`),
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/leaderboard`).catch(() => ({ items: [] })),
        ]);
        const teams = teamsResult.items || [];
        const entries = entriesResult.items || [];
        const entryMap = new Map(entries.map((e) => [Number(e.teamId), e]));

        if (!teams.length) {
          lbContent.innerHTML = "<p style=\"color:#64748b;font-size:0.88rem;\">No teams registered for this tournament yet.</p>";
          return;
        }

        lbContent.innerHTML = `
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Team</th><th style="width:110px;">Wins</th><th style="width:110px;">Losses</th><th style="width:80px;">Action</th></tr></thead>
              <tbody>
                ${teams.map((team) => {
                  const entry = entryMap.get(Number(team.teamId)) || { wins: 0, losses: 0 };
                  return `<tr>
                    <td>${escapeHtml(team.teamName)}</td>
                    <td><input class="console-input lb-wins-input" type="number" min="0" value="${entry.wins}" style="width:76px;padding:6px;" /></td>
                    <td><input class="console-input lb-losses-input" type="number" min="0" value="${entry.losses}" style="width:76px;padding:6px;" /></td>
                    <td><button class="console-btn primary lb-save-btn" data-team-id="${team.teamId}" data-tournament-id="${tournamentId}">Save</button></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        `;

        lbContent.querySelectorAll(".lb-save-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const row = btn.closest("tr");
            const wins = Math.max(0, Number(row.querySelector(".lb-wins-input")?.value) || 0);
            const losses = Math.max(0, Number(row.querySelector(".lb-losses-input")?.value) || 0);
            btn.disabled = true; btn.textContent = "Saving…";
            try {
              await fetchJson(`${auth.apiBase}/api/admin/tournaments/${btn.dataset.tournamentId}/leaderboard/${btn.dataset.teamId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wins, losses }),
              });
              setFlash("Leaderboard entry saved.");
              btn.textContent = "Saved ✓";
              setTimeout(() => { btn.disabled = false; btn.textContent = "Save"; }, 2000);
            } catch (error) {
              setFlash(error.message || "Failed to save entry.", true);
              btn.disabled = false; btn.textContent = "Save";
            }
          });
        });
      } catch (error) {
        lbContent.innerHTML = `<p style="color:#f87171;font-size:0.88rem;">${escapeHtml(error.message || "Failed to load teams.")}</p>`;
      }
    });

    // ── Schedule editor ──
    document.getElementById("toggleSchEditor")?.addEventListener("click", () => {
      const body = document.getElementById("schEditorBody");
      const btn = document.getElementById("toggleSchEditor");
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "Hide" : "Show";
    });

    document.getElementById("loadScheduleBtn")?.addEventListener("click", async () => {
      const tournamentId = document.getElementById("schEditorTournamentSelect")?.value;
      if (!tournamentId) { setFlash("Select a tournament first.", true); return; }
      const schContent = document.getElementById("schEditorContent");
      schContent.innerHTML = "<p style=\"color:#94a3b8;font-size:0.88rem;\">Loading…</p>";
      try {
        const [scheduleResult, teamsResult] = await Promise.all([
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches`),
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/teams`),
        ]);
        const matches = scheduleResult.items || [];
        const teams = teamsResult.items || [];
        const teamOptions = teams.map((t) => `<option value="${t.teamId}">${escapeHtml(t.teamName)}</option>`).join("");

        let html = "";
        if (matches.length) {
          html += `<div class="console-table-wrap" style="margin-bottom:18px;">
            <table class="console-table">
              <thead><tr><th>Team A</th><th>Score A</th><th>Team B</th><th>Score B</th><th>Date</th><th>Time</th><th>Action</th></tr></thead>
              <tbody>${matches.map((m) => `
                <tr>
                  <td style="font-size:0.85rem;">${escapeHtml(m.teamAName || "")}</td>
                  <td><input class="console-input sch-score-a" type="number" min="0" value="${m.teamAScore ?? ""}" placeholder="—" style="width:66px;padding:5px;" /></td>
                  <td style="font-size:0.85rem;">${escapeHtml(m.teamBName || "")}</td>
                  <td><input class="console-input sch-score-b" type="number" min="0" value="${m.teamBScore ?? ""}" placeholder="—" style="width:66px;padding:5px;" /></td>
                  <td><input class="console-input sch-date" type="date" value="${m.matchDate || ""}" style="width:135px;padding:5px;" /></td>
                  <td><input class="console-input sch-time" type="time" value="${m.matchTime ? m.matchTime.slice(0, 5) : ""}" style="width:105px;padding:5px;" /></td>
                  <td><button class="console-btn primary sch-update-btn" data-match-id="${m.matchId}" data-tournament-id="${tournamentId}">Save</button></td>
                </tr>`).join("")}
              </tbody>
            </table></div>`;
        } else {
          html += "<p style=\"color:#64748b;font-size:0.88rem;margin-bottom:14px;\">No matches scheduled yet.</p>";
        }
        html += `<div class="console-panel-header" style="margin-bottom:8px;"><h2 style="font-size:0.95rem;margin:0;">Add New Match</h2></div>
          <form class="console-form" id="addMatchForm">
            <select class="console-input" name="teamAId" required style="flex:1 1 160px;"><option value="">Team A *</option>${teamOptions}</select>
            <select class="console-input" name="teamBId" required style="flex:1 1 160px;"><option value="">Team B *</option>${teamOptions}</select>
            <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 140px;"><label style="color:#94a3b8;font-size:0.82rem;">Match date</label><input class="console-input" type="date" name="matchDate" /></div>
            <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 120px;"><label style="color:#94a3b8;font-size:0.82rem;">Match time</label><input class="console-input" type="time" name="matchTime" /></div>
            <button class="console-btn primary" type="submit" style="flex:0 0 auto;">Add Match</button>
          </form>`;
        schContent.innerHTML = html;

        schContent.querySelectorAll(".sch-update-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const row = btn.closest("tr");
            const scoreA = row.querySelector(".sch-score-a")?.value;
            const scoreB = row.querySelector(".sch-score-b")?.value;
            const mDate = row.querySelector(".sch-date")?.value || null;
            const mTime = row.querySelector(".sch-time")?.value;
            btn.disabled = true; btn.textContent = "Saving…";
            try {
              await fetchJson(`${auth.apiBase}/api/admin/tournaments/${btn.dataset.tournamentId}/matches/${btn.dataset.matchId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  teamAScore: scoreA !== "" ? Number(scoreA) : null,
                  teamBScore: scoreB !== "" ? Number(scoreB) : null,
                  matchDate: mDate,
                  matchTime: mTime ? `${mTime}:00` : null,
                }),
              });
              setFlash("Match updated.");
              btn.textContent = "Saved ✓";
              setTimeout(() => { btn.disabled = false; btn.textContent = "Save"; }, 2000);
            } catch (error) {
              setFlash(error.message || "Failed to update match.", true);
              btn.disabled = false; btn.textContent = "Save";
            }
          });
        });

        schContent.querySelector("#addMatchForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const submitBtn = form.querySelector("button[type=submit]");
          submitBtn.disabled = true; submitBtn.textContent = "Adding…";
          try {
            const mTime = data.get("matchTime");
            await fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                teamAId: Number(data.get("teamAId")),
                teamBId: Number(data.get("teamBId")),
                matchDate: data.get("matchDate") || null,
                matchTime: mTime ? `${mTime}:00` : null,
              }),
            });
            setFlash("Match added to schedule.");
            form.reset();
            document.getElementById("loadScheduleBtn")?.click();
          } catch (error) {
            setFlash(error.message || "Failed to add match.", true);
            submitBtn.disabled = false; submitBtn.textContent = "Add Match";
          }
        });
      } catch (error) {
        schContent.innerHTML = `<p style="color:#f87171;font-size:0.88rem;">${escapeHtml(error.message || "Failed to load schedule.")}</p>`;
      }
    });

    document.getElementById("toggleTournamentForm")?.addEventListener("click", () => {
      const form = document.getElementById("createTournamentForm");
      const btn = document.getElementById("toggleTournamentForm");
      const isHidden = form.style.display === "none";
      form.style.display = isHidden ? "flex" : "none";
      btn.textContent = isHidden ? "Hide form" : "Show form";
    });

    document.getElementById("addTeamBtn")?.addEventListener("click", () => {
      const teamsList = document.getElementById("teamsList");
      const row = document.createElement("div");
      row.className = "team-row";
      row.style.cssText = "display:flex;gap:8px;align-items:center;";
      row.innerHTML = `
        <input class="console-input" type="text" data-team-name placeholder="Team name *" style="flex:1;" />
        <input class="console-input" type="number" data-team-seed placeholder="Seed (optional)" min="1" style="flex:0 0 140px;" />
        <button type="button" class="console-btn danger" style="flex:0 0 auto;padding:8px 10px;">✕</button>
      `;
      row.querySelector(".console-btn.danger").addEventListener("click", () => row.remove());
      teamsList.appendChild(row);
    });

    document.getElementById("createTournamentForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("createTournamentBtn");
      const form = event.currentTarget;
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating...";
      try {
        const data = new FormData(form);
        const teams = Array.from(form.querySelectorAll(".team-row")).map((row) => {
          const nameInput = row.querySelector("[data-team-name]");
          const seedInput = row.querySelector("[data-team-seed]");
          return {
            teamName: (nameInput?.value || "").trim(),
            seed: seedInput?.value ? Number(seedInput.value) : null,
          };
        }).filter((t) => t.teamName);

        await fetchJson(`${auth.apiBase}/api/admin/tournaments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            gameName: data.get("gameName") || "",
            status: data.get("status") || "Pending",
            startDate: data.get("startDate") || null,
            endDate: data.get("endDate") || null,
            isActive: data.get("isActive") === "on",
            teams,
          }),
        });
        setFlash(`Tournament created successfully. ${teams.length} team(s) registered.`);
        form.reset();
        form.style.display = "none";
        document.getElementById("toggleTournamentForm").textContent = "Show form";
        await renderTournamentsPage();
      } catch (error) {
        setFlash(error.message || "Failed to create tournament.", true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Tournament";
      }
    });
  }

  // ── STREAMS PAGE ──────────────────────────────────────────────────────────
  async function renderStreamsPage() {
    const [tournamentsResult, streamsResult] = await Promise.allSettled([
      fetchJson(`${auth.apiBase}/api/tournaments`),
      fetchJson(`${auth.apiBase}/api/admin/streams`),
    ]);
    const tournaments = tournamentsResult.status === "fulfilled" ? tournamentsResult.value : { items: [] };
    const streams = streamsResult.status === "fulfilled" ? streamsResult.value : { items: [], total: 0 };

    const gameOptions = ["Valorant","Mobile Legends: Bang Bang","Call of Duty: Mobile","PUBG Mobile","League of Legends","Dota 2","Apex Legends","Fortnite","Minecraft","Other"]
      .map((g) => `<option value="${g}">${g}</option>`).join("");

    const streamRows = streams.items.map((stream) => `
      <tr>
        <td>
          ${escapeHtml(stream.title)}
          ${stream.tournamentId ? `<span style="font-size:10px;color:#f59e0b;margin-left:4px;">TRN</span>` : ""}
        </td>
        <td>${escapeHtml(stream.authorName)}</td>
        <td>${escapeHtml(stream.gameName || "—")}</td>
        <td>${stream.isLive ? '<span style="color:#4ade80;">Live</span>' : '<span style="color:#64748b;">Off</span>'}</td>
        <td>${stream.viewerCount}</td>
        <td>${stream.likeCount}</td>
        <td>${stream.isVisible ? "Visible" : '<span style="color:#f87171;">Hidden</span>'}</td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="console-btn ${stream.isLive ? "warn" : "primary"}" data-live-toggle-id="${stream.streamId}" data-next-live="${stream.isLive ? "false" : "true"}">
              ${stream.isLive ? "End Stream" : "Go Live"}
            </button>
            <button class="console-btn"
              data-edit-stream-id="${stream.streamId}"
              data-edit-title="${escapeAttribute(stream.title || "")}"
              data-edit-game="${escapeAttribute(stream.gameName || "")}"
              data-edit-url="${escapeAttribute(stream.playbackUrl || "")}"
              data-edit-thumb="${escapeAttribute(stream.thumbnailUrl || "")}"
              data-edit-desc="${escapeAttribute(stream.description || "")}"
              data-edit-is-live="${stream.isLive}"
              data-edit-is-visible="${stream.isVisible}"
              data-edit-tournament-id="${stream.tournamentId || ""}">Edit</button>
            <button class="console-btn ${stream.isVisible ? "warn" : "primary"}" data-stream-id="${stream.streamId}" data-next-visible="${stream.isVisible ? "false" : "true"}">
              ${stream.isVisible ? "Hide" : "Show"}
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    const tournamentOpts = tournaments.items.map((t) =>
      `<option value="${t.tournamentId}" data-game="${escapeAttribute(t.gameName || "")}">${escapeHtml(t.title)}</option>`
    ).join("");

    content.innerHTML = `
      <section class="console-panel" style="margin-bottom:18px;">
        <div class="console-panel-header">
          <h2>Publish Livestream</h2>
          <button class="console-btn" id="togglePublishForm">Show form</button>
        </div>
        <form class="console-form" id="publishStreamForm" style="display:none;margin-top:12px;">
          <input class="console-input" name="title" placeholder="Stream title *" required style="flex:1 1 240px;" />
          <select class="console-input" name="tournamentId" id="publishTournamentSelect" style="flex:1 1 200px;">
            <option value="">No tournament / General stream</option>
            ${tournamentOpts}
          </select>
          <select class="console-input" name="gameName" id="publishGameSelect" style="flex:1 1 180px;">
            <option value="">Game (optional)</option>${gameOptions}
          </select>
          <input class="console-input" name="playbackUrl" placeholder="YouTube URL or stream link *" required style="flex:2 1 280px;" />
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Thumbnail (optional)</label>
            <input class="console-input" type="file" name="thumbnail" accept="image/*" id="publishThumbnail" style="padding:8px;" />
          </div>
          <input class="console-input" name="description" placeholder="Description (optional)" style="flex:2 1 240px;" />
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" name="isLive" style="width:16px;height:16px;" /> Mark as Live
          </label>
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" name="isVisible" checked style="width:16px;height:16px;" /> Visible to players
          </label>
          <button class="console-btn primary" type="submit" id="publishStreamBtn">Publish Stream</button>
        </form>
      </section>

      <section class="console-panel">
        <div class="console-panel-header">
          <h2>Stream moderation <span class="console-kicker">${streams.total} total</span></h2>
        </div>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead><tr><th>Stream</th><th>Author</th><th>Game</th><th>Live</th><th>Views</th><th>Likes</th><th>Visibility</th><th>Action</th></tr></thead>
            <tbody>${streamRows || '<tr><td colspan="8" style="color:#64748b;">No streams found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="console-panel" id="editStreamPanel" style="margin-top:18px;display:none;">
        <div class="console-panel-header">
          <h2>Edit Stream <span class="console-kicker" id="editStreamLabel"></span></h2>
          <button class="console-btn" id="cancelEditStreamBtn">Cancel</button>
        </div>
        <form class="console-form" id="editStreamForm" style="margin-top:12px;">
          <input type="hidden" id="editStreamId" />
          <input class="console-input" id="editStreamTitle" placeholder="Stream title *" required style="flex:2 1 240px;" />
          <select class="console-input" id="editStreamTournament" style="flex:1 1 200px;">
            <option value="">No tournament / General stream</option>
            ${tournamentOpts}
          </select>
          <select class="console-input" id="editStreamGame" style="flex:1 1 180px;">
            <option value="">Game (optional)</option>${gameOptions}
          </select>
          <input class="console-input" id="editStreamUrl" placeholder="Playback URL *" required style="flex:2 1 280px;" />
          <input class="console-input" id="editStreamThumb" placeholder="Thumbnail URL (optional)" style="flex:1 1 220px;" />
          <input class="console-input" id="editStreamDesc" placeholder="Description (optional)" style="flex:2 1 240px;" />
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" id="editStreamIsLive" style="width:16px;height:16px;" /> Mark as Live
          </label>
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" id="editStreamIsVisible" style="width:16px;height:16px;" /> Visible to players
          </label>
          <button class="console-btn primary" type="submit" id="saveEditStreamBtn">Save Changes</button>
        </form>
      </section>
    `;

    document.getElementById("togglePublishForm")?.addEventListener("click", () => {
      const form = document.getElementById("publishStreamForm");
      const btn = document.getElementById("togglePublishForm");
      const isHidden = form.style.display === "none";
      form.style.display = isHidden ? "flex" : "none";
      btn.textContent = isHidden ? "Hide form" : "Show form";
    });

    const pubTournSel = document.getElementById("publishTournamentSelect");
    const pubGameSel = document.getElementById("publishGameSelect");
    pubTournSel?.addEventListener("change", () => {
      const gameName = pubTournSel.selectedOptions[0]?.dataset.game || "";
      if (gameName && pubGameSel) {
        const match = [...pubGameSel.options].find((o) => o.value.toLowerCase() === gameName.toLowerCase());
        if (match) pubGameSel.value = match.value;
      }
    });

    document.getElementById("publishStreamForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("publishStreamBtn");
      const form = event.currentTarget;
      const data = new FormData(form);
      submitBtn.disabled = true;
      submitBtn.textContent = "Publishing...";
      try {
        let thumbnailUrl = "";
        const thumbnailFile = data.get("thumbnail");
        if (thumbnailFile && thumbnailFile.size > 0) {
          submitBtn.textContent = "Uploading thumbnail...";
          const uploadData = new FormData();
          uploadData.append("thumbnail", thumbnailFile);
          const uploadResult = await fetchJson(`${auth.apiBase}/api/admin/streams/upload-thumbnail`, { method: "POST", body: uploadData });
          thumbnailUrl = uploadResult.url ? `${auth.apiBase}${uploadResult.url}` : "";
          submitBtn.textContent = "Publishing...";
        }
        const rawTournamentId = data.get("tournamentId");
        await fetchJson(`${auth.apiBase}/api/admin/streams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            gameName: data.get("gameName") || "",
            playbackUrl: data.get("playbackUrl"),
            thumbnailUrl,
            description: data.get("description") || "",
            tournamentId: rawTournamentId ? Number(rawTournamentId) : null,
            isLive: data.get("isLive") === "on",
            isVisible: data.get("isVisible") === "on",
          }),
        });
        setFlash("Stream published successfully.");
        form.reset();
        form.style.display = "none";
        document.getElementById("togglePublishForm").textContent = "Show form";
        await renderStreamsPage();
      } catch (error) {
        setFlash(error.message || "Failed to publish stream.", true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Publish Stream";
      }
    });

    content.querySelectorAll("[data-live-toggle-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const streamId = button.dataset.liveToggleId;
        const isLive = button.dataset.nextLive === "true";
        button.disabled = true;
        button.textContent = "Saving...";
        try {
          await fetchJson(`${auth.apiBase}/api/admin/streams/${streamId}/live-status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isLive }),
          });
          setFlash(isLive ? "Stream marked as live." : "Stream ended.");
          await renderStreamsPage();
        } catch (error) {
          setFlash(error.message || "Failed to update stream live status.", true);
          button.disabled = false;
        }
      });
    });

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
          setFlash(`Stream visibility updated.`);
          await renderStreamsPage();
        } catch (error) {
          setFlash(error.message || "Failed to update stream visibility.", true);
          button.disabled = false;
        }
      });
    });

    document.getElementById("cancelEditStreamBtn")?.addEventListener("click", () => {
      document.getElementById("editStreamPanel").style.display = "none";
    });

    content.querySelectorAll("[data-edit-stream-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const s = button.dataset;
        const panel = document.getElementById("editStreamPanel");
        document.getElementById("editStreamId").value = s.editStreamId;
        document.getElementById("editStreamLabel").textContent = `— Stream #${s.editStreamId}`;
        document.getElementById("editStreamTitle").value = s.editTitle || "";
        document.getElementById("editStreamUrl").value = s.editUrl || "";
        document.getElementById("editStreamThumb").value = s.editThumb || "";
        document.getElementById("editStreamDesc").value = s.editDesc || "";
        document.getElementById("editStreamIsLive").checked = s.editIsLive === "true";
        document.getElementById("editStreamIsVisible").checked = s.editIsVisible === "true";
        const gameEl = document.getElementById("editStreamGame");
        if (gameEl) {
          const match = [...gameEl.options].find((opt) => opt.value === s.editGame);
          gameEl.value = match ? match.value : "";
        }
        const tEl = document.getElementById("editStreamTournament");
        if (tEl) tEl.value = s.editTournamentId || "";
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    document.getElementById("editStreamForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("saveEditStreamBtn");
      const streamId = document.getElementById("editStreamId").value;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
      try {
        const tId = document.getElementById("editStreamTournament").value;
        await fetchJson(`${auth.apiBase}/api/admin/streams/${streamId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: document.getElementById("editStreamTitle").value,
            gameName: document.getElementById("editStreamGame").value || "",
            playbackUrl: document.getElementById("editStreamUrl").value,
            thumbnailUrl: document.getElementById("editStreamThumb").value || "",
            description: document.getElementById("editStreamDesc").value || "",
            isLive: document.getElementById("editStreamIsLive").checked,
            isVisible: document.getElementById("editStreamIsVisible").checked,
            tournamentId: tId ? Number(tId) : null,
          }),
        });
        setFlash("Stream updated successfully.");
        document.getElementById("editStreamPanel").style.display = "none";
        await renderStreamsPage();
      } catch (error) {
        setFlash(error.message || "Failed to update stream.", true);
        submitBtn.disabled = false;
        submitBtn.textContent = "Save Changes";
      }
    });
  }

  // ── LEADERBOARD PAGE ───────────────────────────────────────────────────────
  async function renderLeaderboardPage() {
    const tournaments = await fetchJson(`${auth.apiBase}/api/tournaments`).catch(() => ({ items: [] }));

    content.innerHTML = `
      <section class="console-panel">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
          <select class="console-input" id="lbTournamentSelect" style="flex:1 1 280px;">
            <option value="">Select a tournament…</option>
            ${tournaments.items.map((t) => `<option value="${t.tournamentId}">${escapeHtml(t.title)}</option>`).join("")}
          </select>
          <button class="console-btn primary" id="loadLbBtn">Load Leaderboard</button>
        </div>
        <div id="lbContent"><p style="color:#64748b;font-size:0.88rem;">Select a tournament above to manage its leaderboard.</p></div>
      </section>
    `;

    document.getElementById("loadLbBtn")?.addEventListener("click", async () => {
      const tournamentId = document.getElementById("lbTournamentSelect")?.value;
      if (!tournamentId) { setFlash("Select a tournament first.", true); return; }
      const lbContent = document.getElementById("lbContent");
      lbContent.innerHTML = "<p style=\"color:#94a3b8;font-size:0.88rem;\">Loading…</p>";
      try {
        const [teamsResult, entriesResult] = await Promise.all([
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/teams`),
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/leaderboard`).catch(() => ({ items: [] })),
        ]);
        const teams = teamsResult.items || [];
        const entries = entriesResult.items || [];
        const entryMap = new Map(entries.map((e) => [Number(e.teamId), e]));

        if (!teams.length) {
          lbContent.innerHTML = "<p style=\"color:#64748b;font-size:0.88rem;\">No teams registered for this tournament yet.</p>";
          return;
        }

        lbContent.innerHTML = `
          <div class="console-table-wrap">
            <table class="console-table">
              <thead><tr><th>Team</th><th style="width:110px;">Wins</th><th style="width:110px;">Losses</th><th style="width:80px;">Action</th></tr></thead>
              <tbody>
                ${teams.map((team) => {
                  const entry = entryMap.get(Number(team.teamId)) || { wins: 0, losses: 0 };
                  return `<tr>
                    <td>${escapeHtml(team.teamName)}</td>
                    <td><input class="console-input lb-wins-input" type="number" min="0" value="${entry.wins}" style="width:76px;padding:6px;" /></td>
                    <td><input class="console-input lb-losses-input" type="number" min="0" value="${entry.losses}" style="width:76px;padding:6px;" /></td>
                    <td><button class="console-btn primary lb-save-btn" data-team-id="${team.teamId}" data-tournament-id="${tournamentId}">Save</button></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        `;

        lbContent.querySelectorAll(".lb-save-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const row = btn.closest("tr");
            const wins = Math.max(0, Number(row.querySelector(".lb-wins-input")?.value) || 0);
            const losses = Math.max(0, Number(row.querySelector(".lb-losses-input")?.value) || 0);
            btn.disabled = true; btn.textContent = "Saving…";
            try {
              await fetchJson(`${auth.apiBase}/api/admin/tournaments/${btn.dataset.tournamentId}/leaderboard/${btn.dataset.teamId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wins, losses }),
              });
              setFlash("Leaderboard entry saved.");
              btn.textContent = "Saved ✓";
              setTimeout(() => { btn.disabled = false; btn.textContent = "Save"; }, 2000);
            } catch (error) {
              setFlash(error.message || "Failed to save entry.", true);
              btn.disabled = false; btn.textContent = "Save";
            }
          });
        });
      } catch (error) {
        lbContent.innerHTML = `<p style="color:#f87171;font-size:0.88rem;">${escapeHtml(error.message || "Failed to load leaderboard.")}</p>`;
      }
    });
  }

  // ── SCHEDULE PAGE ──────────────────────────────────────────────────────────
  async function renderSchedulePage() { // eslint-disable-line no-unused-vars
    const tournaments = await fetchJson(`${auth.apiBase}/api/tournaments`).catch(() => ({ items: [] }));

    content.innerHTML = `
      <section class="console-panel">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
          <select class="console-input" id="schTournamentSelect" style="flex:1 1 280px;">
            <option value="">Select a tournament…</option>
            ${tournaments.items.map((t) => `<option value="${t.tournamentId}">${escapeHtml(t.title)}</option>`).join("")}
          </select>
          <button class="console-btn primary" id="loadSchBtn">Load Schedule</button>
        </div>
        <div id="schContent"><p style="color:#64748b;font-size:0.88rem;">Select a tournament above to manage its match schedule.</p></div>
      </section>
    `;

    document.getElementById("loadSchBtn")?.addEventListener("click", async () => {
      const tournamentId = document.getElementById("schTournamentSelect")?.value;
      if (!tournamentId) { setFlash("Select a tournament first.", true); return; }
      const schContent = document.getElementById("schContent");
      schContent.innerHTML = "<p style=\"color:#94a3b8;font-size:0.88rem;\">Loading…</p>";
      try {
        const [scheduleResult, teamsResult] = await Promise.all([
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches`),
          fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/teams`),
        ]);
        const matches = scheduleResult.items || [];
        const teams = teamsResult.items || [];
        const teamOptions = teams.map((t) => `<option value="${t.teamId}">${escapeHtml(t.teamName)}</option>`).join("");

        let html = "";
        if (matches.length) {
          html += `<div class="console-table-wrap" style="margin-bottom:18px;">
            <table class="console-table">
              <thead><tr><th>Team A</th><th>Score A</th><th>Team B</th><th>Score B</th><th>Date</th><th>Time</th><th>Actions</th></tr></thead>
              <tbody>${matches.map((m) => `
                <tr>
                  <td style="font-size:0.85rem;">${escapeHtml(m.teamAName || "")}</td>
                  <td><input class="console-input sch-score-a" type="number" min="0" value="${m.teamAScore ?? ""}" placeholder="—" style="width:66px;padding:5px;" /></td>
                  <td style="font-size:0.85rem;">${escapeHtml(m.teamBName || "")}</td>
                  <td><input class="console-input sch-score-b" type="number" min="0" value="${m.teamBScore ?? ""}" placeholder="—" style="width:66px;padding:5px;" /></td>
                  <td><input class="console-input sch-date" type="date" value="${m.matchDate || ""}" style="width:135px;padding:5px;" /></td>
                  <td><input class="console-input sch-time" type="time" value="${m.matchTime ? m.matchTime.slice(0, 5) : ""}" style="width:105px;padding:5px;" /></td>
                  <td>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;">
                      <button class="console-btn primary sch-update-btn" data-match-id="${m.matchId}" data-tournament-id="${tournamentId}">Save</button>
                      <button class="console-btn sch-stats-btn"
                        data-match-id="${m.matchId}"
                        data-team-a-id="${m.teamAId || ""}"
                        data-team-b-id="${m.teamBId || ""}"
                        data-team-a-name="${escapeAttribute(m.teamAName || "Team A")}"
                        data-team-b-name="${escapeAttribute(m.teamBName || "Team B")}">Stats</button>
                    </div>
                  </td>
                </tr>`).join("")}
              </tbody>
            </table></div>
          <div id="matchStatsPanel" style="display:none;margin-bottom:18px;">
            <div class="console-panel">
              <div class="console-panel-header">
                <h2>Match Stats — <span id="matchStatsLabel"></span></h2>
                <button class="console-btn" id="closeMatchStatsBtn">Close</button>
              </div>
              <p style="margin:0 0 12px;color:#94a3b8;font-size:0.84rem;">
                Enter one row per player. Kills, deaths, and assists are saved as separate match-stat records.
              </p>
              <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 2px;margin-bottom:4px;">
                <span style="flex:1 1 130px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Team</span>
                <span style="flex:1 1 150px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Player</span>
                <span style="flex:0 0 78px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Kills</span>
                <span style="flex:0 0 78px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Deaths</span>
                <span style="flex:0 0 78px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Assists</span>
                <span style="flex:0 0 38px;"></span>
              </div>
              <div id="kdaRows" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>
              <details style="margin:10px 0 12px;">
                <summary style="cursor:pointer;color:#a78bfa;font-size:0.84rem;">Other stats</summary>
                <div style="display:flex;gap:6px;flex-wrap:wrap;padding:12px 2px 4px;margin-bottom:4px;">
                  <span style="flex:1 1 130px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Team</span>
                  <span style="flex:1 1 130px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Player (opt.)</span>
                  <span style="flex:1 1 110px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Stat</span>
                  <span style="flex:1 1 80px;font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Value</span>
                  <span style="flex:0 0 38px;"></span>
                </div>
                <div id="customStatsRows" style="display:flex;flex-direction:column;gap:8px;"></div>
                <button class="console-btn" id="addStatRowBtn" type="button" style="margin-top:8px;">+ Add Custom Stat</button>
              </details>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="console-btn" id="addKdaRowBtn" type="button">+ Add Player Row</button>
                <button class="console-btn primary" id="saveMatchStatsBtn">Save Stats</button>
              </div>
            </div>
          </div>`;
        } else {
          html += "<p style=\"color:#64748b;font-size:0.88rem;margin-bottom:14px;\">No matches scheduled yet.</p>";
        }
        html += `
          <div class="console-panel-header" style="margin-bottom:8px;"><h2 style="font-size:0.95rem;margin:0;">Add New Match</h2></div>
          <form class="console-form" id="addMatchForm">
            <select class="console-input" name="teamAId" required style="flex:1 1 160px;"><option value="">Team A *</option>${teamOptions}</select>
            <select class="console-input" name="teamBId" required style="flex:1 1 160px;"><option value="">Team B *</option>${teamOptions}</select>
            <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 140px;"><label style="color:#94a3b8;font-size:0.82rem;">Match date</label><input class="console-input" type="date" name="matchDate" /></div>
            <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 120px;"><label style="color:#94a3b8;font-size:0.82rem;">Match time</label><input class="console-input" type="time" name="matchTime" /></div>
            <button class="console-btn primary" type="submit" style="flex:0 0 auto;">Add Match</button>
          </form>
        `;
        schContent.innerHTML = html;

        // ── Stats panel state ──────────────────────────────────────────────
        let activeStatsMatchId = null;
        let activeStatsTeams = [];

        function makeKdaRow(teamOptions, row = {}) {
          const div = document.createElement("div");
          div.className = "kda-stat-row";
          div.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;";
          div.innerHTML = `
            <select class="console-input kda-team" style="flex:1 1 130px;">
              <option value="">Team *</option>${teamOptions}
            </select>
            <input class="console-input kda-player" placeholder="Player name" style="flex:1 1 150px;" value="${escapeAttribute(row.playerName || "")}" />
            <input class="console-input kda-kills" type="number" min="0" placeholder="0" style="flex:0 0 78px;" value="${escapeAttribute(row.kills ?? "")}" />
            <input class="console-input kda-deaths" type="number" min="0" placeholder="0" style="flex:0 0 78px;" value="${escapeAttribute(row.deaths ?? "")}" />
            <input class="console-input kda-assists" type="number" min="0" placeholder="0" style="flex:0 0 78px;" value="${escapeAttribute(row.assists ?? "")}" />
            <button class="console-btn danger" type="button" style="padding:6px 10px;background:rgba(239,68,68,0.15);">X</button>
          `;
          if (row.teamId) {
            const sel = div.querySelector(".kda-team");
            if (sel) sel.value = String(row.teamId);
          }
          div.querySelector(".console-btn.danger")?.addEventListener("click", () => div.remove());
          return div;
        }

        function makeStatRow(teamOptions, row = {}) {
          const div = document.createElement("div");
          div.className = "custom-stat-row";
          div.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;";
          div.innerHTML = `
            <select class="console-input stat-team" style="flex:1 1 130px;">
              <option value="">Team *</option>${teamOptions}
            </select>
            <input class="console-input stat-player" placeholder="Player (optional)" style="flex:1 1 130px;" value="${escapeAttribute(row.playerName || "")}" />
            <input class="console-input stat-key" placeholder="Stat key *" style="flex:1 1 110px;" value="${escapeAttribute(row.statKey || "")}" />
            <input class="console-input stat-value" placeholder="Value *" style="flex:1 1 80px;" value="${escapeAttribute(row.statValue || "")}" />
            <button class="console-btn danger" type="button" style="padding:6px 10px;background:rgba(239,68,68,0.15);">X</button>
          `;
          if (row.teamId) {
            const sel = div.querySelector(".stat-team");
            if (sel) sel.value = String(row.teamId);
          }
          div.querySelector(".console-btn.danger")?.addEventListener("click", () => div.remove());
          return div;
        }

        function splitKdaStats(rows = []) {
          const groups = new Map();
          const customRows = [];
          rows.forEach((row) => {
            const key = String(row.statKey || "").trim().toLowerCase();
            if (!["kills", "deaths", "assists"].includes(key)) {
              customRows.push(row);
              return;
            }
            const groupKey = `${row.teamId || ""}|${row.playerName || ""}`;
            if (!groups.has(groupKey)) {
              groups.set(groupKey, {
                teamId: row.teamId,
                playerName: row.playerName || "",
                kills: "",
                deaths: "",
                assists: "",
              });
            }
            groups.get(groupKey)[key] = row.statValue ?? "";
          });
          return { kdaRows: Array.from(groups.values()), customRows };
        }

        schContent.querySelectorAll(".sch-stats-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const matchId = btn.dataset.matchId;
            const panel = schContent.querySelector("#matchStatsPanel");
            const label = schContent.querySelector("#matchStatsLabel");
            const rowsContainer = schContent.querySelector("#kdaRows");
            if (!panel || !rowsContainer) return;

            activeStatsMatchId = matchId;
            activeStatsTeams = [
              { id: btn.dataset.teamAId, name: btn.dataset.teamAName },
              { id: btn.dataset.teamBId, name: btn.dataset.teamBName },
            ].filter((t) => t.id);

            const teamOpts = activeStatsTeams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
            if (label) label.textContent = `${escapeHtml(btn.dataset.teamAName)} vs ${escapeHtml(btn.dataset.teamBName)}`;

            btn.disabled = true; btn.textContent = "Loading…";
            try {
              const existing = await fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches/${matchId}/stats`);
              const kdaRows = schContent.querySelector("#kdaRows");
              const customRows = schContent.querySelector("#customStatsRows");
              const splitRows = splitKdaStats(existing.items || []);
              if (kdaRows) {
                kdaRows.innerHTML = "";
                const rowsToRender = splitRows.kdaRows.length
                  ? splitRows.kdaRows
                  : activeStatsTeams.map((team) => ({ teamId: team.id }));
                rowsToRender.forEach((row) => kdaRows.appendChild(makeKdaRow(teamOpts, row)));
              }
              if (customRows) {
                customRows.innerHTML = "";
                splitRows.customRows.forEach((row) => customRows.appendChild(makeStatRow(teamOpts, row)));
              }
            } catch {
              rowsContainer.innerHTML = "";
              activeStatsTeams.forEach((team) => rowsContainer.appendChild(makeKdaRow(teamOpts, { teamId: team.id })));
              const customRows = schContent.querySelector("#customStatsRows");
              if (customRows) customRows.innerHTML = "";
            }
            panel.style.display = "block";
            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
            btn.disabled = false; btn.textContent = "Stats";
          });
        });

        schContent.querySelector("#closeMatchStatsBtn")?.addEventListener("click", () => {
          const panel = schContent.querySelector("#matchStatsPanel");
          if (panel) panel.style.display = "none";
          activeStatsMatchId = null;
        });

        schContent.querySelector("#addKdaRowBtn")?.addEventListener("click", () => {
          const rowsContainer = schContent.querySelector("#kdaRows");
          const teamOpts = activeStatsTeams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
          rowsContainer?.appendChild(makeKdaRow(teamOpts));
        });

        schContent.querySelector("#addStatRowBtn")?.addEventListener("click", () => {
          const rowsContainer = schContent.querySelector("#customStatsRows");
          const teamOpts = activeStatsTeams.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join("");
          rowsContainer?.appendChild(makeStatRow(teamOpts));
        });

        schContent.querySelector("#saveMatchStatsBtn")?.addEventListener("click", async () => {
          if (!activeStatsMatchId) return;
          const saveBtn = schContent.querySelector("#saveMatchStatsBtn");
          const kdaDivs = schContent.querySelectorAll("#kdaRows .kda-stat-row") || [];
          const statDivs = schContent.querySelectorAll("#customStatsRows .custom-stat-row") || [];
          const stats = [];
          for (const div of kdaDivs) {
            const teamId = div.querySelector(".kda-team")?.value;
            const playerName = div.querySelector(".kda-player")?.value?.trim() || null;
            const kda = [
              ["kills", div.querySelector(".kda-kills")?.value],
              ["deaths", div.querySelector(".kda-deaths")?.value],
              ["assists", div.querySelector(".kda-assists")?.value],
            ];
            if (!teamId) continue;
            kda.forEach(([statKey, value]) => {
              const statValue = String(value ?? "").trim();
              if (statValue !== "") {
                stats.push({ teamId: Number(teamId), playerName, statKey, statValue });
              }
            });
          }
          for (const div of statDivs) {
            const teamId = div.querySelector(".stat-team")?.value;
            const statKey = div.querySelector(".stat-key")?.value?.trim();
            const statValue = div.querySelector(".stat-value")?.value?.trim();
            if (!teamId || !statKey || !statValue) continue;
            stats.push({
              teamId: Number(teamId),
              playerName: div.querySelector(".stat-player")?.value?.trim() || null,
              statKey,
              statValue,
            });
          }
          saveBtn.disabled = true; saveBtn.textContent = "Saving…";
          try {
            await fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches/${activeStatsMatchId}/stats`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ stats }),
            });
            setFlash(`${stats.length} stat row(s) saved.`);
            saveBtn.textContent = "Saved ✓";
            setTimeout(() => { saveBtn.disabled = false; saveBtn.textContent = "Save Stats"; }, 2000);
          } catch (error) {
            setFlash(error.message || "Failed to save stats.", true);
            saveBtn.disabled = false; saveBtn.textContent = "Save Stats";
          }
        });

        schContent.querySelectorAll(".sch-update-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const row = btn.closest("tr");
            const scoreA = row.querySelector(".sch-score-a")?.value;
            const scoreB = row.querySelector(".sch-score-b")?.value;
            const mDate = row.querySelector(".sch-date")?.value || null;
            const mTime = row.querySelector(".sch-time")?.value;
            btn.disabled = true; btn.textContent = "Saving…";
            try {
              await fetchJson(`${auth.apiBase}/api/admin/tournaments/${btn.dataset.tournamentId}/matches/${btn.dataset.matchId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  teamAScore: scoreA !== "" ? Number(scoreA) : null,
                  teamBScore: scoreB !== "" ? Number(scoreB) : null,
                  matchDate: mDate,
                  matchTime: mTime ? `${mTime}:00` : null,
                }),
              });
              setFlash("Match updated.");
              btn.textContent = "Saved ✓";
              setTimeout(() => { btn.disabled = false; btn.textContent = "Save"; }, 2000);
            } catch (error) {
              setFlash(error.message || "Failed to update match.", true);
              btn.disabled = false; btn.textContent = "Save";
            }
          });
        });

        schContent.querySelector("#addMatchForm")?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const submitBtn = form.querySelector("button[type=submit]");
          submitBtn.disabled = true; submitBtn.textContent = "Adding…";
          try {
            const mTime = data.get("matchTime");
            await fetchJson(`${auth.apiBase}/api/admin/tournaments/${tournamentId}/matches`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                teamAId: Number(data.get("teamAId")),
                teamBId: Number(data.get("teamBId")),
                matchDate: data.get("matchDate") || null,
                matchTime: mTime ? `${mTime}:00` : null,
              }),
            });
            setFlash("Match added to schedule.");
            form.reset();
            document.getElementById("loadSchBtn")?.click();
          } catch (error) {
            setFlash(error.message || "Failed to add match.", true);
            submitBtn.disabled = false; submitBtn.textContent = "Add Match";
          }
        });
      } catch (error) {
        schContent.innerHTML = `<p style="color:#f87171;font-size:0.88rem;">${escapeHtml(error.message || "Failed to load schedule.")}</p>`;
      }
    });
  }

  // ── EVENTS PAGE ────────────────────────────────────────────────────────────
  async function renderEventsPage() {
    const items = await fetchJson(`${auth.apiBase}/api/admin/events`).then((r) => r.items || []).catch(() => []);

    const categoryOptions = ["Tournament","Ceremony","Announcement","Workshop","Social","Other"]
      .map((c) => `<option value="${c}">${c}</option>`).join("");

    const eventRows = items.map((ev) => `
      <tr data-event-id="${ev.eventId}">
        <td>${escapeHtml(ev.title)}</td>
        <td>${escapeHtml(ev.category || "—")}</td>
        <td>${escapeHtml(ev.eventDate || "—")}</td>
        <td>${escapeHtml(ev.eventTime ? ev.eventTime.slice(0, 5) : "—")}</td>
        <td>${escapeHtml(ev.venue || "—")}</td>
        <td>${ev.isPublished ? '<span style="color:#4ade80;">Published</span>' : '<span style="color:#64748b;">Draft</span>'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="console-btn ev-edit-btn"
              data-ev-id="${ev.eventId}"
              data-ev-title="${escapeAttribute(ev.title)}"
              data-ev-cat="${escapeAttribute(ev.category || "")}"
              data-ev-desc="${escapeAttribute(ev.description || "")}"
              data-ev-date="${escapeAttribute(ev.eventDate || "")}"
              data-ev-time="${escapeAttribute(ev.eventTime ? ev.eventTime.slice(0, 5) : "")}"
              data-ev-venue="${escapeAttribute(ev.venue || "")}"
              data-ev-published="${ev.isPublished}">Edit</button>
            <button class="console-btn danger ev-delete-btn" data-ev-id="${ev.eventId}" style="background:rgba(239,68,68,0.2);">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    content.innerHTML = `
      <section class="console-panel" style="margin-bottom:18px;">
        <div class="console-panel-header">
          <h2>Create Event</h2>
          <button class="console-btn" id="toggleEventForm">Show form</button>
        </div>
        <form class="console-form" id="createEventForm" style="display:none;margin-top:12px;">
          <input class="console-input" name="title" placeholder="Event title *" required style="flex:2 1 240px;" />
          <select class="console-input" name="category" style="flex:1 1 160px;">
            <option value="">Category (optional)</option>${categoryOptions}
          </select>
          <input class="console-input" name="venue" placeholder="Venue / location (optional)" style="flex:2 1 220px;" />
          <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 150px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Event date</label>
            <input class="console-input" type="date" name="eventDate" />
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 130px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Event time</label>
            <input class="console-input" type="time" name="eventTime" />
          </div>
          <textarea class="console-input" name="description" placeholder="Description (optional)" rows="2" style="flex:1 1 100%;resize:vertical;font-family:inherit;"></textarea>
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" name="isPublished" checked style="width:16px;height:16px;" /> Publish to player Events page
          </label>
          <button class="console-btn primary" type="submit" id="createEventBtn">Create Event</button>
        </form>
      </section>

      <section class="console-panel" id="editEventPanel" style="margin-bottom:18px;display:none;">
        <div class="console-panel-header">
          <h2>Edit Event <span class="console-kicker" id="editEventLabel"></span></h2>
          <button class="console-btn" id="cancelEditEventBtn">Cancel</button>
        </div>
        <form class="console-form" id="editEventForm" style="margin-top:12px;">
          <input type="hidden" id="editEventId" />
          <input class="console-input" id="editEventTitle" placeholder="Event title *" required style="flex:2 1 240px;" />
          <select class="console-input" id="editEventCat" style="flex:1 1 160px;">
            <option value="">Category (optional)</option>${categoryOptions}
          </select>
          <input class="console-input" id="editEventVenue" placeholder="Venue / location (optional)" style="flex:2 1 220px;" />
          <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 150px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Event date</label>
            <input class="console-input" type="date" id="editEventDate" />
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;flex:1 1 130px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Event time</label>
            <input class="console-input" type="time" id="editEventTime" />
          </div>
          <textarea class="console-input" id="editEventDesc" placeholder="Description (optional)" rows="2" style="flex:1 1 100%;resize:vertical;font-family:inherit;"></textarea>
          <label style="display:flex;align-items:center;gap:6px;color:#cbd5e1;font-size:0.9rem;">
            <input type="checkbox" id="editEventPublished" style="width:16px;height:16px;" /> Published
          </label>
          <button class="console-btn primary" type="submit" id="saveEventBtn">Save Event</button>
        </form>
      </section>

      <section class="console-panel">
        <h2>All Events <span class="console-kicker">${items.length} total</span></h2>
        <div class="console-table-wrap">
          <table class="console-table">
            <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${eventRows || '<tr><td colspan="7" style="color:#64748b;">No events yet. Create one above.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById("toggleEventForm")?.addEventListener("click", () => {
      const form = document.getElementById("createEventForm");
      const btn = document.getElementById("toggleEventForm");
      const isHidden = form.style.display === "none";
      form.style.display = isHidden ? "flex" : "none";
      btn.textContent = isHidden ? "Hide form" : "Show form";
    });

    document.getElementById("createEventForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("createEventBtn");
      const form = event.currentTarget;
      const data = new FormData(form);
      submitBtn.disabled = true; submitBtn.textContent = "Creating...";
      try {
        const t = data.get("eventTime");
        await fetchJson(`${auth.apiBase}/api/admin/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.get("title"),
            category: data.get("category") || null,
            description: data.get("description") || null,
            eventDate: data.get("eventDate") || null,
            eventTime: t ? `${t}:00` : null,
            venue: data.get("venue") || null,
            isPublished: data.get("isPublished") === "on",
          }),
        });
        setFlash("Event created successfully.");
        form.reset();
        form.style.display = "none";
        document.getElementById("toggleEventForm").textContent = "Show form";
        await renderEventsPage();
      } catch (error) {
        setFlash(error.message || "Failed to create event.", true);
        submitBtn.disabled = false; submitBtn.textContent = "Create Event";
      }
    });

    document.getElementById("cancelEditEventBtn")?.addEventListener("click", () => {
      document.getElementById("editEventPanel").style.display = "none";
    });

    content.querySelectorAll(".ev-edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const d = button.dataset;
        document.getElementById("editEventId").value = d.evId;
        document.getElementById("editEventLabel").textContent = `— Event #${d.evId}`;
        document.getElementById("editEventTitle").value = d.evTitle || "";
        document.getElementById("editEventCat").value = d.evCat || "";
        document.getElementById("editEventDesc").value = d.evDesc || "";
        document.getElementById("editEventDate").value = d.evDate || "";
        document.getElementById("editEventTime").value = d.evTime || "";
        document.getElementById("editEventVenue").value = d.evVenue || "";
        document.getElementById("editEventPublished").checked = d.evPublished === "true";
        const panel = document.getElementById("editEventPanel");
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    document.getElementById("editEventForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("saveEventBtn");
      const eventId = document.getElementById("editEventId").value;
      submitBtn.disabled = true; submitBtn.textContent = "Saving...";
      try {
        const t = document.getElementById("editEventTime").value;
        await fetchJson(`${auth.apiBase}/api/admin/events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: document.getElementById("editEventTitle").value,
            category: document.getElementById("editEventCat").value || null,
            description: document.getElementById("editEventDesc").value || null,
            eventDate: document.getElementById("editEventDate").value || null,
            eventTime: t ? `${t}:00` : null,
            venue: document.getElementById("editEventVenue").value || null,
            isPublished: document.getElementById("editEventPublished").checked,
          }),
        });
        setFlash("Event updated.");
        document.getElementById("editEventPanel").style.display = "none";
        await renderEventsPage();
      } catch (error) {
        setFlash(error.message || "Failed to update event.", true);
        submitBtn.disabled = false; submitBtn.textContent = "Save Event";
      }
    });

    content.querySelectorAll(".ev-delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Delete this event? This cannot be undone.")) return;
        button.disabled = true;
        try {
          await fetchJson(`${auth.apiBase}/api/admin/events/${button.dataset.evId}`, { method: "DELETE" });
          setFlash("Event deleted.");
          await renderEventsPage();
        } catch (error) {
          setFlash(error.message || "Failed to delete event.", true);
          button.disabled = false;
        }
      });
    });
  }

  // ── ADMIN REGISTRATIONS WAITLIST ────────────────────────────────────────────
  async function renderRegistrationsPage(statusFilter = "") {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    const [regsPayload, tournamentsPayload] = await Promise.all([
      fetchJson(`${auth.apiBase}/api/admin/registrations?${qs.toString()}`).catch(() => ({ items: [] })),
      fetchJson(`${auth.apiBase}/api/tournaments`).catch(() => []),
    ]);

    const regs = regsPayload.items || regsPayload || [];
    const tournaments = Array.isArray(tournamentsPayload) ? tournamentsPayload : (tournamentsPayload.items || []);

    const tournamentMap = {};
    tournaments.forEach((t) => { tournamentMap[t.tournamentId] = t.title; });

    function statusBadge(s) {
      const map = {
        pending: 'style="color:#fbbf24;"',
        approved: 'style="color:#4ade80;"',
        rejected: 'style="color:#f87171;"',
      };
      return `<span ${map[s] || ""}>${escapeHtml(s || "—")}</span>`;
    }

    function paymentBadge(s) {
      const map = {
        unpaid: 'style="color:#94a3b8;"',
        paid: 'style="color:#4ade80;"',
        refunded: 'style="color:#f87171;"',
      };
      return `<span ${map[s] || ""}>${escapeHtml(s || "—")}</span>`;
    }

    const filterOptions = ["", "pending", "approved", "rejected"]
      .map((v) => `<option value="${v}" ${v === statusFilter ? "selected" : ""}>${v ? v.charAt(0).toUpperCase() + v.slice(1) : "All statuses"}</option>`)
      .join("");

    const regRows = regs.map((r) => {
      const tourTitle = tournamentMap[r.tournamentId] || `#${r.tournamentId}`;
      return `
        <tr data-reg-id="${escapeAttribute(r.publicId)}">
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeAttribute(r.teamName)}">${escapeHtml(r.teamName)}</td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeAttribute(tourTitle)}">${escapeHtml(tourTitle)}</td>
          <td>${escapeHtml(r.contactName)}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.contactEmail)}</td>
          <td>${statusBadge(r.status)}</td>
          <td>${paymentBadge(r.paymentStatus)}</td>
          <td>${r.paymentProofUrl
            ? `<a href="${escapeAttribute(auth.apiBase + r.paymentProofUrl)}" target="_blank" rel="noopener" style="color:#a78bfa;font-size:0.82rem;">View proof</a>`
            : '<span style="color:#64748b;font-size:0.82rem;">—</span>'}</td>
          <td>${escapeHtml(r.rosterNotes || "—")}</td>
          <td>${r.joinCode
            ? `<code style="background:rgba(167,139,250,0.12);padding:2px 7px;border-radius:5px;font-size:0.82rem;color:#c4b5fd;">${escapeHtml(r.joinCode)}</code>`
            : '<span style="color:#64748b;">—</span>'}</td>
          <td>${formatDate(r.createdAt)}</td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${r.status === "pending" ? `
                <button class="console-btn reg-approve-btn" data-reg-id="${escapeAttribute(r.publicId)}" data-team="${escapeAttribute(r.teamName)}">Approve</button>
                <button class="console-btn danger reg-reject-btn" data-reg-id="${escapeAttribute(r.publicId)}" data-team="${escapeAttribute(r.teamName)}" style="background:rgba(239,68,68,0.18);">Reject</button>
              ` : ""}
              ${r.status === "approved" && r.paymentStatus !== "paid" ? `
                <button class="console-btn reg-payment-btn" data-reg-id="${escapeAttribute(r.publicId)}" data-team="${escapeAttribute(r.teamName)}" style="background:rgba(74,222,128,0.12);color:#4ade80;border-color:rgba(74,222,128,0.25);">Confirm Payment</button>
              ` : ""}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    content.innerHTML = `
      <section class="console-panel" style="margin-bottom:18px;">
        <div class="console-panel-header" style="flex-wrap:wrap;gap:12px;">
          <h2>Filter Registrations</h2>
          <div style="display:flex;gap:10px;align-items:center;">
            <select class="console-input" id="regStatusFilter" style="width:180px;">${filterOptions}</select>
            <button class="console-btn primary" id="regFilterBtn">Apply</button>
          </div>
        </div>
      </section>

      <!-- Reject modal (hidden) -->
      <div id="rejectModal" style="display:none;position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;">
        <div style="background:#1a1730;border:1px solid rgba(139,92,246,0.25);border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
          <h3 style="margin:0 0 12px;color:#f1f0ff;font-family:Syne,sans-serif;font-size:1.1rem;">Reject Registration</h3>
          <p id="rejectModalLabel" style="margin:0 0 14px;color:#94a3b8;font-size:0.9rem;"></p>
          <textarea id="rejectReason" class="console-input" rows="3" placeholder="Reason for rejection (optional)" style="width:100%;resize:vertical;font-family:inherit;margin-bottom:16px;"></textarea>
          <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="console-btn" id="cancelRejectBtn">Cancel</button>
            <button class="console-btn danger" id="confirmRejectBtn" style="background:rgba(239,68,68,0.2);">Confirm Reject</button>
          </div>
        </div>
      </div>

      <section class="console-panel">
        <h2>Team Registrations <span class="console-kicker">${regs.length} shown</span></h2>
        <div class="console-table-wrap">
          <table class="console-table" style="font-size:0.82rem;">
            <thead>
              <tr>
                <th>Team</th>
                <th>Tournament</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Players</th>
                <th>Join Code</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${regRows || '<tr><td colspan="11" style="color:#64748b;">No registrations found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    document.getElementById("regFilterBtn")?.addEventListener("click", () => {
      const val = document.getElementById("regStatusFilter").value;
      renderRegistrationsPage(val);
    });

    // Approve
    content.querySelectorAll(".reg-approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Approve registration for "${btn.dataset.team}"? A join code will be sent to their email.`)) return;
        btn.disabled = true; btn.textContent = "Approving…";
        try {
          await fetchJson(`${auth.apiBase}/api/admin/registrations/${btn.dataset.regId}/approve`, { method: "PUT" });
          setFlash(`Registration for "${btn.dataset.team}" approved. Join code sent via email.`);
          await renderRegistrationsPage(statusFilter);
        } catch (error) {
          setFlash(error.message || "Failed to approve registration.", true);
          btn.disabled = false; btn.textContent = "Approve";
        }
      });
    });

    // Reject — open modal
    let pendingRejectId = null;
    let pendingRejectTeam = null;

    content.querySelectorAll(".reg-reject-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        pendingRejectId = btn.dataset.regId;
        pendingRejectTeam = btn.dataset.team;
        document.getElementById("rejectReason").value = "";
        document.getElementById("rejectModalLabel").textContent = `Rejecting registration for: "${pendingRejectTeam}"`;
        const modal = document.getElementById("rejectModal");
        modal.style.display = "flex";
      });
    });

    document.getElementById("cancelRejectBtn")?.addEventListener("click", () => {
      document.getElementById("rejectModal").style.display = "none";
    });

    document.getElementById("confirmRejectBtn")?.addEventListener("click", async () => {
      const reason = document.getElementById("rejectReason").value.trim() || null;
      const confirmBtn = document.getElementById("confirmRejectBtn");
      confirmBtn.disabled = true; confirmBtn.textContent = "Rejecting…";
      try {
        await fetchJson(`${auth.apiBase}/api/admin/registrations/${pendingRejectId}/reject`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        setFlash(`Registration for "${pendingRejectTeam}" rejected.`);
        document.getElementById("rejectModal").style.display = "none";
        await renderRegistrationsPage(statusFilter);
      } catch (error) {
        setFlash(error.message || "Failed to reject registration.", true);
        confirmBtn.disabled = false; confirmBtn.textContent = "Confirm Reject";
      }
    });

    // Confirm payment
    content.querySelectorAll(".reg-payment-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(`Mark payment as confirmed for "${btn.dataset.team}"?`)) return;
        btn.disabled = true; btn.textContent = "Confirming…";
        try {
          await fetchJson(`${auth.apiBase}/api/admin/registrations/${btn.dataset.regId}/payment`, { method: "PUT" });
          setFlash(`Payment confirmed for "${btn.dataset.team}".`);
          await renderRegistrationsPage(statusFilter);
        } catch (error) {
          setFlash(error.message || "Failed to confirm payment.", true);
          btn.disabled = false; btn.textContent = "Confirm Payment";
        }
      });
    });
  }

  // ── ADMIN PROFILE PAGE ─────────────────────────────────────────────────────
  async function renderAdminProfilePage() {
    const userId = session.userId || session.user?.userId;
    let profile = {};
    try {
      profile = await fetchJson(`${auth.apiBase}/api/users/profile/${userId}`);
    } catch {
      setFlash("Could not load profile data.", true);
    }

    const gameOptions = ["Valorant","Mobile Legends: Bang Bang","Call of Duty: Mobile","PUBG Mobile","League of Legends","Dota 2","Apex Legends","Fortnite","Minecraft","Other"]
      .map((g) => {
        const selected = (profile.primaryGames || []).includes(g) ? "selected" : "";
        return `<option value="${g}" ${selected}>${g}</option>`;
      }).join("");

    content.innerHTML = `
      <section class="console-panel">
        <h2>Profile Information</h2>
        <p style="color:#94a3b8;font-size:0.88rem;margin-top:0;margin-bottom:18px;">
          Username: <strong style="color:#e2e8f0;">${escapeHtml(profile.username || session.username || "—")}</strong>
          &nbsp;·&nbsp; Role: <span class="console-pill ${escapeHtml(profile.role || session.role)}">${escapeHtml(profile.role || session.role || "admin")}</span>
        </p>
        <form class="console-form" id="adminProfileForm">
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Display name (in-game)</label>
            <input class="console-input" id="profileDisplayName" value="${escapeAttribute(profile.displayName || "")}" placeholder="In-game / display name" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">First name</label>
            <input class="console-input" id="profileFirstName" value="${escapeAttribute(profile.firstName || "")}" placeholder="First name" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Last name</label>
            <input class="console-input" id="profileLastName" value="${escapeAttribute(profile.lastName || "")}" placeholder="Last name" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 220px;">
            <label style="color:#94a3b8;font-size:0.82rem;">School / University</label>
            <input class="console-input" id="profileSchool" value="${escapeAttribute(profile.school || "")}" placeholder="e.g. De La Salle University – Dasmariñas" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 180px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Course / Year</label>
            <input class="console-input" id="profileCourseYear" value="${escapeAttribute(profile.courseYear || "")}" placeholder="e.g. BSIT — 3rd Year" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 180px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Phone number</label>
            <input class="console-input" id="profilePhoneNumber" value="${escapeAttribute(profile.phoneNumber || "")}" placeholder="e.g. 09xx-xxx-xxxx" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Date of birth</label>
            <input class="console-input" type="date" id="profileDateOfBirth" value="${escapeAttribute(profile.dateOfBirth || "")}" />
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex:1 1 200px;">
            <label style="color:#94a3b8;font-size:0.82rem;">Primary games</label>
            <select class="console-input" id="profilePrimaryGame">${gameOptions}</select>
          </div>
          <button class="console-btn primary" type="submit" id="saveProfileBtn" style="flex:0 0 auto;">Save Profile</button>
        </form>
      </section>
    `;

    document.getElementById("adminProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = document.getElementById("saveProfileBtn");
      submitBtn.disabled = true; submitBtn.textContent = "Saving...";
      try {
        const updated = await fetchJson(`${auth.apiBase}/api/users/profile/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: document.getElementById("profileDisplayName").value,
            firstName: document.getElementById("profileFirstName").value,
            lastName: document.getElementById("profileLastName").value,
            school: document.getElementById("profileSchool").value,
            courseYear: document.getElementById("profileCourseYear").value,
            phoneNumber: document.getElementById("profilePhoneNumber").value,
            dateOfBirth: document.getElementById("profileDateOfBirth").value || null,
            primaryGames: [document.getElementById("profilePrimaryGame").value].filter(Boolean),
          }),
        });
        setFlash(`Profile updated. Display name: ${updated.displayName || updated.username}.`);
        submitBtn.textContent = "Saved ✓";
        setTimeout(() => { submitBtn.disabled = false; submitBtn.textContent = "Save Profile"; }, 2500);
      } catch (error) {
        setFlash(error.message || "Failed to save profile.", true);
        submitBtn.disabled = false; submitBtn.textContent = "Save Profile";
      }
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

  function getFriendlyErrorMessage(error, fallback = "Request failed.") {
    const message = String(error?.message || fallback).trim();
    if (/failed to fetch|networkerror|load failed|unable to connect/i.test(message)) {
      return `The backend API at ${auth.apiBase} is not reachable. Start the backend server, then refresh this page.`;
    }
    return message || fallback;
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
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  function formatActionType(actionType) {
    const map = {
      "auth.login_success": "Logged in",
      "auth.login_failed": "Login failed",
      "auth.login_password_verified": "Password verified",
      "auth.logout": "Logged out",
      "auth.mfa_code_sent": "MFA code sent",
      "auth.mfa_failed": "MFA failed",
      "auth.google_login_success": "Signed in with Google",
      "feed.post_created": "Created a post",
      "feed.post_deleted": "Deleted a post",
      "reaction.comment_created": "Commented on a post",
      "reaction.comment_deleted": "Deleted a comment",
      "reaction.post_reacted": "Reacted to a post",
      "reaction.post_unreacted": "Removed reaction",
      "admin.role_changed": "Role changed",
      "admin.stream_moderated": "Moderated a stream",
      "admin.stream_published": "Published a stream",
      "admin.stream_updated": "Updated a stream",
      "admin.tournament_created": "Created a tournament",
      "user.school_verified": "Verified school",
    };
    return map[actionType] || String(actionType || "").replace(/[._]/g, " ");
  }
})();
