(() => {
  const API_BASE = `http://${window.location.hostname || "localhost"}:3000`;
  /* ── STARS ── */
  function buildStars() {
    const container = document.getElementById("stars");
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 75; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = Math.random() * 1.8 + 0.4;
      s.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        --d:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --min-o:${(Math.random() * 0.1 + 0.04).toFixed(2)};
        --max-o:${(Math.random() * 0.5 + 0.25).toFixed(2)};
      `;
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  /* ── CAROUSEL ── */
  function initCarousel() {
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    const bar = document.getElementById("progressBar");
    const prevBtn = document.getElementById("arrowPrev");
    const nextBtn = document.getElementById("arrowNext");

    if (!slides.length) return;

    const SLIDE_DATA = [
      {
        tagline: "Tactical Precision. Ultimate Glory.",
        sub: "Compete in Valorant tournaments worldwide",
      },
      {
        tagline: "Dive into the Ultimate Gaming Experience",
        sub: "Join the Mobile Legends competitive scene",
      },
      {
        tagline: "Rise Through the Ranks",
        sub: "Battle your way to the top of the leaderboard",
      },
      {
        tagline: "Master the Art of Competitive Gaming",
        sub: "Tournaments, stats, and glory await",
      },
    ];

    const INTERVAL = 5000,
      TICK = 50;
    let current = 0,
      elapsed = 0,
      paused = false;

    function updateHero(index) {
      const tagEl = document.getElementById("heroTagline");
      const subEl = document.getElementById("heroSub");
      const wrap = document.querySelector(".hero-text");
      if (!tagEl || !subEl) return;
      tagEl.textContent = SLIDE_DATA[index]?.tagline || "";
      subEl.textContent = SLIDE_DATA[index]?.sub || "";
      if (wrap) {
        wrap.classList.remove("animating");
        void wrap.offsetWidth;
        wrap.classList.add("animating");
      }
    }

    function goTo(index) {
      slides[current].classList.remove("active");
      dots[current]?.classList.remove("active");
      current = (index + slides.length) % slides.length;
      slides[current].classList.add("active");
      dots[current]?.classList.add("active");
      updateHero(current);
      elapsed = 0;
      if (bar) bar.style.width = "0%";
    }

    function tick() {
      if (paused) return;
      elapsed += TICK;
      if (bar)
        bar.style.width = Math.min((elapsed / INTERVAL) * 100, 100) + "%";
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

    updateHero(0);
    setInterval(tick, TICK);
  }

  /* ── ERROR HELPERS ── */
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

  /* ── DOM REFS ── */
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirmPassword");
  const usernameError = document.getElementById("usernameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmError = document.getElementById("confirmError");
  const registerBtn = document.getElementById("registerBtn");
  const btnText = registerBtn?.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const togglePwd = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");
  const googleBtn = document.getElementById("googleBtn");
  const facebookBtn = document.getElementById("facebookBtn");

  /* ── RATE LIMITING ── */
  const RATE_KEY = "gh_reg_attempts";
  const MAX_ATTEMPTS = 5;
  const COOLDOWN_MS = 15000;
  let cooldownTimer = null;
  let submitting = false;

  function getRateData() {
    try {
      return (
        JSON.parse(localStorage.getItem(RATE_KEY)) || {
          count: 0,
          lockedUntil: null,
        }
      );
    } catch {
      return { count: 0, lockedUntil: null };
    }
  }

  function saveRateData(d) {
    localStorage.setItem(RATE_KEY, JSON.stringify(d));
  }
  function resetAttempts() {
    saveRateData({ count: 0, lockedUntil: null });
  }

  function isRateLocked() {
    const d = getRateData();
    if (!d.lockedUntil) return false;
    if (Date.now() < d.lockedUntil) return true;
    resetAttempts();
    return false;
  }

  function incrementAttempts() {
    const d = getRateData();
    d.count++;
    if (d.count >= MAX_ATTEMPTS) d.lockedUntil = Date.now() + COOLDOWN_MS;
    saveRateData(d);
    return d;
  }

  function getRemainingSeconds() {
    const { lockedUntil } = getRateData();
    return lockedUntil
      ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      : 0;
  }

  function startCooldownUI() {
    setFormDisabled(true);
    showError(
      usernameInput,
      usernameError,
      `Too many attempts. Try again in ${getRemainingSeconds()}s.`,
    );
    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      const s = getRemainingSeconds();
      if (s <= 0) {
        clearInterval(cooldownTimer);
        resetAttempts();
        setFormDisabled(false);
        clearError(usernameInput, usernameError);
      } else {
        usernameError.textContent = `Too many attempts. Try again in ${s}s.`;
      }
    }, 1000);
  }

  function setFormDisabled(v) {
    [usernameInput, emailInput, passwordInput, confirmInput].forEach((el) => {
      if (el) el.disabled = v;
    });
    if (registerBtn) registerBtn.disabled = v;
    if (googleBtn) googleBtn.disabled = v;
    if (facebookBtn) facebookBtn.disabled = v;
  }

  function setLoading(v) {
    submitting = v;
    if (!btnText || !btnLoader) return;
    btnText.textContent = v ? "Creating account…" : "Create Account";
    v
      ? btnLoader.classList.remove("d-none")
      : btnLoader.classList.add("d-none");
    if (registerBtn) registerBtn.disabled = v;
    if (googleBtn) googleBtn.disabled = v;
    if (facebookBtn) facebookBtn.disabled = v;
  }

  /* ── PASSWORD TOGGLE ── */
  togglePwd?.addEventListener("click", () => {
    const isText = passwordInput.type === "text";
    passwordInput.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  /* ── VALIDATION RULES ── */
  const RESERVED = [
    "admin",
    "root",
    "support",
    "moderator",
    "superadmin",
    "system",
    "gamershub",
  ];
  const WEAK_PWDS = [
    "12345678",
    "password",
    "password1",
    "qwerty123",
    "11111111",
    "abc12345",
    "iloveyou",
    "letmein1",
  ];

  function validateUsername(v) {
    if (!v) return "Username is required.";
    if (v.length < 3) return "Must be at least 3 characters.";
    if (v.length > 20) return "Cannot exceed 20 characters.";
    if (!/^[a-zA-Z]/.test(v)) return "Must start with a letter.";
    if (/\s/.test(v)) return "Cannot contain spaces.";
    if (!/^[a-zA-Z0-9_]+$/.test(v))
      return "Only letters, numbers, and underscores allowed.";
    if (RESERVED.includes(v.toLowerCase()))
      return "This username is not available.";
    return null;
  }

  function validateEmail(v) {
    if (!v) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return "Please enter a valid email address.";
    return null;
  }

  function validatePassword(v, username) {
    if (!v) return "Password is required.";
    if (v.length < 8) return "Must be at least 8 characters.";
    if (/\s/.test(v)) return "Cannot contain spaces.";
    if (!/[A-Z]/.test(v)) return "Must include an uppercase letter.";
    if (!/[a-z]/.test(v)) return "Must include a lowercase letter.";
    if (!/[0-9]/.test(v)) return "Must include a number.";
    if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?]/.test(v))
      return "Must include a special character.";
    if (WEAK_PWDS.includes(v.toLowerCase()))
      return "Password is too common. Choose a stronger one.";
    if (username && v.toLowerCase() === username.toLowerCase())
      return "Password cannot match your username.";
    return null;
  }

  function validateConfirm(v, password) {
    if (!v) return "Please confirm your password.";
    if (v !== password) return "Passwords do not match.";
    return null;
  }

  /* ── FULL VALIDATION ── */
  function validate() {
    const u = usernameInput.value.trim();
    const e = emailInput.value.trim().toLowerCase();
    const p = passwordInput.value;
    const c = confirmInput.value;

    const uErr = validateUsername(u);
    const eErr = validateEmail(e);
    const pErr = validatePassword(p, u);
    const cErr = validateConfirm(c, p);

    if (uErr) showError(usernameInput, usernameError, uErr);
    else clearError(usernameInput, usernameError);
    if (eErr) showError(emailInput, emailError, eErr);
    else clearError(emailInput, emailError);
    if (pErr) showError(passwordInput, passwordError, pErr);
    else clearError(passwordInput, passwordError);
    if (cErr) showError(confirmInput, confirmError, cErr);
    else clearError(confirmInput, confirmError);

    return !uErr && !eErr && !pErr && !cErr;
  }

  /* ── SIMULATED BACKEND ── */
  async function registerUser({ username, email, password }) {
    let response;

    try {
      response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
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
        message: payload.message || "Registration failed. Please try again.",
      };
    }

    return payload;
  }

  /* ── REGISTER HANDLER ── */
  async function handleRegister() {
    if (submitting) return;
    if (isRateLocked()) {
      startCooldownUI();
      return;
    }
    if (!validate()) return;

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    setLoading(true);

    try {
      await registerUser({
        username,
        email,
        password: passwordInput.value,
      });
      resetAttempts();
      if (btnText) btnText.textContent = "✓ Account created!";
      if (btnLoader) btnLoader.classList.add("d-none");
      setTimeout(() => {
        window.location.href = "../auth/login.html";
      }, 1000);
    } catch (err) {
      setLoading(false);
      const data = incrementAttempts();

      if (data.count >= MAX_ATTEMPTS) {
        startCooldownUI();
        return;
      }

      if (err.status === 0) {
        showError(usernameInput, usernameError, err.message);
        showError(emailInput, emailError, err.message);
      } else if (err.status === 409) {
        if ((err.message || "").toLowerCase().includes("email")) {
          showError(
            emailInput,
            emailError,
            err.message || "An account with this email already exists.",
          );
        } else {
          showError(
            usernameInput,
            usernameError,
            err.message || "This username is already taken.",
          );
        }
      } else if (err.status === 400) {
        if ((err.message || "").toLowerCase().includes("email")) {
          showError(emailInput, emailError, err.message);
        } else {
          showError(usernameInput, usernameError, err.message);
        }
      } else
        showError(
          usernameInput,
          usernameError,
          err.message || "Something went wrong. Please try again.",
        );
    }
  }

  /* ── BLUR VALIDATION (live feedback on leave) ── */
  usernameInput?.addEventListener("blur", () => {
    const err = validateUsername(usernameInput.value.trim());
    if (err) showError(usernameInput, usernameError, err);
    else clearError(usernameInput, usernameError);
  });

  emailInput?.addEventListener("blur", () => {
    const err = validateEmail(emailInput.value.trim().toLowerCase());
    if (err) showError(emailInput, emailError, err);
    else clearError(emailInput, emailError);
  });

  passwordInput?.addEventListener("blur", () => {
    const err = validatePassword(
      passwordInput.value,
      usernameInput.value.trim(),
    );
    if (err) showError(passwordInput, passwordError, err);
    else clearError(passwordInput, passwordError);
  });

  confirmInput?.addEventListener("blur", () => {
    const err = validateConfirm(confirmInput.value, passwordInput.value);
    if (err) showError(confirmInput, confirmError, err);
    else clearError(confirmInput, confirmError);
  });

  /* ── CLEAR ON INPUT ── */
  usernameInput?.addEventListener("input", () =>
    clearError(usernameInput, usernameError),
  );
  emailInput?.addEventListener("input", () =>
    clearError(emailInput, emailError),
  );
  passwordInput?.addEventListener("input", () =>
    clearError(passwordInput, passwordError),
  );
  confirmInput?.addEventListener("input", () =>
    clearError(confirmInput, confirmError),
  );

  /* ── ENTER KEY ── */
  [usernameInput, emailInput, passwordInput, confirmInput].forEach((el) =>
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleRegister();
    }),
  );

  /* ── BUTTON EVENTS ── */
  registerBtn?.addEventListener("click", handleRegister);
  googleBtn?.addEventListener("click", () => {
    if (!submitting) console.log("Google OAuth");
  });
  facebookBtn?.addEventListener("click", () => {
    if (!submitting) console.log("Facebook OAuth");
  });

  /* ── INIT ── */
  buildStars();
  initCarousel();
  if (isRateLocked()) startCooldownUI();
})();
