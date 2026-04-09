document.addEventListener("DOMContentLoaded", function () {
  const loginUrl = new URL("./login.html", window.location.href).href;

  const btnGetStarted = document.getElementById("btn-get-started");
  const navLogin = document.getElementById("nav-login");

  function redirectToLogin(event) {
    if (event) {
      event.preventDefault();
    }

    window.location.href = loginUrl;
  }

  if (btnGetStarted) {
    btnGetStarted.addEventListener("click", redirectToLogin);
  }

  if (navLogin) {
    navLogin.addEventListener("click", redirectToLogin);
  }

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
