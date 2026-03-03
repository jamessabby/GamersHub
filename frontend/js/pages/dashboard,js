(() => {
  /* ── NAVBAR SCROLL SHADOW ── */
  const topNav = document.getElementById("topNav");
  window.addEventListener("scroll", () => {
    topNav?.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  /* ── SIDEBAR ACTIVE LINK ── */
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".sidebar-link").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  /* ── LIKE TOGGLE ── */
  const likeBtn    = document.getElementById("likeBtn");
  const likeLabel  = document.getElementById("likeLabel");
  const likeIcon   = document.getElementById("likeIcon");
  const countEl    = document.getElementById("reactionCount");

  let liked     = false;
  let baseCount = 1200;

  function parseCount(str) {
    if (str.endsWith("K")) return parseFloat(str) * 1000;
    return parseInt(str, 10);
  }

  function formatCount(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
  }

  function animateCount(target) {
    if (!countEl) return;
    const start     = parseCount(countEl.textContent);
    const diff      = target - start;
    const duration  = 350;
    const startTime = performance.now();

    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      countEl.textContent = formatCount(Math.round(start + diff * ease));
      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  likeBtn?.addEventListener("click", () => {
    liked = !liked;

    if (liked) {
      likeBtn.classList.add("liked");
      likeLabel.textContent = "Liked";
      likeIcon.style.filter = "drop-shadow(0 0 6px rgba(167,139,250,0.8))";
      animateCount(baseCount + 1);
    } else {
      likeBtn.classList.remove("liked");
      likeLabel.textContent = "Like";
      likeIcon.style.filter = "";
      animateCount(baseCount);
    }
  });

  /* ── SEARCH SHORTCUT ── */
  const searchInput = document.getElementById("searchInput");
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  /* ── BELL CLICK ── */
  document.getElementById("bellBtn")?.addEventListener("click", () => {
    const badge = document.querySelector(".bell-badge");
    if (badge) {
      badge.style.transform = "scale(0)";
      badge.style.transition = "transform 0.2s ease";
      setTimeout(() => badge.remove(), 200);
    }
  });

  /* ── CREATE POST FOCUS EFFECT ── */
  document.getElementById("createPostInput")?.addEventListener("click", () => {
    searchInput?.blur();
    /* placeholder for modal/expand logic */
  });
})();