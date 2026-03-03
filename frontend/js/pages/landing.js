document.addEventListener("DOMContentLoaded", function () {
  /* ── EXISTING: Button navigation ── */
  const btnGetStarted = document.getElementById("btn-get-started");
  const navLogin = document.getElementById("nav-login");

  if (btnGetStarted) {
    btnGetStarted.addEventListener("click", function () {
      window.location.href = "auth/login.html";
    });
  }

  if (navLogin) {
    navLogin.addEventListener("click", function (e) {
      e.preventDefault();
      window.location.href = "auth/login.html";
    });
  }

  /* ── NAVBAR SCROLL EFFECT ── */
  const navbar = document.querySelector(".gh-navbar");
  if (navbar) {
    window.addEventListener(
      "scroll",
      function () {
        if (window.scrollY > 20) {
          navbar.classList.add("scrolled");
        } else {
          navbar.classList.remove("scrolled");
        }
      },
      { passive: true },
    );
  }

  /* ── PARALLAX: subtle logo movement on mouse ── */
  const heroLogo = document.querySelector(".gh-hero-logo");
  if (heroLogo) {
    document.addEventListener(
      "mousemove",
      function (e) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (e.clientX - cx) / cx;
        const dy = (e.clientY - cy) / cy;
        const moveX = dx * 6;
        const moveY = dy * 6;
        heroLogo.style.transform = `translate(${moveX}px, ${moveY}px) translateY(var(--float-offset, 0px))`;
      },
      { passive: true },
    );

    document.addEventListener("mouseleave", function () {
      heroLogo.style.transform = "";
    });
  }
});
