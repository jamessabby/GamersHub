(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const livestreamStatus = document.getElementById("livestreamStatus");
  const streamsSection = document.getElementById("streamsSection");

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

  renderLoadingState();
  void loadStreams();

  // ── Twitch External Streams ───────────────────────────────────────────────
  const twitchSection = document.getElementById("twitchSection");
  const twitchGrid = document.getElementById("twitchGrid");
  const twitchStatus = document.getElementById("twitchStatus");
  const twitchGamePills = document.getElementById("twitchGamePills");
  let activeTwitchGame = "Valorant";

  // Load Twitch streams on page load with default game
  void loadTwitchStreams(activeTwitchGame);

  // Game pill click handler
  twitchGamePills?.addEventListener("click", (event) => {
    const pill = event.target.closest(".twitch-pill");
    if (!pill) return;
    const game = pill.dataset.game;
    if (!game || game === activeTwitchGame) return;

    // Update active pill UI
    twitchGamePills.querySelectorAll(".twitch-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeTwitchGame = game;

    // Re-fetch
    void loadTwitchStreams(game);
  });

  async function loadTwitchStreams(game) {
    if (twitchStatus) {
      twitchStatus.textContent = `Loading ${game} streams from Twitch…`;
      twitchStatus.className = "twitch-loading-state";
    }
    if (twitchGrid) twitchGrid.innerHTML = "";

    try {
      const resp = await fetch(
        `${API_BASE}/api/streams/twitch?game=${encodeURIComponent(game)}&limit=6`,
      );
      const payload = await resp.json();

      if (!payload.configured) {
        if (twitchStatus) {
          twitchStatus.textContent = "External stream discovery is not available on this server.";
          twitchStatus.className = "twitch-unavailable";
        }
        return;
      }

      const items = payload.items || [];
      if (!items.length) {
        if (twitchStatus) {
          twitchStatus.textContent = `No live ${game} streams found on Twitch right now.`;
          twitchStatus.className = "twitch-unavailable";
        }
        return;
      }

      if (twitchStatus) twitchStatus.textContent = "";
      if (twitchGrid) {
        twitchGrid.innerHTML = items.map(renderTwitchCard).join("");
      }
    } catch (err) {
      console.warn("[Twitch] Failed to load external streams:", err.message);
      if (twitchStatus) {
        twitchStatus.textContent = "External streams are temporarily unavailable.";
        twitchStatus.className = "twitch-unavailable";
      }
    }
  }

  /**
   * Renders a single Twitch stream card.
   * Opens in a new tab on Twitch — never navigates within GamersHub.
   */
  function renderTwitchCard(stream) {
    const thumbnail = stream.thumbnailUrl || "../assets/img/livestreams/thumbnail.jpg";
    const avatarImg = stream.profileImageUrl
      ? `<img class="twitch-channel-avatar" src="${escapeAttribute(stream.profileImageUrl)}" alt="${escapeAttribute(stream.channelName)}" onerror="this.style.display='none'" />`
      : `<img class="streamer-logo" src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(stream.channelName)}" />`;

    return `
      <a
        class="stream-card stream-card--twitch"
        href="${escapeAttribute(stream.twitchUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        title="Watch ${escapeAttribute(stream.channelName)} on Twitch"
      >
        <div class="stream-thumb-wrap">
          <img
            class="stream-thumb"
            src="${escapeAttribute(thumbnail)}"
            alt="${escapeAttribute(stream.title)}"
            onerror="this.src='../assets/img/livestreams/thumbnail.jpg'"
          />
          <span class="badge-twitch-live"><span class="twitch-pulse"></span>LIVE</span>
          <span class="viewer-chip">${formatCount(stream.viewerCount)} viewers</span>
        </div>
        <div class="stream-info">
          <div class="stream-title">${escapeHtml(stream.title || "Untitled")}</div>
          <div class="stream-meta">
            ${avatarImg}
            <span class="stream-game-tag">${escapeHtml(stream.channelName)}</span>
            <span class="twitch-open-tag">↗ Twitch</span>
          </div>
        </div>
      </a>
    `;
  }
  // ─────────────────────────────────────────────────────────────────────────

  async function loadStreams() {
    try {
      const response = await fetch(`${API_BASE}/api/streams?limit=24`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load livestreams.");
      }

      renderStreams(payload.items || []);
    } catch (error) {
      console.error("Livestream loading failed:", error);
      renderErrorState(error.message || "Failed to load livestreams.");
    }
  }

  function renderLoadingState() {
    if (!livestreamStatus) return;
    livestreamStatus.innerHTML = `
      <div>
        <div class="gh-empty-icon">LIVE</div>
        <h2 class="gh-empty-title">Loading livestreams</h2>
        <p class="gh-empty-subtitle">We are checking the real stream records in your feed database.</p>
      </div>
    `;
  }

  function renderErrorState(message) {
    if (!livestreamStatus) return;
    livestreamStatus.classList.remove("hidden");
    livestreamStatus.innerHTML = `
      <div>
        <div class="gh-empty-icon">ERR</div>
        <h2 class="gh-empty-title">Livestreams are unavailable right now</h2>
        <p class="gh-empty-subtitle">${escapeHtml(message)}</p>
        <div class="gh-empty-actions">
          <button
            type="button"
            class="gh-empty-button"
            data-gh-notification-title="Livestream alerts enabled"
            data-gh-notification-body="We will store livestream-related alerts in your notification panel once the stream service is back online."
            data-gh-notification-href="../player/livestream.html"
            data-gh-notification-label="Saved To Notifications"
          >
            Notify Me When Streams Return
          </button>
        </div>
      </div>
    `;
    streamsSection?.classList.add("hidden");
  }

  function renderStreams(items) {
    if (!livestreamStatus || !streamsSection) return;

    if (!items.length) {
      livestreamStatus.classList.remove("hidden");
      livestreamStatus.innerHTML = `
        <div>
          <div class="gh-empty-icon">LIVE</div>
          <h2 class="gh-empty-title">No livestreams are available yet</h2>
          <p class="gh-empty-subtitle">
            The page is connected to your real stream records. It stays empty until
            an admin creates an actual stream.
          </p>
          <div class="gh-empty-actions">
            <button
              type="button"
              class="gh-empty-button"
              data-gh-notification-title="Livestream alerts enabled"
              data-gh-notification-body="We will store livestream-related alerts in your notification panel once stream publishing is active."
              data-gh-notification-href="../player/livestream.html"
              data-gh-notification-label="Saved To Notifications"
            >
              Notify Me When Streams Go Live
            </button>
            <a href="../player/tournaments.html" class="gh-empty-button ghost">Browse Tournaments</a>
          </div>
        </div>
      `;
      streamsSection.classList.add("hidden");
      return;
    }

    const liveItems = items.filter((s) => s.isLive);
    const offlineItems = items.filter((s) => !s.isLive);

    livestreamStatus.classList.add("hidden");
    streamsSection.classList.remove("hidden");

    let html = "";

    // ── Live Now section ──
    html += `
      <div class="channels-header">
        <div class="channels-title">
          <span class="title-live-dot${liveItems.length ? "" : " title-live-dot--off"}"></span>
          <span>Live Now</span>
        </div>
        <span class="streams-count-badge">${liveItems.length} live</span>
      </div>
    `;
    if (liveItems.length) {
      html += `<div class="channels-grid">${liveItems.map(renderStreamCard).join("")}</div>`;
    } else {
      html += `<p class="streams-offline-note">No streams are currently live. Check back soon.</p>`;
    }

    // ── Past & Recorded section ──
    if (offlineItems.length) {
      html += `
        <div class="channels-header streams-past-header">
          <div class="channels-title channels-title--dim">
            <span class="title-live-dot title-live-dot--off"></span>
            <span>Past &amp; Recorded</span>
          </div>
          <span class="streams-count-badge streams-count-badge--dim">${offlineItems.length} offline</span>
        </div>
        <div class="channels-grid">${offlineItems.map(renderStreamCard).join("")}</div>
      `;
    }

    streamsSection.innerHTML = html;
  }

  function renderStreamCard(stream) {
    const thumbnail = stream.thumbnailUrl || "../assets/img/livestreams/thumbnail.jpg";
    const liveBadge = stream.isLive
      ? `<span class="badge-live"><span class="live-pulse"></span>LIVE</span>`
      : "";
    const tournamentBadge = stream.tournamentId
      ? `<span class="stream-tournament-chip">TRN</span>`
      : "";

    return `
      <a class="stream-card" href="./stream-view.html?streamId=${encodeURIComponent(stream.streamId)}">
        <div class="stream-thumb-wrap">
          <img class="stream-thumb" src="${escapeAttribute(thumbnail)}" alt="${escapeAttribute(stream.title)}" />
          ${liveBadge}
          ${tournamentBadge}
          <span class="viewer-chip">${formatCount(stream.viewerCount)} views</span>
        </div>
        <div class="stream-info">
          <div class="stream-title">${escapeHtml(stream.title || "Untitled stream")}</div>
          <div class="stream-meta">
            <img
              class="streamer-logo"
              src="../assets/icons/player-dashboard-icons/user-profile.png"
              alt="${escapeAttribute(stream.author?.displayName || "Streamer")}"
            />
            <span class="stream-game-tag">${escapeHtml(stream.gameName || "Live stream")}</span>
          </div>
        </div>
      </a>
    `;
  }

  function formatCount(value) {
    const count = Number(value) || 0;
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return String(count);
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
})();
