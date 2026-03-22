(() => {
  /* ── NAVBAR SCROLL SHADOW ── */
  const topNav = document.getElementById("topNav");
  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  /* ── SIDEBAR ACTIVE LINK ── */
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href") === "#") e.preventDefault();
      document
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  /* ── GAME AVATAR SELECTION ── */
  const gameAvatars = document.querySelectorAll(".game-avatar-wrap");
  gameAvatars.forEach((wrap) => {
    wrap.addEventListener("click", () => {
      gameAvatars.forEach((w) => w.classList.remove("active"));
      wrap.classList.add("active");
    });
  });

  /* ── STREAM CARD CLICK → open stream-view.html ── */
  document.querySelectorAll(".stream-card, .featured-card").forEach((card) => {
    card.addEventListener("click", () => {
      const streamId = card.dataset.streamId || "1";
      window.location.href = "stream-view.html?streamId=" + streamId;
    });
  });
})();
