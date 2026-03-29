(() => {
  const FEATURED_INTERVAL = 5000;

  const topNav = document.getElementById("topNav");
  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (link.getAttribute("href") === "#") e.preventDefault();
      document
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  const gameAvatars = document.querySelectorAll(".game-selector-avatar");
  gameAvatars.forEach((wrap) => {
    wrap.addEventListener("click", () => {
      gameAvatars.forEach((w) => w.classList.remove("active"));
      wrap.classList.add("active");
    });
  });

  const featuredSlides = Array.from(document.querySelectorAll(".featured-slide"));
  const featuredDots = Array.from(document.querySelectorAll(".featured-dot"));
  const featuredPrev = document.getElementById("featuredPrev");
  const featuredNext = document.getElementById("featuredNext");
  const featuredCarousel = document.getElementById("featuredCarousel");

  let featuredIndex = 0;
  let featuredTimer = null;

  function goToFeatured(index) {
    if (!featuredSlides.length) return;

    featuredSlides[featuredIndex]?.classList.remove("active");
    featuredDots[featuredIndex]?.classList.remove("active");

    featuredIndex = (index + featuredSlides.length) % featuredSlides.length;

    featuredSlides[featuredIndex]?.classList.add("active");
    featuredDots[featuredIndex]?.classList.add("active");
  }

  function startFeaturedAutoplay() {
    if (featuredSlides.length < 2) return;
    clearInterval(featuredTimer);
    featuredTimer = setInterval(() => {
      goToFeatured(featuredIndex + 1);
    }, FEATURED_INTERVAL);
  }

  featuredPrev?.addEventListener("click", (e) => {
    e.stopPropagation();
    goToFeatured(featuredIndex - 1);
    startFeaturedAutoplay();
  });

  featuredNext?.addEventListener("click", (e) => {
    e.stopPropagation();
    goToFeatured(featuredIndex + 1);
    startFeaturedAutoplay();
  });

  featuredDots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      goToFeatured(Number(dot.dataset.index || 0));
      startFeaturedAutoplay();
    });
  });

  featuredCarousel?.addEventListener("mouseenter", () => {
    clearInterval(featuredTimer);
  });

  featuredCarousel?.addEventListener("mouseleave", () => {
    startFeaturedAutoplay();
  });

  document.querySelectorAll(".stream-card, .featured-card").forEach((card) => {
    card.addEventListener("click", () => {
      const streamId = card.dataset.streamId || "1";
      window.location.href = "stream-view.html?streamId=" + streamId;
    });
  });

  goToFeatured(0);
  startFeaturedAutoplay();
})();
