(() => {
  const SESSION_KEY = "gh_session";

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...session,
        loggedInAt: session?.loggedInAt || new Date().toISOString(),
      }),
    );
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAuthenticated() {
    const session = getSession();
    return Boolean(session?.username);
  }

  function resolveRedirect(candidate, fallbackPath) {
    if (!candidate) {
      return new URL(fallbackPath, window.location.href).href;
    }

    try {
      const resolved = new URL(candidate, window.location.href);
      if (resolved.origin !== window.location.origin) {
        throw new Error("Cross-origin redirects are not allowed.");
      }
      return resolved.href;
    } catch {
      return new URL(fallbackPath, window.location.href).href;
    }
  }

  function requireAuth({ redirectTo = "../auth/login.html" } = {}) {
    const session = getSession();
    if (session?.username) {
      return session;
    }

    const target = new URL(redirectTo, window.location.href);
    target.searchParams.set(
      "redirect",
      `${window.location.pathname}${window.location.search}`,
    );
    window.location.replace(target.href);
    return null;
  }

  function applyUserName(root = document) {
    const session = getSession();
    if (!session?.username) {
      return;
    }

    root.querySelectorAll("[data-gh-user]").forEach((node) => {
      node.textContent = session.username;
    });
  }

  window.GamersHubAuth = {
    getSession,
    setSession,
    clearSession,
    isAuthenticated,
    resolveRedirect,
    requireAuth,
    applyUserName,
  };
})();
