(() => {
  const catalog = window.GamersHubTournamentCatalog || {};
  const tournamentId =
    new URLSearchParams(window.location.search).get("tournament") || "1";
  const tournament =
    catalog[tournamentId] || catalog["1"] || {
      title: "Leaderboards",
      leaderboardSubtitle:
        "Leaderboard rankings will appear after teams register and official match results are recorded.",
      leaderboardEmptyTitle: "No leaderboard entries yet",
      leaderboardEmptyBody:
        "There are no tournament standings saved in the database for this view yet.",
    };

  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const titleNode = document.getElementById("lbTournamentTitle");
  const subtitleNode = document.getElementById("lbTournamentSubtitle");
  const scheduleButton = document.getElementById("lbScheduleBtn");
  const tableBody = document.getElementById("lbTableBody");

  function renderEmptyState() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = `
      <div class="lb-empty-state">
        <div>
          <div class="lb-empty-icon">LB</div>
          <p class="lb-empty-title">${tournament.leaderboardEmptyTitle}</p>
          <p class="lb-empty-sub">${tournament.leaderboardEmptyBody}</p>
        </div>
      </div>
    `;
  }

  if (titleNode) {
    titleNode.textContent = `${tournament.title} Leaderboards`;
  }

  if (subtitleNode) {
    subtitleNode.textContent = tournament.leaderboardSubtitle;
  }

  if (scheduleButton) {
    scheduleButton.href = `./schedule.html?tournament=${encodeURIComponent(tournamentId)}`;
  }

  document.title = `GamersHub - ${tournament.title} Leaderboards`;
  renderEmptyState();

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
})();
