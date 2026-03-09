(() => {
  /* Navbar scroll shadow */
  const topNav = document.getElementById("topNav");
  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  /* Sidebar navigation */
  const pageRoutes = {
    home: "../player/dashboard.html",
    livestreams: "../player/livestream.html",
  };

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      const page = link.dataset.page;
      const route = page ? pageRoutes[page] : null;

      if (href === "#" && route) {
        e.preventDefault();
        window.location.href = route;
        return;
      }

      if (href === "#") {
        e.preventDefault();
      }

      document
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  /* Like toggle */
  const likeBtn = document.getElementById("likeBtn");
  const likeLabel = document.getElementById("likeLabel");
  const likeIcon = document.getElementById("likeIcon");
  const countEl = document.getElementById("reactionCount");

  let liked = false;
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
    const start = parseCount(countEl.textContent);
    const diff = target - start;
    const duration = 350;
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
      if (likeLabel) likeLabel.textContent = "Liked";
      if (likeIcon) likeIcon.style.filter = "drop-shadow(0 0 6px rgba(167,139,250,0.8))";
      animateCount(baseCount + 1);
    } else {
      likeBtn.classList.remove("liked");
      if (likeLabel) likeLabel.textContent = "Like";
      if (likeIcon) likeIcon.style.filter = "";
      animateCount(baseCount);
    }
  });

  /* Search shortcut */
  const searchInput = document.getElementById("searchInput");
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  /* Bell click */
  document.getElementById("bellBtn")?.addEventListener("click", () => {
    const badge = document.querySelector(".bell-badge");
    if (badge) {
      badge.style.transform = "scale(0)";
      badge.style.transition = "transform 0.2s ease";
      setTimeout(() => badge.remove(), 200);
    }
  });

  /* Create post focus effect */
  document.getElementById("createPostInput")?.addEventListener("click", () => {
    searchInput?.blur();
  });
})();
