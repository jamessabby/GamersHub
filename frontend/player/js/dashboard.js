(() => {
  const topNav = document.getElementById("topNav");
  const bellBtn = document.getElementById("bellBtn");
  const searchInput = document.getElementById("searchInput");

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  bellBtn?.addEventListener("click", () => {
    const badge = bellBtn.querySelector(".bell-badge");

    if (!badge) {
      return;
    }

    badge.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    badge.style.transform = "scale(0)";
    badge.style.opacity = "0";
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });
})();
