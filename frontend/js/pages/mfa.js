(() => {
  const CORRECT_CODE = "123456";
  const MAX_ATTEMPTS = 5;
  const LOCK_SECS = 30;
  const RESEND_SECS = 30;

  const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
  const codeError = document.getElementById("codeError");
  const verifyBtn = document.getElementById("verifyBtn");
  const btnText = verifyBtn.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const lockoutBanner = document.getElementById("lockoutBanner");
  const lockCountdown = document.getElementById("lockCountdown");
  const resendBtn = document.getElementById("resendBtn");
  const resendCd = document.getElementById("resendCountdown");

  let submitting = false;
  let failedAttempts = 0;
  let lockTimer = null;
  let resendTimer = null;
  let lockRemaining = 0;
  let resendRemaining = 0;

  /* ── STARS ── */
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

  /* ── CAROUSEL ── */
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

    updateLabel(0);
    setInterval(tick, TICK);
  }

  /* ── ERROR HELPERS ── */
  function showError(msg) {
    otpBoxes.forEach((b) => {
      b.classList.remove("input-error");
      void b.offsetWidth;
      b.classList.add("input-error");
    });
    codeError.textContent = msg;
    codeError.classList.add("visible");
  }

  function clearError() {
    otpBoxes.forEach((b) => b.classList.remove("input-error"));
    codeError.textContent = "";
    codeError.classList.remove("visible");
  }

  /* ── OTP HELPERS ── */
  function getCode() {
    return otpBoxes.map((b) => b.value).join("");
  }

  function clearBoxes() {
    otpBoxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled");
    });
    otpBoxes[0]?.focus();
  }

  /* ── OTP KEYBOARD NAV ── */
  otpBoxes.forEach((box, i) => {
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (box.value) {
          box.value = "";
          box.classList.remove("filled");
        } else if (i > 0) {
          otpBoxes[i - 1].focus();
          otpBoxes[i - 1].value = "";
          otpBoxes[i - 1].classList.remove("filled");
        }
      } else if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        otpBoxes[i - 1].focus();
      } else if (e.key === "ArrowRight" && i < otpBoxes.length - 1) {
        e.preventDefault();
        otpBoxes[i + 1].focus();
      } else if (e.key === "Enter") {
        handleVerify();
      }
    });

    box.addEventListener("input", (e) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      box.value = val ? val[val.length - 1] : "";
      box.classList.toggle("filled", !!box.value);
      clearError();
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/[^0-9]/g, "")
        .slice(0, 6);
      pasted.split("").forEach((char, idx) => {
        if (otpBoxes[idx]) {
          otpBoxes[idx].value = char;
          otpBoxes[idx].classList.add("filled");
        }
      });
      const nextEmpty = otpBoxes.findIndex((b) => !b.value);
      (nextEmpty >= 0
        ? otpBoxes[nextEmpty]
        : otpBoxes[otpBoxes.length - 1]
      ).focus();
      clearError();
    });

    box.addEventListener("focus", () => {
      box.select();
    });
  });

  /* ── LOCKDOWN ── */
  function setLocked(v) {
    otpBoxes.forEach((b) => {
      b.disabled = v;
    });
    verifyBtn.disabled = v;
  }

  function startLockdown() {
    lockRemaining = LOCK_SECS;
    setLocked(true);
    lockoutBanner.classList.remove("d-none");
    lockCountdown.textContent = lockRemaining + "s";
    clearInterval(lockTimer);
    lockTimer = setInterval(() => {
      lockRemaining--;
      lockCountdown.textContent = lockRemaining + "s";
      if (lockRemaining <= 0) {
        clearInterval(lockTimer);
        failedAttempts = 0;
        setLocked(false);
        lockoutBanner.classList.add("d-none");
        clearError();
        clearBoxes();
      }
    }, 1000);
  }

  /* ── RESEND ── */
  function startResendCountdown() {
    resendRemaining = RESEND_SECS;
    resendBtn.disabled = true;
    resendCd.textContent = resendRemaining + "s";
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      resendRemaining--;
      resendCd.textContent = resendRemaining + "s";
      if (resendRemaining <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.innerHTML = "Resend code";
      }
    }, 1000);
  }

  resendBtn?.addEventListener("click", () => {
    if (resendBtn.disabled) return;
    startResendCountdown();
    clearBoxes();
    clearError();
  });

  /* ── LOADING ── */
  function setLoading(v) {
    submitting = v;
    btnText.textContent = v ? "Verifying…" : "Verify Code";
    v
      ? btnLoader.classList.remove("d-none")
      : btnLoader.classList.add("d-none");
    verifyBtn.disabled = v;
    setLocked(v);
  }

  /* ── SIMULATE BACKEND ── */
  function simulateVerify(code) {
    return new Promise((res, rej) =>
      setTimeout(
        () => (code === CORRECT_CODE ? res() : rej()),
        1000 + Math.random() * 200,
      ),
    );
  }

  /* ── VERIFY HANDLER ── */
  async function handleVerify() {
    if (submitting || lockRemaining > 0) return;

    const code = getCode();

    if (!code) {
      showError("Please enter your verification code.");
      otpBoxes[0]?.focus();
      return;
    }
    if (code.length < 6) {
      showError("Code must be exactly 6 digits.");
      const firstEmpty = otpBoxes.findIndex((b) => !b.value);
      if (firstEmpty >= 0) otpBoxes[firstEmpty].focus();
      return;
    }

    setLoading(true);

    try {
      await simulateVerify(code);
      verifyBtn.classList.add("success");
      btnText.textContent = "✓ Verified!";
      btnLoader.classList.add("d-none");
      otpBoxes.forEach((b) => {
        b.disabled = true;
      });
      setTimeout(() => {
        window.location.href = "../player/dashboard.html";
      }, 900);
    } catch {
      setLoading(false);
      failedAttempts++;

      if (failedAttempts >= MAX_ATTEMPTS) {
        startLockdown();
        return;
      }

      const left = MAX_ATTEMPTS - failedAttempts;
      showError(
        `Invalid code. ${left} attempt${left !== 1 ? "s" : ""} remaining.`,
      );
      clearBoxes();
    }
  }

  verifyBtn.addEventListener("click", handleVerify);

  /* ── INIT ── */
  buildStars();
  initCarousel();
  startResendCountdown();
  otpBoxes[0]?.focus();
})();
