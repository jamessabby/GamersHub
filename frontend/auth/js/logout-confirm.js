(() => {
  const cancelBtn = document.getElementById("cancelBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  cancelBtn?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../player/dashboard.html";
  });

  logoutBtn?.addEventListener("click", () => {
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    if (logoutBtn) {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Logging out...";
    }

    if (typeof window.GamersHubAuth?.clearSession === "function") {
      window.GamersHubAuth.clearSession();
    } else {
      try {
        localStorage.removeItem("gh_session");
      } catch {
        // Ignore storage errors and continue redirecting.
      }
    }

    window.location.href = "../auth/login.html";
  });
})();
