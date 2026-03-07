(() => {
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

  /* ── DOM REFS ── */
  const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
  const otpStatus = document.getElementById("otpStatus");
  const newPwdInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");
  const confirmError = document.getElementById("confirmError");
  const resetBtn = document.getElementById("resetBtn");
  const btnText = resetBtn?.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const togglePwd = document.getElementById("togglePwd");
  const eyeIcon = document.getElementById("eyeIcon");
  const resendBtn = document.getElementById("resendBtn");

  const CORRECT_CODE = "123456";
  let otpVerified = false;
  let submitting = false;
  let resendTimer = null;
  let resendRemaining = 30;

  /* ── OTP ── */
  otpBoxes.forEach((box, i) => {
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (box.value) {
          box.value = "";
          box.classList.remove("filled", "verified");
        } else if (i > 0) {
          const prev = otpBoxes[i - 1];
          prev.value = "";
          prev.classList.remove("filled", "verified");
          prev.focus();
        }
        checkOTP();
      } else if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        otpBoxes[i - 1].focus();
      } else if (e.key === "ArrowRight" && i < otpBoxes.length - 1) {
        e.preventDefault();
        otpBoxes[i + 1].focus();
      } else if (e.key === "Enter") {
        handleReset();
      }
    });

    box.addEventListener("input", (e) => {
      const val = e.target.value.replace(/[^0-9]/g, "");
      box.value = val ? val[val.length - 1] : "";
      box.classList.toggle("filled", !!box.value);
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
      checkOTP();
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
      const next = otpBoxes.findIndex((b) => !b.value);
      (next >= 0 ? otpBoxes[next] : otpBoxes[otpBoxes.length - 1]).focus();
      checkOTP();
    });

    box.addEventListener("focus", () => box.select());
  });

  function getOTPCode() {
    return otpBoxes.map((b) => b.value).join("");
  }

  function checkOTP() {
    const code = getOTPCode();
    if (code.length < 6) {
      clearOTPStatus();
      otpVerified = false;
      return;
    }
    if (code === CORRECT_CODE) {
      otpVerified = true;
      otpBoxes.forEach((b) => {
        b.classList.remove("input-error");
        b.classList.add("verified");
      });
      setOTPStatus("verified", "✓  Code verified");
    } else {
      otpVerified = false;
      otpBoxes.forEach((b) => {
        b.classList.remove("verified");
        b.classList.remove("input-error");
        void b.offsetWidth;
        b.classList.add("input-error");
      });
      setOTPStatus("error", "Invalid code. Please try again.");
      setTimeout(
        () => otpBoxes.forEach((b) => b.classList.remove("input-error")),
        400,
      );
    }
  }

  function setOTPStatus(type, msg) {
    otpStatus.textContent = msg;
    otpStatus.className = "otp-status " + type;
  }

  function clearOTPStatus() {
    otpStatus.textContent = "";
    otpStatus.className = "otp-status";
  }

  /* ── PASSWORD TOGGLE ── */
  togglePwd?.addEventListener("click", () => {
    const isText = newPwdInput.type === "text";
    newPwdInput.type = isText ? "password" : "text";
    eyeIcon.innerHTML = isText
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  });

  /* ── PASSWORD RULES ── */
  const rules = [
    { id: "rule-lower", test: (v) => /[a-z]/.test(v) },
    { id: "rule-min", test: (v) => v.length >= 8 },
    { id: "rule-upper", test: (v) => /[A-Z]/.test(v) },
    { id: "rule-number", test: (v) => /[0-9]/.test(v) },
    {
      id: "rule-special",
      test: (v) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(v),
    },
  ];

  function allRulesPass() {
    return rules.every(({ test }) => test(newPwdInput.value));
  }

  newPwdInput?.addEventListener("input", () => {
    rules.forEach(({ id, test }) =>
      document
        .getElementById(id)
        ?.classList.toggle("pass", test(newPwdInput.value)),
    );
    if (confirmInput.value) checkConfirm();
  });

  /* ── ERRORS ── */
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

  function checkConfirm() {
    if (confirmInput.value && confirmInput.value !== newPwdInput.value) {
      showError(confirmInput, confirmError, "Passwords do not match.");
    } else {
      clearError(confirmInput, confirmError);
    }
  }

  confirmInput?.addEventListener("input", checkConfirm);

  /* ── RESEND ── */
  function startResend() {
    resendRemaining = 30;
    resendBtn.disabled = true;
    resendBtn.innerHTML = 'Resend in <span id="resendCd">30s</span>';
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      resendRemaining--;
      const cdEl = document.getElementById("resendCd");
      if (cdEl) cdEl.textContent = resendRemaining + "s";
      if (resendRemaining <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend code";
      }
    }, 1000);
  }

  resendBtn?.addEventListener("click", () => {
    if (resendBtn.disabled) return;
    otpBoxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled", "verified", "input-error");
    });
    otpVerified = false;
    clearOTPStatus();
    otpBoxes[0]?.focus();
    startResend();
  });

  /* ── RESET HANDLER ── */
  async function handleReset() {
    if (submitting) return;

    if (!otpVerified) {
      setOTPStatus("error", "Please enter a valid verification code.");
      otpBoxes[0]?.focus();
      return;
    }

    if (!allRulesPass()) {
      newPwdInput.classList.remove("input-error");
      void newPwdInput.offsetWidth;
      newPwdInput.classList.add("input-error");
      setTimeout(() => newPwdInput.classList.remove("input-error"), 400);
      return;
    }

    if (!confirmInput.value || confirmInput.value !== newPwdInput.value) {
      showError(confirmInput, confirmError, "Passwords do not match.");
      return;
    }

    submitting = true;
    if (btnText) btnText.textContent = "Resetting…";
    if (btnLoader) btnLoader.classList.remove("d-none");
    if (resetBtn) resetBtn.disabled = true;

    await new Promise((r) => setTimeout(r, 1100 + Math.random() * 200));

    resetBtn?.classList.add("success");
    if (btnText) btnText.textContent = "✓ Password reset!";
    if (btnLoader) btnLoader.classList.add("d-none");

    setTimeout(() => {
      window.location.href = "../auth/login.html";
    }, 1200);
  }

  resetBtn?.addEventListener("click", handleReset);
  [newPwdInput, confirmInput].forEach((el) =>
    el?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleReset();
    }),
  );

  /* ── INIT ── */
  buildStars();
  startResend();
  otpBoxes[0]?.focus();
})();
