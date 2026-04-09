(() => {
  const catalog = window.GamersHubTournamentCatalog || {};
  const tournamentId =
    new URLSearchParams(window.location.search).get("tournament") || "1";
  const tournament =
    catalog[tournamentId] || catalog["1"] || {
      title: "Tournament Schedule",
      scheduleSubtitle:
        "Tournament match information will appear here once teams and schedules are available.",
      scheduleEmptyTitle: "No matches scheduled yet",
      scheduleEmptyBody:
        "There are no team entries or saved match records for this tournament in the database yet.",
    };

  const topNav = document.getElementById("topNav");
  const bellBtn = document.getElementById("bellBtn");
  const searchInput = document.getElementById("searchInput");
  const scheduleList = document.getElementById("schList");
  const titleNode = document.getElementById("schTournamentTitle");
  const subtitleNode = document.querySelector(".sch-subtitle");
  const leaderboardsLink = document.querySelector(".sch-leaderboards-btn");

  function renderScheduleEmptyState() {
    if (!scheduleList) {
      return;
    }

    scheduleList.innerHTML = `
      <div class="sch-empty-state">
        <div>
          <div class="sch-empty-icon">SCH</div>
          <p class="sch-empty-title">${tournament.scheduleEmptyTitle}</p>
          <p class="sch-empty-sub">${tournament.scheduleEmptyBody}</p>
        </div>
      </div>
    `;
  }

  if (titleNode) {
    titleNode.textContent = tournament.title;
  }

  if (subtitleNode) {
    subtitleNode.textContent = tournament.scheduleSubtitle;
  }

  if (leaderboardsLink) {
    leaderboardsLink.href = `./leaderboards.html?tournament=${encodeURIComponent(tournamentId)}`;
  }

  document.title = `GamersHub - ${tournament.title}`;
  renderScheduleEmptyState();

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  bellBtn?.addEventListener("click", () => {
    const badge = bellBtn.querySelector(".bell-badge");

    if (!badge) {
      return;
    }

    badge.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    badge.style.transform = "scale(0)";
    badge.style.opacity = "0";
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });
})();
