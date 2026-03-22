(() => {
  window.GamersHubAuth?.clearSession();

  const status = document.getElementById("logoutStatus");
  if (status) {
    status.textContent = "You have been logged out. Redirecting to login...";
  }

  setTimeout(() => {
    window.location.replace("../auth/login.html");
  }, 1000);
})();
