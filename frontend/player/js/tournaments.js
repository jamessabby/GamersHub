(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const tournamentList = document.getElementById("trnList");
  let tournaments = [];

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  tournamentList?.addEventListener("click", (event) => {
    // Let the summary anchor navigate natively.
    if (event.target.closest(".trn-row-summary-link")) return;

    const row = event.target.closest(".trn-row");
    const cta = event.target.closest(".trn-row-cta");
    const target = cta || row;

    if (!target) return;

    const tournamentId = target.closest(".trn-row")?.dataset.id;
    if (!tournamentId) return;

    window.location.href = `./schedule.html?tournament=${encodeURIComponent(tournamentId)}`;
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  searchInput?.addEventListener("input", () => {
    renderTournaments(filterTournaments(searchInput.value));
  });

  // ── Join-with-code panel ────────────────────────
  const joinToggle = document.getElementById("joinCodeToggle");
  const joinForm = document.getElementById("joinCodeForm");
  const joinInput = document.getElementById("joinCodeInput");
  const joinBtn = document.getElementById("joinCodeBtn");
  const joinError = document.getElementById("joinCodeError");
  const joinSuccess = document.getElementById("joinCodeSuccess");
  const joinSuccessMsg = document.getElementById("joinCodeSuccessMsg");

  joinToggle?.addEventListener("click", () => {
    const open = !joinForm.classList.contains("hidden");
    joinForm.classList.toggle("hidden", open);
    joinToggle.textContent = open ? "Enter Code" : "Cancel";
    if (!open) joinInput?.focus();
  });

  joinBtn?.addEventListener("click", handleJoinCode);
  joinInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") handleJoinCode(); });

  async function handleJoinCode() {
    const code = joinInput.value.trim().toUpperCase();
    joinError.textContent = "";
    if (!code) { joinError.textContent = "Please enter a join code."; return; }

    joinBtn.disabled = true;
    joinBtn.textContent = "Joining…";
    try {
      const res = await fetch(`${API_BASE}/api/tournaments/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.GamersHubAuth?.getSession?.()?.token || ""}` },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        joinError.textContent = data.message || "Invalid or already used code.";
        joinBtn.disabled = false;
        joinBtn.textContent = "Join";
        return;
      }
      const tourTitle = data.tournament?.title || "the tournament";
      joinForm.classList.add("hidden");
      joinSuccess.classList.remove("hidden");
      joinSuccessMsg.textContent = `Your team successfully joined "${tourTitle}"!`;
      joinToggle.textContent = "Enter Code";
      joinInput.value = "";
      void loadTournaments();
    } catch {
      joinError.textContent = "Network error. Please try again.";
      joinBtn.disabled = false;
      joinBtn.textContent = "Join";
    }
  }

  renderLoadingState();
  void loadTournaments();

  async function loadTournaments() {
    try {
      const response = await fetch(`${API_BASE}/api/tournaments`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load tournaments.");
      }

      tournaments = payload.items || [];
      renderTournaments(filterTournaments(searchInput?.value || ""));

      // ── IGDB Enhancement: fetch game covers asynchronously ──────────────
      // This runs AFTER rendering so tournaments appear immediately.
      // If IGDB fails, cover images gracefully fall back to local assets.
      void enrichWithIgdbCovers(tournaments);
      // ────────────────────────────────────────────────────────────────────
    } catch (error) {
      console.error("Tournament loading failed:", error);
      renderEmptyState(
        "Tournament service is offline",
        "The player tournament pages are ready for SSMS data, but the backend could not load the tournament database right now.",
      );
    }
  }

  function filterTournaments(term) {
    const needle = String(term || "").trim().toLowerCase();
    if (!needle) {
      return tournaments;
    }

    return tournaments.filter((tournament) =>
      [tournament.title, tournament.gameName, tournament.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  function renderLoadingState() {
    if (!tournamentList) {
      return;
    }

    tournamentList.innerHTML = `
      <article class="trn-empty-state">
        <div class="trn-empty-icon">...</div>
        <h2 class="trn-empty-title">Loading tournaments</h2>
        <p class="trn-empty-sub">Connecting to the tournament database.</p>
      </article>
    `;
  }

  function renderTournaments(items) {
    if (!tournamentList) {
      return;
    }

    if (!items.length) {
      renderEmptyState(
        "No tournaments available yet",
        "Once admins insert tournament records into SSMS, players will see the live list here and can open schedules and leaderboards from each tournament.",
      );
      return;
    }

    tournamentList.innerHTML = items.map(renderTournamentCard).join("");
  }

  function renderEmptyState(title, body) {
    if (!tournamentList) {
      return;
    }

    tournamentList.innerHTML = `
      <article class="trn-empty-state">
        <div class="trn-empty-icon">TRN</div>
        <h2 class="trn-empty-title">${escapeHtml(title)}</h2>
        <p class="trn-empty-sub">${escapeHtml(body)}</p>
      </article>
    `;
  }

  function renderTournamentCard(tournament) {
    const badge = resolveBadge(tournament);
    const startDate = tournament.startDate
      ? formatDate(tournament.startDate)
      : "Date not set";
    const metaLabel =
      tournament.teamCount && tournament.matchCount
        ? `${tournament.teamCount} teams • ${tournament.matchCount} matches`
        : tournament.teamCount
          ? `${tournament.teamCount} teams registered`
          : tournament.matchCount
            ? `${tournament.matchCount} matches planned`
            : "Waiting for teams and match records";

    return `
      <article class="trn-row" data-id="${tournament.tournamentId}">
        <div class="trn-row-thumb">
          <img
            src="${escapeAttribute(resolveThumbnail(tournament.gameName))}"
            alt="${escapeHtml(tournament.title)}"
            data-igdb-game="${escapeAttribute(tournament.gameName || "")}"
          />
          <span class="trn-row-badge ${badge.className}">${escapeHtml(badge.label)}</span>
        </div>
        <div class="trn-row-body">
          <div class="trn-row-top">
            <span class="trn-row-game-tag" data-igdb-game="${escapeAttribute(tournament.gameName || "")}">${escapeHtml(tournament.gameName || "Game")}</span>
            <span class="trn-row-type">${escapeHtml(metaLabel)}</span>
          </div>
          <h2 class="trn-row-title">${escapeHtml(tournament.title)}</h2>
          <p class="trn-row-desc">
            ${escapeHtml(buildTournamentDescription(tournament))}
          </p>
          <div class="trn-row-meta">
            <span class="trn-row-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Starts: ${escapeHtml(startDate)}
            </span>
            <span class="trn-row-prize">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="6"></circle>
                <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"></path>
              </svg>
              ${escapeHtml(tournament.status || "Pending")}
            </span>
          </div>
        </div>
        <div class="trn-row-actions">
          <button class="trn-row-cta" aria-label="View ${escapeHtml(tournament.title)} schedule">
            View Schedule
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <a class="trn-row-summary-link"
             href="./tournament-summary.html?tournament=${encodeURIComponent(tournament.tournamentId)}"
             aria-label="View ${escapeHtml(tournament.title)} summary">
            Summary
          </a>
        </div>
      </article>
    `;
  }

  function buildTournamentDescription(tournament) {
    if (!tournament.matchCount) {
      return "This tournament is ready for players, but its schedule and standings will stay empty until admins create teams and match records in the tournament database.";
    }

    if (!tournament.completedMatchCount) {
      return "Match records already exist for this tournament. Players can open the schedule now, and standings will appear as soon as scores are saved.";
    }

    return `Players can already track ${tournament.completedMatchCount} completed matches from the live tournament data and continue monitoring the remaining schedule.`;
  }

  function resolveBadge(tournament) {
    const status = String(tournament.status || "").toLowerCase();
    if (status.includes("live") || status.includes("active") || tournament.isActive) {
      return { className: "trn-badge-live", label: tournament.status || "Active" };
    }

    if (status.includes("open") || status.includes("register")) {
      return { className: "trn-badge-reg", label: tournament.status || "Registration Open" };
    }

    if (status.includes("soon") || status.includes("pending")) {
      return { className: "trn-badge-soon", label: tournament.status || "Pending" };
    }

    return { className: "trn-badge-open", label: tournament.status || "Ready" };
  }

  function resolveThumbnail(gameName, igdbCover) {
    // If IGDB cover is available, prefer it (enhancement layer)
    if (igdbCover) return igdbCover;

    const value = String(gameName || "").toLowerCase();
    if (value.includes("valorant")) {
      return "../assets/img/livestreams/valorant-select.png";
    }
    if (value.includes("mobile legends") || value.includes("mlbb")) {
      return "../assets/img/livestreams/ml-select.jpg";
    }
    if (value.includes("cod")) {
      return "../assets/img/livestreams/cod-select.jpg";
    }
    if (value.includes("pubg")) {
      return "../assets/img/livestreams/pubg-select.jpg";
    }
    return "../assets/img/livestreams/thumbnail.jpg";
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
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

  // ── IGDB Enhancement ──────────────────────────────────────────────────────
  // Fetches game cover art from IGDB via our backend proxy after tournaments render.
  // If IGDB is not configured or fails, this is a silent no-op — it never
  // breaks or removes existing tournament cards.
  // The backend caches IGDB results for 6 hours so repeated loads are fast.

  /** In-memory cache of IGDB results for this page session */
  const igdbCache = new Map();

  async function enrichWithIgdbCovers(items) {
    const gameNames = [...new Set(items.map((t) => t.gameName).filter(Boolean))];
    if (!gameNames.length) return;

    await Promise.allSettled(
      gameNames.map(async (name) => {
        try {
          if (igdbCache.has(name)) return; // already fetched

          const resp = await fetch(
            `${API_BASE}/api/streams/igdb/game?name=${encodeURIComponent(name)}`,
          );
          if (!resp.ok) return;

          const payload = await resp.json();
          if (!payload.configured || !payload.game?.coverUrl) return;

          igdbCache.set(name, payload.game);

          // Update every img that is still showing the local fallback for this game
          const imgs = document.querySelectorAll(
            `.trn-row-thumb img[data-igdb-game="${CSS.escape(name)}"]`,
          );
          imgs.forEach((img) => {
            img.src = payload.game.coverUrl;
            img.classList.add("igdb-cover");
          });

          // Show genre tags if available
          if (payload.game.genres?.length) {
            const tags = document.querySelectorAll(
              `.trn-row-game-tag[data-igdb-game="${CSS.escape(name)}"]`,
            );
            tags.forEach((tag) => {
              tag.title = payload.game.genres.slice(0, 3).join(", ");
              tag.classList.add("igdb-enriched");
            });
          }
        } catch {
          // Silent — IGDB failure never crashes the page
        }
      }),
    );
  }
  // ─────────────────────────────────────────────────────────────────────────
})();
