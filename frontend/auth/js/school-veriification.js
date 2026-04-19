(() => {
  const auth = window.GamersHubAuth;
  const session = auth?.requireAuth?.({ redirectTo: "auth/login.html" });
  if (!session) {
    return;
  }

  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
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

  function validateEmail(value) {
    if (!value) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Invalid email format.";
    return null;
  }

  function validateStudent(value) {
    if (!value) return "Student number is required.";
    if (!/^\d{8}$/.test(value)) return "Student number must be exactly 8 digits.";
    return null;
  }

  function validateDepartment(value) {
    if (!value) return "Department is required.";
    if (value.length < 3) return "Department is too short.";
    return null;
  }

  function validateCourse(value) {
    if (!value) return "Course & year level is required.";
    if (value.length < 3) return "Course & year level is too short.";
    return null;
  }

  function validate() {
    const email = emailInput.value.trim().toLowerCase();
    const student = studentInput.value.trim();
    const department = deptInput.value.trim();
    const courseYear = courseInput.value.trim().toUpperCase();

    const emailValidation = validateEmail(email);
    const studentValidation = validateStudent(student);
    const departmentValidation = validateDepartment(department);
    const courseValidation = validateCourse(courseYear);

    if (emailValidation) showError(emailInput, emailError, emailValidation);
    else clearError(emailInput, emailError);

    if (studentValidation) showError(studentInput, studentError, studentValidation);
    else clearError(studentInput, studentError);

    if (departmentValidation) showError(deptInput, deptError, departmentValidation);
    else clearError(deptInput, deptError);

    if (courseValidation) showError(courseInput, courseError, courseValidation);
    else clearError(courseInput, courseError);

    if (!courseValidation) {
      courseInput.value = courseYear;
    }

    return !(emailValidation || studentValidation || departmentValidation || courseValidation);
  }

  function setLoading(loading) {
    submitting = loading;
    btnText.textContent = loading ? "Saving..." : "Verify Student Identity";
    btnLoader.classList.toggle("d-none", !loading);
    submitBtn.disabled = loading;
    [emailInput, studentInput, deptInput, courseInput].forEach((input) => {
      input.disabled = loading;
    });
  }

  function setLocked(locked) {
    [emailInput, studentInput, deptInput, courseInput].forEach((input) => {
      input.disabled = locked;
    });
    submitBtn.disabled = locked;
  }

  function startLockdown() {
    lockRemaining = LOCK_SECS;
    setLocked(true);
    lockoutBanner.classList.remove("d-none");
    lockCountdown.textContent = `${lockRemaining}s`;
    clearInterval(lockTimer);
    lockTimer = window.setInterval(() => {
      lockRemaining -= 1;
      lockCountdown.textContent = `${lockRemaining}s`;
      if (lockRemaining <= 0) {
        clearInterval(lockTimer);
        failedAttempts = 0;
        setLocked(false);
        lockoutBanner.classList.add("d-none");
      }
    }, 1000);
  }

  async function loadExistingProfile() {
    const response = await fetch(`${API_BASE}/api/users/profile/${session.userId}`);
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load profile.");
    }

    emailInput.value = payload.email || session.email || "";
    studentInput.value = payload.studentId && !String(payload.studentId).startsWith("TEMP-") ? payload.studentId : "";
    deptInput.value = payload.school || "";
    courseInput.value = payload.courseYear || "";
  }

  async function submitVerification() {
    if (submitting || lockRemaining > 0) return;
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/profile/${session.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentInput.value.trim(),
          school: deptInput.value.trim(),
          courseYear: courseInput.value.trim().toUpperCase(),
        }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.message || "Failed to save verification details.");
      }

      const nextSession = auth.setSession({
        ...session,
        needsSchoolVerification: false,
      });

      btnText.textContent = "Verified!";
      btnLoader.classList.add("d-none");
      window.setTimeout(() => {
        window.location.replace(auth.getRoleHomePath(nextSession.role));
      }, 700);
    } catch (error) {
      setLoading(false);
      failedAttempts += 1;
      if (failedAttempts >= MAX_ATTEMPTS) {
        startLockdown();
        return;
      }

      showError(emailInput, emailError, error.message || "Verification failed.");
    }
  }

  emailInput.addEventListener("input", () => clearError(emailInput, emailError));
  studentInput.addEventListener("input", () => {
    studentInput.value = studentInput.value.replace(/[^0-9]/g, "");
    clearError(studentInput, studentError);
  });
  deptInput.addEventListener("input", () => clearError(deptInput, deptError));
  courseInput.addEventListener("input", () => clearError(courseInput, courseError));
  [emailInput, studentInput, deptInput, courseInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void submitVerification();
      }
    });
  });

  submitBtn.addEventListener("click", () => void submitVerification());

  (async () => {
    buildStars();
    try {
      await loadExistingProfile();
    } catch (error) {
      showError(emailInput, emailError, error.message || "Failed to load your profile.");
    }
  })();
})();
