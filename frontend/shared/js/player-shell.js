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
        link.setAttribute("href", "../auth/logout.html");
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
})();
