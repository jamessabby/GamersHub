(() => {
  const SESSION_KEY = "gh_session";
  const PENDING_MFA_KEY = "gh_pending_mfa";
  const API_BASE_KEY = "gh_api_base";
  const API_BASE = resolveApiBase();

  function getSession() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY));
      return parsed ? normalizeSession(parsed) : null;
    } catch {
      return null;
    }
  }

  function setSession(session) {
    const normalized = normalizeSession(session);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...normalized,
        loggedInAt: normalized.loggedInAt || new Date().toISOString(),
      }),
    );
    return normalized;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(PENDING_MFA_KEY);
  }

  function isAuthenticated() {
    const session = getSession();
    return Boolean(session?.token && session?.username);
  }

  function resolveRedirect(candidate, fallbackPath) {
    if (!candidate) {
      return buildAppUrl(fallbackPath);
    }

    try {
      const resolved = new URL(candidate, window.location.href);
      if (resolved.origin !== window.location.origin) {
        throw new Error("Cross-origin redirects are not allowed.");
      }
      return resolved.href;
    } catch {
      return buildAppUrl(fallbackPath);
    }
  }

  function requireAuth({ redirectTo = "auth/login.html" } = {}) {
    const session = getSession();
    if (session?.token && session?.username) {
      if (session.needsSchoolVerification && !isSchoolVerificationPath()) {
        window.location.replace(buildAppUrl("auth/school-verification.html"));
        return null;
      }
      return session;
    }

    const target = new URL(buildAppUrl(redirectTo));
    target.searchParams.set(
      "redirect",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    window.location.replace(target.href);
    return null;
  }

  function requireRole(roles, { redirectTo = "auth/login.html" } = {}) {
    const session = requireAuth({ redirectTo });
    if (!session) {
      return null;
    }

    const normalizedRoles = Array.isArray(roles) ? roles.map((role) => String(role).toLowerCase()) : [];
    if (!normalizedRoles.length || normalizedRoles.includes(String(session.role || "").toLowerCase())) {
      return session;
    }

    window.location.replace(getRoleHomePath(session.role));
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

  function getRoleHomePath(role, needsSchoolVerification = false) {
    if (needsSchoolVerification) {
      return buildAppUrl("auth/school-verification.html");
    }

    switch (String(role || "").toLowerCase()) {
      case "superadmin":
        return buildAppUrl("superadmin/dashboard.html");
      case "admin":
        return buildAppUrl("admin/dashboard.html");
      default:
        return buildAppUrl("player/dashboard.html");
    }
  }

  function buildAppUrl(relativePath) {
    if (!relativePath) {
      return window.location.href;
    }

    if (/^https?:\/\//i.test(String(relativePath))) {
      return String(relativePath);
    }

    if (/^(\.\/|\.\.\/)/.test(String(relativePath))) {
      return new URL(String(relativePath), window.location.href).href;
    }

    const normalizedPath = String(relativePath).replace(/^\/+/, "");
    const basePath = getFrontendBasePath();
    if (basePath || normalizedPath.startsWith("auth/") || normalizedPath.startsWith("player/") || normalizedPath.startsWith("admin/") || normalizedPath.startsWith("superadmin/")) {
      return `${window.location.origin}${basePath}/${normalizedPath}`;
    }

    try {
      return new URL(normalizedPath, window.location.href).href;
    } catch {
      return `${window.location.origin}/${normalizedPath}`;
    }
  }

  function getFrontendBasePath() {
    const pathname = window.location.pathname;
    const frontendIndex = pathname.indexOf("/frontend/");
    if (frontendIndex >= 0) {
      return pathname.slice(0, frontendIndex + "/frontend".length);
    }

    const sectionMatch = pathname.match(/^(.*)\/(auth|player|admin|superadmin)(?:\/.*)?$/);
    if (sectionMatch) {
      return sectionMatch[1] || "";
    }

    return "";
  }

  function isSchoolVerificationPath() {
    return /\/auth\/school-verification\.html$/i.test(window.location.pathname);
  }

  function normalizeSession(session) {
    return {
      token: session?.token || "",
      userId: Number(session?.userId) || null,
      username: session?.username || "",
      role: session?.role || "user",
      email: session?.email || "",
      authProvider: session?.authProvider || "local",
      redirectPath: session?.redirectPath || "",
      needsSchoolVerification: Boolean(session?.needsSchoolVerification),
      loggedInAt: session?.loggedInAt || null,
    };
  }

  async function fetchCurrentUser(token = getSession()?.token) {
    if (!token) {
      throw new Error("Authentication token is missing.");
    }

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load current user.");
    }

    return payload;
  }

  function setPendingMfa(pendingState) {
    sessionStorage.setItem(PENDING_MFA_KEY, JSON.stringify(pendingState || null));
  }

  function getPendingMfa() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_MFA_KEY));
    } catch {
      return null;
    }
  }

  function clearPendingMfa() {
    sessionStorage.removeItem(PENDING_MFA_KEY);
  }

  function resolveApiBase() {
    const queryOverride = new URLSearchParams(window.location.search).get("apiBase");
    const normalizedQueryOverride = normalizeApiBase(queryOverride);
    if (normalizedQueryOverride) {
      try {
        localStorage.setItem(API_BASE_KEY, normalizedQueryOverride);
      } catch {
        // storage unavailable; use the override only for this page load
      }
      return normalizedQueryOverride;
    }

    const globalOverride = normalizeApiBase(window.GAMERSHUB_API_BASE);
    if (globalOverride) {
      return globalOverride;
    }

    try {
      const storedOverride = normalizeApiBase(localStorage.getItem(API_BASE_KEY));
      if (storedOverride) {
        return storedOverride;
      }
    } catch {
      // storage unavailable; fall back to local development default
    }

    const host = window.location.hostname || "localhost";
    return `http://${host}:3000`;
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

  function setApiBase(value) {
    const normalized = normalizeApiBase(value);
    if (!normalized) {
      throw new Error("API base must be a valid http or https URL.");
    }
    localStorage.setItem(API_BASE_KEY, normalized);
    return normalized;
  }

  function clearApiBase() {
    localStorage.removeItem(API_BASE_KEY);
  }

  function patchFetch() {
    if (window.__ghFetchPatched) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const requestUrl = typeof input === "string" ? input : input?.url || "";
      const resolvedUrl = requestUrl ? new URL(requestUrl, window.location.href) : null;
      const isApiRequest = Boolean(
        resolvedUrl
        && (
          resolvedUrl.origin === new URL(API_BASE).origin
          || resolvedUrl.pathname.startsWith("/api/")
        ),
      );

      if (!isApiRequest) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined) || {});
      if (!headers.has("ngrok-skip-browser-warning")) {
        headers.set("ngrok-skip-browser-warning", "true");
      }
      if (getSession()?.token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${getSession().token}`);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    window.__ghFetchPatched = true;
  }

  patchFetch();

  window.GamersHubAuth = {
    getSession,
    setSession,
    clearSession,
    isAuthenticated,
    resolveRedirect,
    requireAuth,
    requireRole,
    applyUserName,
    getRoleHomePath,
    buildAppUrl,
    fetchCurrentUser,
    setPendingMfa,
    getPendingMfa,
    clearPendingMfa,
    setApiBase,
    clearApiBase,
    apiBase: API_BASE,
  };
})();
