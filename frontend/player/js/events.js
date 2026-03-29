/* ═══════════════════════════════════════════════
   events.js  —  GamersHub · Events page
   IIFE — no globals, no framework.
   ═══════════════════════════════════════════════ */
(() => {
  /* ── DOM REFS ─────────────────────────────────── */
  const topNav = document.getElementById("topNav");
  const bellBtn = document.getElementById("bellBtn");
  const filterBar = document.getElementById("filterBar");
  const eventsList = document.getElementById("eventsList");
  const emptyState = document.getElementById("eventsEmpty");
  const gameStrip = document.getElementById("gameStrip");

  /* ── NAVBAR SCROLL SHADOW ─────────────────────── */
  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  /* ── BELL (dismiss badge if present) ─────────── */
  bellBtn?.addEventListener("click", () => {
    const badge = bellBtn.querySelector(".bell-badge");
    if (badge) {
      badge.style.transition = "transform 0.2s ease, opacity 0.2s ease";
      badge.style.transform = "scale(0)";
      badge.style.opacity = "0";
    }
  });

  /* ── FILTER HELPERS ───────────────────────────── */
  /* Map game-strip data-game values → pill data-filter values */
  const GAME_TO_FILTER = {
    all: "all",
    valorant: "valorant",
    cod: "cod",
    pubg: "pubg",
    mlbb: "mlbb",
  };

  const pills = filterBar
    ? Array.from(filterBar.querySelectorAll(".events-pill"))
    : [];
  const gameBtns = gameStrip
    ? Array.from(gameStrip.querySelectorAll(".game-strip-btn"))
    : [];
  const rows = eventsList
    ? Array.from(eventsList.querySelectorAll(".event-row"))
    : [];

  function applyFilter(value) {
    let visible = 0;

    rows.forEach((row) => {
      const rowFilter = row.dataset.filter;
      const show = value === "all" || rowFilter === value;

      if (show) {
        row.style.display = "flex";
        /* Re-trigger stagger animation */
        row.style.animation = "none";
        void row.offsetWidth;
        row.style.animation = "";
        visible++;
      } else {
        row.style.display = "none";
      }
    });

    /* Empty state */
    if (emptyState) {
      emptyState.classList.toggle("hidden", visible > 0);
    }
  }

  /* Sync pill active state */
  function setActivePill(value) {
    pills.forEach((p) => {
      const match = p.dataset.filter === value;
      p.classList.toggle("active", match);
      p.setAttribute("aria-selected", String(match));
    });
  }

  /* Sync game strip active state */
  function setActiveGame(game) {
    gameBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.game === game);
    });
  }

  /* ── PILL CLICKS ──────────────────────────────── */
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const filter = pill.dataset.filter;
      setActivePill(filter);
      applyFilter(filter);

      /* Sync strip: find matching game key for this filter */
      const matchingGame = Object.keys(GAME_TO_FILTER).find(
        (g) => GAME_TO_FILTER[g] === filter,
      );
      if (matchingGame) setActiveGame(matchingGame);
      else setActiveGame("all");
    });
  });

  /* ── GAME STRIP CLICKS ────────────────────────── */
  gameBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const game = btn.dataset.game;
      const filter = GAME_TO_FILTER[game] || "all";

      setActiveGame(game);
      setActivePill(filter);
      applyFilter(filter);
    });
  });

  /* ── KEYBOARD SHORTCUT: Ctrl/Cmd+K → search ──── */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("searchInput")?.focus();
    }
  });

  /* ── INIT ─────────────────────────────────────── */
  applyFilter("all");
})();
