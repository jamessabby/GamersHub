(() => {
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");

  function openSchedule(event) {
    const row = event.currentTarget.closest(".trn-row");
    const tournamentId = row?.dataset.id;

    if (!tournamentId) {
      return;
    }

    event.preventDefault();
    window.location.href = `./schedule.html?tournament=${encodeURIComponent(tournamentId)}`;
  }

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  document.querySelectorAll(".trn-row").forEach((row) => {
    row.addEventListener("click", openSchedule);
  });

  document.querySelectorAll(".trn-row-cta").forEach((button) => {
    button.addEventListener("click", openSchedule);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });
})();
