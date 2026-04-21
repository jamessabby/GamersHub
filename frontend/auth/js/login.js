(() => {
  const auth = window.GamersHubAuth;
  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;
  const STORAGE_KEY = "gh_login_attempts";
  const requestedRedirect = new URLSearchParams(window.location.search).get("redirect");

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const usernameError = document.getElementById("usernameError");
  const passwordError = document.getElementById("passwordError");
  const loginBtn = document.getElementById("loginBtn");
  const btnText = loginBtn.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const googleBtn = document.getElementById("googleBtn");
  const lockoutBanner = document.getElementById("lockoutBanner");
  const countdownEl = document.getElementById("countdownTimer");
  const togglePwd = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  let countdownInterval = null;

  function buildStars() {
    const container = document.getElementById("stars");
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let index = 0; index < 80; index += 1) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 1.8 + 0.4;
      star.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        --d:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --min-o:${(Math.random() * 0.1 + 0.05).toFixed(2)};
        --max-o:${(Math.random() * 0.5 + 0.3).toFixed(2)};
      `;
      frag.appendChild(star);
    }
    container.appendChild(frag);
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

    const slideData = [
      { tag: "VALORANT", desc: "Tactical 5v5 character-based shooter" },
      { tag: "MOBILE LEGENDS", desc: "5v5 MOBA battle arena" },
      { tag: "CS2", desc: "The world's premier FPS esport" },
      { tag: "LEAGUE OF LEGENDS", desc: "Strategic team-based MOBA" },
    ];

    const intervalMs = 5000;
    const tickMs = 50;
    let current = 0;
    let elapsed = 0;
    let paused = false;

    function updateLabel(index) {
      if (!tagEl || !descEl) return;
      tagEl.textContent = slideData[index]?.tag || "";
      descEl.textContent = slideData[index]?.desc || "";
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
      elapsed += tickMs;
      if (bar) {
        bar.style.width = `${Math.min((elapsed / intervalMs) * 100, 100)}%`;
      }
      if (elapsed >= intervalMs) {
        goTo(current + 1);
      }
    }

    prevBtn?.addEventListener("click", () => goTo(current - 1));
    nextBtn?.addEventListener("click", () => goTo(current + 1));
    dots.forEach((dot) => dot.addEventListener("click", () => goTo(Number(dot.dataset.index))));

    const wrapper = document.querySelector(".image-wrapper");
    wrapper?.addEventListener("mouseenter", () => {
      paused = true;
    });
    wrapper?.addEventListener("mouseleave", () => {
      paused = false;
    });

    updateLabel(0);
    window.setInterval(tick, tickMs);
  }

  function showError(input, element, message) {
    input.classList.remove("input-error");
    void input.offsetWidth;
    input.classList.add("input-error");
    element.textContent = message;
    element.classList.add("visible");
  }

  function clearError(input, element) {
    input.classList.remove("input-error");
    element.textContent = "";
    element.classList.remove("visible");
  }

  function validate() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (!username) {
      showError(usernameInput, usernameError, "Username is required.");
      valid = false;
    } else {
      clearError(usernameInput, usernameError);
    }

    if (!password) {
      showError(passwordInput, passwordError, "Password is required.");
      valid = false;
    } else {
      clearError(passwordInput, passwordError);
    }

    return valid;
  }

  function getAttemptData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { count: 0, lockedUntil: null };
    } catch {
      return { count: 0, lockedUntil: null };
    }
  }

  function saveAttemptData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function resetAttempts() {
    saveAttemptData({ count: 0, lockedUntil: null });
  }

  function incrementAttempts() {
    const data = getAttemptData();
    data.count += 1;
    if (data.count >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    saveAttemptData(data);
    return data;
  }

  function isLocked() {
    const { lockedUntil } = getAttemptData();
    if (!lockedUntil) return false;
    if (Date.now() < lockedUntil) return true;
    resetAttempts();
    return false;
  }

  function remainingMs() {
    const { lockedUntil } = getAttemptData();
    return lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0;
  }

  function formatCountdown(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startCooldown() {
    setLocked(true);
    lockoutBanner.classList.remove("d-none");
    countdownEl.textContent = formatCountdown(remainingMs());
    clearInterval(countdownInterval);
    countdownInterval = window.setInterval(() => {
      const nextRemaining = remainingMs();
      countdownEl.textContent = formatCountdown(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(countdownInterval);
        resetAttempts();
        setLocked(false);
        lockoutBanner.classList.add("d-none");
      }
    }, 1000);
  }

  function setLocked(locked) {
    usernameInput.disabled = locked;
    passwordInput.disabled = locked;
    loginBtn.disabled = locked;
    googleBtn.disabled = locked;
  }

  function setLoading(loading) {
    btnText.textContent = loading ? "Signing in..." : "Login";
    btnLoader.classList.toggle("d-none", !loading);
    loginBtn.disabled = loading;
    googleBtn.disabled = loading;
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
    if (isLocked()) {
      startCooldown();
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const payload = await loginUser({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      });
      resetAttempts();

      if (payload.mfaRequired) {
        auth?.setPendingMfa({
          mfaTicket: payload.mfaTicket,
          mfaSetupRequired: Boolean(payload.mfaSetupRequired),
          user: payload.user || null,
          redirect: requestedRedirect || "",
        });
        window.location.href = auth.buildAppUrl("auth/mfa.html");
        return;
      }

      if (payload.token && payload.user) {
        const session = auth.setSession({
          token: payload.token,
          userId: payload.user.userId,
          username: payload.user.username,
          role: payload.user.role,
          email: payload.user.email,
          authProvider: payload.user.authProvider || payload.authProvider || "local",
          redirectPath: payload.redirectPath,
          needsSchoolVerification: payload.needsSchoolVerification,
        });
        redirectAfterAuth(session);
        return;
      }

      throw { status: 500, message: "Unexpected login response." };
    } catch (error) {
      setLoading(false);

      if (error.status === 0) {
        showError(usernameInput, usernameError, error.message);
        showError(passwordInput, passwordError, error.message);
        return;
      }

      const attempts = incrementAttempts();
      if (attempts.count >= MAX_ATTEMPTS) {
        startCooldown();
        return;
      }

      const left = MAX_ATTEMPTS - attempts.count;
      const message = `${error.message || "Invalid credentials."} ${left} attempt${left !== 1 ? "s" : ""} remaining.`;
      showError(usernameInput, usernameError, message);
      showError(passwordInput, passwordError, message);
    }
  }

  async function handleOAuthResultFromHash() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const oauthStatus = hashParams.get("oauth");
    if (!oauthStatus) {
      return false;
    }

    if (oauthStatus === "error") {
      const message = hashParams.get("message") || "External sign-in failed.";
      showError(usernameInput, usernameError, message);
      showError(passwordInput, passwordError, message);
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return true;
    }

    const token = hashParams.get("token");
    if (!token) {
      showError(usernameInput, usernameError, "External sign-in returned an invalid session.");
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return true;
    }

    setLoading(true);
    try {
      const payload = await auth.fetchCurrentUser(token);
      const session = auth.setSession({
        token,
        userId: payload.user.userId,
        username: payload.user.username,
        role: payload.user.role,
        email: payload.user.email,
        authProvider: payload.user.authProvider || "local",
        redirectPath: payload.redirectPath,
        needsSchoolVerification: payload.needsSchoolVerification,
      });
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      redirectAfterAuth(session);
      return true;
    } catch (error) {
      setLoading(false);
      const message = error.message || "External sign-in failed.";
      showError(usernameInput, usernameError, message);
      showError(passwordInput, passwordError, message);
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return true;
    }
  }

  function redirectAfterAuth(session) {
    const fallback = session?.redirectPath
      ? auth.buildAppUrl(session.redirectPath)
      : auth.getRoleHomePath(session?.role, session?.needsSchoolVerification);

    if (requestedRedirect && !session?.needsSchoolVerification) {
      window.location.replace(auth.resolveRedirect(requestedRedirect, fallback));
      return;
    }

    window.location.replace(fallback);
  }

  function startGoogleLogin() {
    const redirectBase = new URL("..", auth.buildAppUrl("auth/login.html")).href.replace(/\/$/, "");
    window.location.href = `${API_BASE}/api/auth/google/start?redirectBase=${encodeURIComponent(redirectBase)}`;
  }

  togglePwd?.addEventListener("click", () => {
    const isText = passwordInput.type === "text";
    passwordInput.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  usernameInput.addEventListener("input", () => clearError(usernameInput, usernameError));
  passwordInput.addEventListener("input", () => clearError(passwordInput, passwordError));
  [usernameInput, passwordInput].forEach((element) => {
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void handleLogin();
      }
    });
  });

  loginBtn.addEventListener("click", () => void handleLogin());
  googleBtn.addEventListener("click", startGoogleLogin);

  (async () => {
    buildStars();
    initCarousel();
    if (isLocked()) {
      startCooldown();
    }

    const handledOAuth = await handleOAuthResultFromHash();
    if (handledOAuth) {
      return;
    }

    const currentSession = auth?.getSession?.();
    if (currentSession?.token) {
      redirectAfterAuth(currentSession);
    }
  })();
})();
