(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;

  const params = new URLSearchParams(window.location.search);
  const tournamentId = params.get("tournament");

  const topNav = document.getElementById("topNav");
  const sumTitle = document.getElementById("sumTitle");
  const sumMeta = document.getElementById("sumMeta");
  const sumLoading = document.getElementById("sumLoading");
  const sumBody = document.getElementById("sumBody");
  const leaderboardBody = document.getElementById("leaderboardBody");
  const matchBody = document.getElementById("matchBody");

  window.addEventListener("scroll", () => {
    topNav?.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  if (!tournamentId) {
    sumLoading.style.display = "none";
    sumTitle.textContent = "Tournament not found";
    sumMeta.textContent = "No tournament ID was provided in the URL.";
    return;
  }

  void load();

  async function load() {
    try {
      const summaryRes = await fetch(`${API_BASE}/api/tournaments/${tournamentId}/summary`);
      const summary = await summaryRes.json();
      if (!summaryRes.ok) throw new Error(summary.message || "Failed to load summary.");

      const tournament = summary.tournament;
      if (tournament) {
        document.title = `GamersHub – ${tournament.title}`;
        sumTitle.textContent = tournament.title;
        const parts = [];
        if (tournament.gameName) parts.push(tournament.gameName);
        if (tournament.status) parts.push(tournament.status);
        if (tournament.startDate) parts.push(`Started ${formatDate(tournament.startDate)}`);
        sumMeta.textContent = parts.join(" · ");
      } else {
        sumTitle.textContent = `Tournament #${tournamentId}`;
      }

      renderLeaderboard(summary.leaderboard || []);
      renderMatches(summary.schedule || []);

      sumLoading.style.display = "none";
      sumBody.classList.remove("hidden");
    } catch (error) {
      sumLoading.innerHTML = `<p style="color:#f87171;">${escapeHtml(error.message || "Failed to load tournament.")}</p>`;
    }
  }

  function renderLeaderboard(entries) {
    if (!entries.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="5" class="sum-empty">Standings will appear once matches are completed.</td></tr>';
      return;
    }

    const sorted = [...entries].sort((a, b) => {
      const ptsA = (a.wins || 0) * 3;
      const ptsB = (b.wins || 0) * 3;
      return ptsB - ptsA;
    });

    leaderboardBody.innerHTML = sorted.map((row, i) => {
      const rank = i + 1;
      const pts = (row.wins || 0) * 3;
      const rankClass = rank === 1 ? "sum-rank-1" : rank === 2 ? "sum-rank-2" : rank === 3 ? "sum-rank-3" : "";
      return `
        <tr>
          <td class="sum-rank-col ${rankClass}">${rank}</td>
          <td class="sum-team-name">${escapeHtml(row.teamName || `Team #${row.teamId}`)}</td>
          <td>${row.wins ?? 0}</td>
          <td>${row.losses ?? 0}</td>
          <td class="sum-pts">${pts}</td>
        </tr>
      `;
    }).join("");
  }

  function renderMatches(matches) {
    if (!matches.length) {
      matchBody.innerHTML = '<p class="sum-empty">No matches scheduled yet.</p>';
      return;
    }

    matchBody.innerHTML = matches.map((m) => {
      const hasScore = m.teamAScore !== null && m.teamAScore !== undefined
                    && m.teamBScore !== null && m.teamBScore !== undefined;
      const dateStr = m.matchDate
        ? `${formatDate(m.matchDate)}${m.matchTime ? `<br>${m.matchTime.slice(0, 5)}` : ""}`
        : "TBD";

      const scoreHtml = hasScore
        ? `<span class="sum-match-score">${escapeHtml(String(m.teamAScore))} – ${escapeHtml(String(m.teamBScore))}</span>`
        : `<span class="sum-match-vs">VS</span>`;

      const statusHtml = hasScore
        ? `<span class="sum-match-status sum-status-done">Completed</span>`
        : `<span class="sum-match-status sum-status-pending">Scheduled</span>`;

      return `
        <div class="sum-match-card">
          <div class="sum-match-date">${dateStr}</div>
          <div class="sum-match-teams">
            <span>${escapeHtml(m.teamAName || `Team A`)}</span>
            ${scoreHtml}
            <span>${escapeHtml(m.teamBName || `Team B`)}</span>
          </div>
          ${statusHtml}
        </div>
      `;
    }).join("");
  }

  function formatDate(value) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
