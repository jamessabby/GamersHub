(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const tournamentId =
    new URLSearchParams(window.location.search).get("tournament") || "1";
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const scheduleList = document.getElementById("schList");
  const titleNode = document.getElementById("schTournamentTitle");
  const subtitleNode = document.querySelector(".sch-subtitle");
  const leaderboardsLink = document.querySelector(".sch-leaderboards-btn");

  function renderScheduleEmptyState(title, body) {
    if (!scheduleList) {
      return;
    }

    scheduleList.innerHTML = `
      <div class="sch-empty-state">
        <div>
          <div class="sch-empty-icon">SCH</div>
          <p class="sch-empty-title">${escapeHtml(title)}</p>
          <p class="sch-empty-sub">${escapeHtml(body)}</p>
        </div>
      </div>
    `;
  }

  if (leaderboardsLink) {
    leaderboardsLink.href = `./leaderboards.html?tournament=${encodeURIComponent(tournamentId)}`;
  }

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  renderScheduleEmptyState(
    "Loading schedule",
    "Connecting to the tournament database for match data.",
  );
  void loadSchedule();

  async function loadSchedule() {
    try {
      const response = await fetch(
        `${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/schedule`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load schedule.");
      }

      if (titleNode) {
        titleNode.textContent = payload.tournament?.title || "Tournament Schedule";
      }

      if (subtitleNode) {
        subtitleNode.textContent =
          payload.items?.length
            ? `Real tournament matches are now loaded from SSMS for ${payload.tournament?.title || "this tournament"}.`
            : "This tournament exists in SSMS, but there are no saved match records yet.";
      }

      document.title = `GamersHub - ${payload.tournament?.title || "Tournament Schedule"}`;

      if (!payload.items?.length) {
        renderScheduleEmptyState(
          "No matches scheduled yet",
          "Admins still need to insert match records into the MATCH table before players can see pairings and scores here.",
        );
        return;
      }

      renderSchedule(payload);
    } catch (error) {
      console.error("Schedule loading failed:", error);
      renderScheduleEmptyState(
        "Schedule unavailable",
        "The backend could not load the tournament schedule from SSMS right now.",
      );
    }
  }

  function renderSchedule(payload) {
    if (!scheduleList) {
      return;
    }

    const gameName = payload.tournament?.gameName || "Tournament";
    scheduleList.innerHTML = payload.items
      .map(
        (match) => `
          <article class="sch-match">
            <div class="sch-team-media">
              ${match.teamABannerUrl
                ? `<img class="sch-team-banner" src="${escapeAttribute(apiBase + match.teamABannerUrl)}" alt="${escapeHtml(match.teamAName)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''"><div class="sch-team-avatar" style="display:none;">${escapeHtml(getInitials(match.teamAName))}</div>`
                : `<div class="sch-team-avatar">${escapeHtml(getInitials(match.teamAName))}</div>`
              }
            </div>
            <div class="sch-team-info">
              <span class="sch-team-label">Team A</span>
              <span class="sch-team-name">${escapeHtml(match.teamAName)}</span>
              <span class="sch-team-score">${formatScore(match.teamAScore)}</span>
            </div>
            <div class="sch-match-center">
              <span class="sch-game-label">${escapeHtml(gameName)}</span>
              <span class="sch-status-badge ${resolveStatusClass(match.status)}">
                ${match.status === "completed" ? "Completed" : "Upcoming"}
              </span>
              <span class="sch-match-time">${escapeHtml(formatTime(match.matchTime))}</span>
              <span class="sch-match-date">${escapeHtml(formatDate(match.matchDate))}</span>
            </div>
            <div class="sch-team-info sch-team-info--right">
              <span class="sch-team-label">Team B</span>
              <span class="sch-team-name">${escapeHtml(match.teamBName)}</span>
              <span class="sch-team-score">${formatScore(match.teamBScore)}</span>
            </div>
            <div class="sch-team-media">
              ${match.teamBBannerUrl
                ? `<img class="sch-team-banner" src="${escapeAttribute(apiBase + match.teamBBannerUrl)}" alt="${escapeHtml(match.teamBName)}" onerror="this.style.display='none';this.nextElementSibling.style.display=''"><div class="sch-team-avatar" style="display:none;">${escapeHtml(getInitials(match.teamBName))}</div>`
                : `<div class="sch-team-avatar">${escapeHtml(getInitials(match.teamBName))}</div>`
              }
            </div>
          </article>
        `,
      )
      .join("");
  }

  function resolveStatusClass(status) {
    return status === "completed" ? "sch-status-done" : "sch-status-upcoming";
  }

  function formatScore(value) {
    return value == null ? "TBD" : `Score: ${value}`;
  }

  function formatDate(value) {
    if (!value) {
      return "Date pending";
    }

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
  }

  function formatTime(value) {
    if (!value) {
      return "Time pending";
    }

    const [hours = "00", minutes = "00"] = String(value).split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getInitials(name) {
    return String(name || "T")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();