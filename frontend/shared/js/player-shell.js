(() => {
  const auth = window.GamersHubAuth;
  if (!auth) {
    return;
  }

  const session = auth.requireAuth({ redirectTo: "../auth/login.html" });
  if (!session) {
    return;
  }

  auth.applyUserName();

  const pageRoutes = {
    home: "../player/dashboard.html",
    livestreams: "../player/livestream.html",
    events: "../player/events.html",
    profile: "../player/profile.html",
  };

  document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
    const route = pageRoutes[link.dataset.page];
    if (route) {
      link.setAttribute("href", route);
    }
  });

  document
    .querySelectorAll(".sidebar-logout, .sidebar-link")
    .forEach((link) => {
      const label = (link.textContent || "").trim().toLowerCase();
      if (label === "logout") {
        link.setAttribute("href", "../auth/logout-confirm.html");
      }
    });

  document.querySelector(".nav-logo-wrap")?.setAttribute(
    "href",
    "../player/dashboard.html",
  );

  const homeLink = Array.from(document.querySelectorAll(".nav-link-item")).find(
    (link) => link.textContent.trim().toLowerCase() === "home",
  );
  homeLink?.setAttribute("href", "../player/dashboard.html");

  const tournamentsLink = Array.from(
    document.querySelectorAll(".nav-link-item"),
  ).find((link) => link.textContent.trim().toLowerCase() === "tournaments");
  tournamentsLink?.setAttribute("href", "../player/tournaments.html");

  const friendsList = document.querySelector(".friends-list");
  if (friendsList && friendsList.dataset.source !== "live") {
    friendsList.innerHTML = `
      <li class="friend-item friend-item-empty">
        <div class="friend-empty-copy">
          <span class="friend-name">No friend activity yet</span>
          <span class="friend-status friend-status-empty">
            Friend presence will appear here once real accounts and connection data are available.
          </span>
        </div>
      </li>
    `;
  }
})();
