(() => {
  const auth = window.GamersHubAuth;
  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;

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
  const googleBtn = document.getElementById("googleBtn");
  const togglePwd = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  let submitting = false;

  if (auth?.getSession?.()?.token) {
    window.location.replace(auth.getRoleHomePath(auth.getSession().role, auth.getSession().needsSchoolVerification));
    return;
  }

  function buildStars() {
    const container = document.getElementById("stars");
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let index = 0; index < 75; index += 1) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 1.8 + 0.4;
      star.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        --d:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --min-o:${(Math.random() * 0.1 + 0.04).toFixed(2)};
        --max-o:${(Math.random() * 0.5 + 0.25).toFixed(2)};
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
    const tagline = document.getElementById("heroTagline");
    const sub = document.getElementById("heroSub");

    if (!slides.length) return;

    const slideData = [
      {
        tagline: "Tactical Precision. Ultimate Glory.",
        sub: "Compete in Valorant tournaments across campus.",
      },
      {
        tagline: "Dive into the Ultimate Gaming Experience",
        sub: "Join the Mobile Legends competitive scene.",
      },
      {
        tagline: "Rise Through the Ranks",
        sub: "Build your profile and get ready for match day.",
      },
      {
        tagline: "Master the Art of Competitive Gaming",
        sub: "Community, tournaments, and livestreams in one place.",
      },
    ];

    const intervalMs = 5000;
    const tickMs = 50;
    let current = 0;
    let elapsed = 0;
    let paused = false;

    function updateHero(index) {
      tagline.textContent = slideData[index]?.tagline || "";
      sub.textContent = slideData[index]?.sub || "";
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
      elapsed += tickMs;
      if (bar) bar.style.width = `${Math.min((elapsed / intervalMs) * 100, 100)}%`;
      if (elapsed >= intervalMs) goTo(current + 1);
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

    updateHero(0);
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

  function validateUsername(value) {
    if (!value) return "Username is required.";
    if (value.length < 3) return "Must be at least 3 characters.";
    if (value.length > 20) return "Cannot exceed 20 characters.";
    if (!/^[a-zA-Z]/.test(value)) return "Must start with a letter.";
    if (/\s/.test(value)) return "Cannot contain spaces.";
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores allowed.";
    return null;
  }

  function validateEmail(value) {
    if (!value) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Please enter a valid email address.";
    return null;
  }

  function validatePassword(value, username) {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Must be at least 8 characters.";
    if (!/[A-Z]/.test(value)) return "Must include an uppercase letter.";
    if (!/[a-z]/.test(value)) return "Must include a lowercase letter.";
    if (!/[0-9]/.test(value)) return "Must include a number.";
    if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(value)) return "Must include a special character.";
    if (username && value.toLowerCase() === username.toLowerCase()) return "Password cannot match your username.";
    return null;
  }

  function validateConfirm(value, password) {
    if (!value) return "Please confirm your password.";
    if (value !== password) return "Passwords do not match.";
    return null;
  }

  function validate() {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    const usernameValidation = validateUsername(username);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, username);
    const confirmValidation = validateConfirm(confirm, password);

    if (usernameValidation) showError(usernameInput, usernameError, usernameValidation);
    else clearError(usernameInput, usernameError);

    if (emailValidation) showError(emailInput, emailError, emailValidation);
    else clearError(emailInput, emailError);

    if (passwordValidation) showError(passwordInput, passwordError, passwordValidation);
    else clearError(passwordInput, passwordError);

    if (confirmValidation) showError(confirmInput, confirmError, confirmValidation);
    else clearError(confirmInput, confirmError);

    return !(usernameValidation || emailValidation || passwordValidation || confirmValidation);
  }

  function setLoading(loading) {
    submitting = loading;
    btnText.textContent = loading ? "Creating account..." : "Create Account";
    btnLoader.classList.toggle("d-none", !loading);
    registerBtn.disabled = loading;
    googleBtn.disabled = loading;
  }

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

  async function handleRegister() {
    if (submitting) return;
    if (!validate()) return;

    setLoading(true);
    try {
      await registerUser({
        username: usernameInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        password: passwordInput.value,
      });
      btnText.textContent = "Account created!";
      btnLoader.classList.add("d-none");
      window.setTimeout(() => {
        window.location.href = auth.buildAppUrl("auth/login.html");
      }, 900);
    } catch (error) {
      setLoading(false);
      if (error.status === 409) {
        if ((error.message || "").toLowerCase().includes("email")) {
          showError(emailInput, emailError, error.message);
        } else {
          showError(usernameInput, usernameError, error.message);
        }
        return;
      }

      if (error.status === 400) {
        if ((error.message || "").toLowerCase().includes("email")) {
          showError(emailInput, emailError, error.message);
        } else {
          showError(usernameInput, usernameError, error.message);
        }
        return;
      }

      const message = error.message || "Registration failed. Please try again.";
      showError(usernameInput, usernameError, message);
      showError(emailInput, emailError, message);
    }
  }

  function startGoogleLogin() {
    const redirectBase = new URL("..", auth.buildAppUrl("auth/register.html")).href.replace(/\/$/, "");
    window.location.href = `${API_BASE}/api/auth/google/start?redirectBase=${encodeURIComponent(redirectBase)}`;
  }

  togglePwd?.addEventListener("click", () => {
    const isText = passwordInput.type === "text";
    passwordInput.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  usernameInput?.addEventListener("input", () => clearError(usernameInput, usernameError));
  emailInput?.addEventListener("input", () => clearError(emailInput, emailError));
  passwordInput?.addEventListener("input", () => clearError(passwordInput, passwordError));
  confirmInput?.addEventListener("input", () => clearError(confirmInput, confirmError));
  [usernameInput, emailInput, passwordInput, confirmInput].forEach((element) => {
    element?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void handleRegister();
      }
    });
  });

  registerBtn?.addEventListener("click", () => void handleRegister());
  googleBtn?.addEventListener("click", startGoogleLogin);

  buildStars();
  initCarousel();
})();
