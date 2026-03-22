(() => {
  const MAX_ATTEMPTS = 5;
  const LOCK_SECS = 30;

  const emailInput = document.getElementById("schoolEmail");
  const studentInput = document.getElementById("studentNumber");
  const deptInput = document.getElementById("department");
  const courseInput = document.getElementById("courseYear");
  const emailError = document.getElementById("emailError");
  const studentError = document.getElementById("studentError");
  const deptError = document.getElementById("deptError");
  const courseError = document.getElementById("courseError");
  const submitBtn = document.getElementById("submitBtn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const lockoutBanner = document.getElementById("lockoutBanner");
  const lockCountdown = document.getElementById("lockCountdown");

  let submitting = false;
  let failedAttempts = 0;
  let lockTimer = null;
  let lockRemaining = 0;

  const inputs = [emailInput, studentInput, deptInput, courseInput];

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

    const INTERVAL = 5000,
      TICK = 50;
    let current = 0,
      elapsed = 0,
      paused = false;

    function updateLabel(i) {
      if (!tagEl || !descEl) return;
      tagEl.textContent = SLIDE_DATA[i]?.tag || "";
      descEl.textContent = SLIDE_DATA[i]?.desc || "";
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

  /* ── VALIDATION ── */
  const PUBLIC_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
  ];

  function validateEmail(v) {
    if (!v) return "School email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return "Invalid email format.";
    const domain = v.split("@")[1];
    if (PUBLIC_DOMAINS.includes(domain))
      return "School email must use @dlsud.edu.ph domain.";
    if (domain !== "dlsud.edu.ph")
      return "School email must use @dlsud.edu.ph domain.";
    return null;
  }

  function validateStudent(v) {
    if (!v) return "Student number is required.";
    if (!/^\d+$/.test(v)) return "Student number must contain numbers only.";
    if (v.length !== 8) return "Student number must be exactly 8 digits.";
    if (/^(.)\1{7}$/.test(v)) return "Invalid student number.";
    return null;
  }

  function validateDept(v) {
    if (!v) return "Please enter your college department.";
    if (v.length < 2) return "Please enter your college department.";
    if (/[^a-zA-Z0-9 ]/.test(v)) return "No special characters allowed.";
    return null;
  }

  function validateCourse(v) {
    if (!v) return "Course and year level is required.";
    if (/[^a-zA-Z0-9]/.test(v)) return "No special characters allowed.";
    if (!/[a-zA-Z]/.test(v))
      return "Course must contain letters and year level.";
    if (!/[0-9]/.test(v)) return "Course must contain letters and year level.";
    return null;
  }

  function validate() {
    const email = emailInput.value.trim().toLowerCase();
    const student = studentInput.value.trim();
    const dept = deptInput.value.trim();
    const course = courseInput.value.trim().toUpperCase();

    const eErr = validateEmail(email);
    const sErr = validateStudent(student);
    const dErr = validateDept(dept);
    const cErr = validateCourse(course);

    if (eErr) showError(emailInput, emailError, eErr);
    else clearError(emailInput, emailError);
    if (sErr) showError(studentInput, studentError, sErr);
    else clearError(studentInput, studentError);
    if (dErr) showError(deptInput, deptError, dErr);
    else clearError(deptInput, deptError);
    if (cErr) showError(courseInput, courseError, cErr);
    else clearError(courseInput, courseError);

    // auto-uppercase course on valid
    if (!cErr) courseInput.value = course;

    return !eErr && !sErr && !dErr && !cErr;
  }

  /* ── SIMULATED BACKEND ── */
  const REGISTERED_EMAILS = [
    "jdelacruz@dlsud.edu.ph",
    "mreyes@dlsud.edu.ph",
    "agarcia@dlsud.edu.ph",
  ];
  const VALID_STUDENT_NUMS = ["20230001", "20230002", "20230003"];
  const VERIFIED_EMAILS = ["agarcia@dlsud.edu.ph"];

  function simulateBackend(email, studentNum) {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          if (VERIFIED_EMAILS.includes(email))
            return reject({
              field: "email",
              message: "This account is already verified.",
            });
          if (!REGISTERED_EMAILS.includes(email))
            return reject({
              field: "email",
              message: "School email not found in records.",
            });
          if (!VALID_STUDENT_NUMS.includes(studentNum))
            return reject({
              field: "student",
              message: "Student record not found.",
            });
          if (
            REGISTERED_EMAILS.indexOf(email) !==
            VALID_STUDENT_NUMS.indexOf(studentNum)
          )
            return reject({
              field: "student",
              message: "Student number does not match email.",
            });
          if (Math.random() < 0.05)
            return reject({
              field: "server",
              message: "Server error. Please try again.",
            });
          resolve();
        },
        1000 + Math.random() * 200,
      );
    });
  }

  /* ── LOCKDOWN ── */
  function setFormDisabled(v) {
    inputs.forEach((el) => {
      el.disabled = v;
    });
    submitBtn.disabled = v;
  }

  function startLockdown() {
    lockRemaining = LOCK_SECS;
    setFormDisabled(true);
    lockoutBanner.classList.remove("d-none");
    lockCountdown.textContent = lockRemaining + "s";
    clearInterval(lockTimer);
    lockTimer = setInterval(() => {
      lockRemaining--;
      lockCountdown.textContent = lockRemaining + "s";
      if (lockRemaining <= 0) {
        clearInterval(lockTimer);
        failedAttempts = 0;
        setFormDisabled(false);
        lockoutBanner.classList.add("d-none");
      }
    }, 1000);
  }

  /* ── LOADING ── */
  function setLoading(v) {
    submitting = v;
    btnText.textContent = v ? "Verifying…" : "Verify Student Identity";
    v
      ? btnLoader.classList.remove("d-none")
      : btnLoader.classList.add("d-none");
    submitBtn.disabled = v;
    inputs.forEach((el) => {
      el.disabled = v;
    });
  }

  /* ── SUBMIT HANDLER ── */
  async function handleSubmit() {
    if (submitting || lockRemaining > 0) return;
    if (!validate()) return;

    const email = emailInput.value.trim().toLowerCase();
    const student = studentInput.value.trim();

    setLoading(true);

    try {
      await simulateBackend(email, student);
      submitBtn.classList.add("success");
      btnText.textContent = "✓ Verified!";
      btnLoader.classList.add("d-none");
      inputs.forEach((el) => {
        el.disabled = true;
      });
      setTimeout(() => {
        window.location.href = "../player/dashboard.html";
      }, 900);
    } catch (err) {
      setLoading(false);
      failedAttempts++;

      if (failedAttempts >= MAX_ATTEMPTS) {
        startLockdown();
        return;
      }

      if (err.field === "email") showError(emailInput, emailError, err.message);
      else if (err.field === "student")
        showError(studentInput, studentError, err.message);
      else
        showError(
          emailInput,
          emailError,
          err.message || "Something went wrong. Please try again.",
        );
    }
  }

  /* ── CLEAR ON INPUT ── */
  emailInput.addEventListener("input", () =>
    clearError(emailInput, emailError),
  );
  studentInput.addEventListener("input", () => {
    studentInput.value = studentInput.value.replace(/[^0-9]/g, "");
    clearError(studentInput, studentError);
  });
  deptInput.addEventListener("input", () => clearError(deptInput, deptError));
  courseInput.addEventListener("input", () =>
    clearError(courseInput, courseError),
  );

  /* ── ENTER KEY ── */
  inputs.forEach((el) =>
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSubmit();
    }),
  );

  submitBtn.addEventListener("click", handleSubmit);

  /* ── INIT ── */
  buildStars();
  initCarousel();
})();
