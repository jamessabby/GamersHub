(() => {
  const auth = window.GamersHubAuth;
  const API_BASE = `http://${window.location.hostname || "localhost"}:3000`;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;
  const STORAGE_KEY = "gh_login_attempts";
  const requestedRedirect = new URLSearchParams(window.location.search).get(
    "redirect",
  );

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");
  const loginBtn = document.getElementById("loginBtn");
  const btnText = loginBtn.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const googleBtn = document.getElementById("googleBtn");
  const facebookBtn = document.getElementById("facebookBtn");
  const lockoutBanner = document.getElementById("lockoutBanner");
  const countdownEl = document.getElementById("countdownTimer");
  const togglePwd = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  let countdownInterval = null;

  function buildStars() {
    const container = document.getElementById("stars");
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = Math.random() * 1.8 + 0.4;
      s.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        --d:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --min-o:${(Math.random() * 0.1 + 0.05).toFixed(2)};
        --max-o:${(Math.random() * 0.5 + 0.3).toFixed(2)};
      `;
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  togglePwd?.addEventListener("click", () => {
    const isText = passwordInput.type === "text";
    passwordInput.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  function showError(input, el, msg) {
    input.classList.remove("input-error");
    void input.offsetWidth;
    input.classList.add("input-error");
    el.textContent = msg;
    el.classList.add("visible");
  }

  function clearError(input, el) {
    input.classList.remove("input-error");
    el.textContent = "";
    el.classList.remove("visible");
  }

  function clearAll() {
    clearError(usernameInput, usernameError);
    clearError(passwordInput, passwordError);
  }

  function validate() {
    const u = usernameInput.value.trim();
    const p = passwordInput.value;
    let ok = true;

    if (!u) {
      showError(usernameInput, usernameError, "Username is required.");
      ok = false;
    } else {
      clearError(usernameInput, usernameError);
    }

    if (!p) {
      showError(passwordInput, passwordError, "Password is required.");
      ok = false;
    } else {
      clearError(passwordInput, passwordError);
    }

    return ok;
  }

  function getData() {
    try {
      return (
        JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
          count: 0,
          lockedUntil: null,
        }
      );
    } catch {
      return { count: 0, lockedUntil: null };
    }
  }

  function saveData(d) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  }

  function resetAttempts() {
    saveData({ count: 0, lockedUntil: null });
  }

  function increment() {
    const d = getData();
    d.count++;
    if (d.count >= MAX_ATTEMPTS) d.lockedUntil = Date.now() + LOCKOUT_MS;
    saveData(d);
    return d;
  }

  function isLocked() {
    const { lockedUntil } = getData();
    if (!lockedUntil) return false;
    if (Date.now() < lockedUntil) return true;
    resetAttempts();
    return false;
  }

  function remaining() {
    const { lockedUntil } = getData();
    return lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0;
  }

  function fmt(ms) {
    const t = Math.ceil(ms / 1000);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }

  function startCooldown() {
    setLocked(true);
    lockoutBanner.classList.remove("d-none");
    countdownEl.textContent = fmt(remaining());
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const r = remaining();
      countdownEl.textContent = fmt(r);
      if (r <= 0) {
        clearInterval(countdownInterval);
        resetAttempts();
        setLocked(false);
        lockoutBanner.classList.add("d-none");
      }
    }, 1000);
  }

  function setLocked(v) {
    usernameInput.disabled = v;
    passwordInput.disabled = v;
    loginBtn.disabled = v;
    googleBtn.disabled = v;
    facebookBtn.disabled = v;
  }

  function setLoading(v) {
    btnText.textContent = v ? "Signing in..." : "Login";
    v
      ? btnLoader.classList.remove("d-none")
      : btnLoader.classList.add("d-none");
    loginBtn.disabled = googleBtn.disabled = facebookBtn.disabled = v;
  }

  async function loginUser({ username, password }) {
    let response;

    try {
      response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw {
        status: 0,
        message: `Cannot reach backend at ${API_BASE}. Run \`npm run dev\` in the backend folder.`,
      };
    }

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: payload.message || "Invalid credentials.",
      };
    }

    return payload;
  }

  async function handleLogin() {
    clearAll();
    if (isLocked()) {
      startCooldown();
      return;
    }
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = await loginUser({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      });
      resetAttempts();
      const authenticatedUser = payload.user || {};
      auth?.setSession({
        userId: authenticatedUser.userId,
        username: authenticatedUser.username || usernameInput.value.trim(),
        role: authenticatedUser.role || "user",
        email: authenticatedUser.email || "",
      });
      btnText.textContent = "Welcome back";
      setTimeout(() => {
        window.location.href = auth
          ? auth.resolveRedirect(requestedRedirect, "../player/dashboard.html")
          : "../player/dashboard.html";
      }, 900);
    } catch (err) {
      setLoading(false);

      if (err.status === 0) {
        showError(usernameInput, usernameError, err.message);
        showError(passwordInput, passwordError, err.message);
        return;
      }

      const d = increment();
      if (d.count >= MAX_ATTEMPTS) {
        startCooldown();
      } else {
        const left = MAX_ATTEMPTS - d.count;
        const baseMsg = err.message || "Invalid credentials.";
        const msg = `${baseMsg} ${left} attempt${left !== 1 ? "s" : ""} remaining.`;
        showError(usernameInput, usernameError, msg);
        showError(passwordInput, passwordError, msg);
      }
    }
  }

  function initCarousel() {
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    const bar = document.getElementById("progressBar");
    const prevBtn = document.getElementById("arrowPrev");
    const nextBtn = document.getElementById("arrowNext");
    const tagEl = document.getElementById("gameTag");
    const descEl = document.getElementById("gameDesc");
    const label = document.getElementById("slideLabel");

    if (!slides.length) return;

    const SLIDE_DATA = [
      { tag: "VALORANT", desc: "Tactical 5v5 character-based shooter" },
      { tag: "MOBILE LEGENDS", desc: "5v5 MOBA battle arena" },
      { tag: "CS2", desc: "The world's premier FPS esport" },
      { tag: "LEAGUE OF LEGENDS", desc: "Strategic team-based MOBA" },
    ];

    const INTERVAL = 5000;
    const TICK = 50;
    let current = 0;
    let elapsed = 0;
    let paused = false;
    let timer = null;

    function updateLabel(index) {
      if (!tagEl || !descEl) return;
      tagEl.textContent = SLIDE_DATA[index]?.tag || "";
      descEl.textContent = SLIDE_DATA[index]?.desc || "";
      if (label) {
        label.classList.remove("animating");
        void label.offsetWidth;
        label.classList.add("animating");
      }
    }

    function goTo(index) {
      slides[current].classList.remove("active");
      dots[current]?.classList.remove("active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("active");
      dots[current]?.classList.add("active");
      updateLabel(current);
      elapsed = 0;
      if (bar) bar.style.width = "0%";
    }

    function tick() {
      if (paused) return;
      elapsed += TICK;
      if (bar) {
        bar.style.width = Math.min((elapsed / INTERVAL) * 100, 100) + "%";
      }
      if (elapsed >= INTERVAL) goTo(current + 1);
    }

    prevBtn?.addEventListener("click", () => goTo(current - 1));
    nextBtn?.addEventListener("click", () => goTo(current + 1));
    dots.forEach((d) =>
      d.addEventListener("click", () => goTo(Number(d.dataset.index))),
    );

    const wrapper = document.querySelector(".image-wrapper");
    wrapper?.addEventListener("mouseenter", () => {
      paused = true;
    });
    wrapper?.addEventListener("mouseleave", () => {
      paused = false;
    });

    updateLabel(0);
    timer = setInterval(tick, TICK);
    void timer;
  }

  function initParallax() {
    const card = document.getElementById("loginCard");
    if (!card) return;
    document.addEventListener("mousemove", (e) => {
      const dx = (e.clientX - window.innerWidth * 0.75) / window.innerWidth;
      const dy = (e.clientY - window.innerHeight * 0.5) / window.innerHeight;
      card.style.transform = `translateY(-3px) rotateY(${dx * 2}deg) rotateX(${-dy * 1.5}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  }

  usernameInput.addEventListener("input", () =>
    clearError(usernameInput, usernameError),
  );
  passwordInput.addEventListener("input", () =>
    clearError(passwordInput, passwordError),
  );
  [usernameInput, passwordInput].forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    }),
  );

  loginBtn.addEventListener("click", handleLogin);
  googleBtn.addEventListener("click", () => console.log("Google OAuth"));
  facebookBtn.addEventListener("click", () => console.log("Facebook OAuth"));

  if (auth?.isAuthenticated()) {
    window.location.replace(
      auth.resolveRedirect(requestedRedirect, "../player/dashboard.html"),
    );
    return;
  }

  buildStars();
  initParallax();
  initCarousel();
  if (isLocked()) startCooldown();
})();
