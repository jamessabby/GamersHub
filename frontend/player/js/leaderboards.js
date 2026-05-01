(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const tournamentId =
    new URLSearchParams(window.location.search).get("tournament") || "1";
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const titleNode = document.getElementById("lbTournamentTitle");
  const subtitleNode = document.getElementById("lbTournamentSubtitle");
  const scheduleButton = document.getElementById("lbScheduleBtn");
  const tableBody = document.getElementById("lbTableBody");

  function renderEmptyState(title, body) {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = `
      <div class="lb-empty-state">
        <div>
          <div class="lb-empty-icon">LB</div>
          <p class="lb-empty-title">${escapeHtml(title)}</p>
          <p class="lb-empty-sub">${escapeHtml(body)}</p>
        </div>
      </div>
    `;
  }

  if (scheduleButton) {
    scheduleButton.href = `./schedule.html?tournament=${encodeURIComponent(tournamentId)}`;
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

  renderEmptyState(
    "Loading leaderboard",
    "Connecting to the tournament database for standings.",
  );
  void loadLeaderboard();

  async function loadLeaderboard() {
    try {
      const response = await fetch(
        `${API_BASE}/api/tournaments/${encodeURIComponent(tournamentId)}/leaderboard`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load leaderboard.");
      }

      if (titleNode) {
        titleNode.textContent = `${payload.tournament?.title || "Tournament"} Leaderboards`;
      }

      if (subtitleNode) {
        subtitleNode.textContent =
          payload.items?.length
            ? "Standings below are calculated from completed matches stored in the SSMS tournament database."
            : "The tournament exists, but no scored match results have been recorded yet.";
      }

      document.title = `GamersHub - ${payload.tournament?.title || "Leaderboards"}`;

      if (!payload.items?.length) {
        renderEmptyState(
          "No leaderboard entries yet",
          "Leaderboard rows will appear after admins save match records with final scores in the MATCH table.",
        );
        return;
      }

      renderLeaderboard(payload.items);
    } catch (error) {
      console.error("Leaderboard loading failed:", error);
      renderEmptyState(
        "Leaderboard unavailable",
        "The backend could not calculate tournament standings from SSMS right now.",
      );
    }
  }

  function renderLeaderboard(items) {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = items
      .map(
        (entry) => `
          <div class="lb-row">
            <span class="lb-rank">#${entry.rank}</span>
            <span class="lb-team-cell">
              <span class="lb-team-name">${escapeHtml(entry.teamName)}</span>
              <span class="lb-team-meta">${entry.played} matches played</span>
            </span>
            <span class="lb-stat">${entry.wins}</span>
            <span class="lb-stat">${entry.losses}</span>
          </div>
        `,
      )
      .join("");
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
