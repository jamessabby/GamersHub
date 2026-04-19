(() => {
  const auth = window.GamersHubAuth;
  const session = auth?.getSession?.();
  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const cancelBtn = document.getElementById("cancelBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  cancelBtn?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = auth?.getRoleHomePath?.(session?.role) || "../player/dashboard.html";
  });

  logoutBtn?.addEventListener("click", async () => {
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";
    }

    try {
      if (session?.token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });
      }
    } catch {
      // Ignore logout API failures and clear the local session anyway.
    }

    auth?.clearSession?.();

    window.location.href = auth?.buildAppUrl?.("auth/login.html") || "../auth/login.html";
  });
})();
