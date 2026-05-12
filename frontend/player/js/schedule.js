(() => {
  const API_BASE = resolveApiBase();
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
        titleNode.textContent =
          payload.tournament?.title || "Tournament Schedule";
      }

      if (subtitleNode) {
        subtitleNode.textContent = payload.items?.length
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
      void hydrateTeamBanners();
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
              ${
                match.teamABannerUrl
                  ? renderTeamBanner(match.teamABannerUrl, match.teamAName)
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
              ${
                match.teamBBannerUrl
                  ? renderTeamBanner(match.teamBBannerUrl, match.teamBName)
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

  function renderTeamBanner(path, teamName) {
    const src = resolveAssetUrl(path);
    const initials = escapeHtml(getInitials(teamName));

    return `
      <img
        class="sch-team-banner"
        data-banner-src="${escapeAttribute(src)}"
        alt="${escapeAttribute(teamName)}"
        onerror="this.hidden=true;this.nextElementSibling.hidden=false;"
        hidden
      >
      <div class="sch-team-avatar" hidden>${initials}</div>
    `;
  }

  async function hydrateTeamBanners() {
    const banners = document.querySelectorAll(".sch-team-banner[data-banner-src]");
    await Promise.all(
      [...banners].map(async (img) => {
        const fallback = img.nextElementSibling;
        try {
          const response = await fetch(img.dataset.bannerSrc, {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          });
          const contentType = response.headers.get("content-type") || "";

          if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
            throw new Error(`Banner image failed to load (${response.status}).`);
          }

          const blob = await response.blob();
          img.onload = () => {
            img.hidden = false;
            if (fallback) {
              fallback.hidden = true;
            }
          };
          img.onerror = () => showBannerFallback(img);
          img.src = URL.createObjectURL(blob);
        } catch (error) {
          console.warn("Team banner failed to load:", img.dataset.bannerSrc, error);
          showBannerFallback(img);
        }
      }),
    );
  }

  function showBannerFallback(img) {
    img.hidden = true;
    if (img.nextElementSibling) {
      img.nextElementSibling.hidden = false;
    }
  }

  function resolveApiBase() {
    const configuredBase =
      window.GamersHubAuth?.apiBase ||
      window.GAMERSHUB_API_BASE ||
      getStoredApiBase();
    const normalizedBase = normalizeApiBase(configuredBase);
    if (normalizedBase) {
      return normalizedBase;
    }

    const host = window.location.hostname || "localhost";
    return `http://${isLocalHost(host) ? host : "localhost"}:3000`;
  }

  function getStoredApiBase() {
    try {
      return localStorage.getItem("gh_api_base");
    } catch {
      return "";
    }
  }

  function normalizeApiBase(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }
      return url.origin;
    } catch {
      return "";
    }
  }

  function isLocalHost(host) {
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  function resolveAssetUrl(path) {
    const value = String(path || "").trim();
    if (!value) {
      return "";
    }
    try {
      return new URL(value, `${API_BASE}/`).href;
    } catch {
      return value;
    }
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
