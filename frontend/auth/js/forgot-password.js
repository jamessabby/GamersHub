(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;

  const REQUEST_RESEND_SECONDS = 30;

  const stepRequest = document.getElementById("stepRequest");
  const stepReset = document.getElementById("stepReset");
  const cardSubtitle = document.getElementById("cardSubtitle");
  const usernameInput = document.getElementById("fpUsername");
  const requestError = document.getElementById("requestError");
  const sendCodeBtn = document.getElementById("sendCodeBtn");
  const sendBtnText = sendCodeBtn?.querySelector(".btn-text");
  const sendLoader = document.getElementById("sendLoader");
  const maskedEmailHint = document.getElementById("maskedEmailHint");

  const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
  const otpStatus = document.getElementById("otpStatus");
  const newPwdInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");
  const confirmError = document.getElementById("confirmError");
  const resetBtn = document.getElementById("resetBtn");
  const resetBtnText = resetBtn?.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const togglePwd = document.getElementById("togglePwd");
  const eyeIcon = document.getElementById("eyeIcon");
  const resendBtn = document.getElementById("resendBtn");

  let resetTicket = "";
  let resetUsername = "";
  let resendTimer = null;
  let resendRemaining = REQUEST_RESEND_SECONDS;
  let isRequesting = false;
  let isResetting = false;

  const rules = [
    { id: "rule-lower", test: (value) => /[a-z]/.test(value) },
    { id: "rule-min", test: (value) => value.length >= 8 },
    { id: "rule-upper", test: (value) => /[A-Z]/.test(value) },
    { id: "rule-number", test: (value) => /[0-9]/.test(value) },
    {
      id: "rule-special",
      test: (value) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]/.test(value),
    },
  ];

  buildStars();
  bindOtpInputs();
  bindEvents();
  usernameInput?.focus();

  function bindEvents() {
    sendCodeBtn?.addEventListener("click", () => {
      void handleSendCode();
    });

    usernameInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleSendCode();
      }
    });

    togglePwd?.addEventListener("click", (event) => {
      event.preventDefault();
      const isText = newPwdInput.type === "text";
      newPwdInput.type = isText ? "password" : "text";
      eyeIcon.innerHTML = isText
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
    });

    newPwdInput?.addEventListener("input", () => {
      updatePasswordRules();
      if (confirmInput.value) {
        validateConfirm();
      }
    });

    confirmInput?.addEventListener("input", () => {
      validateConfirm();
    });

    [newPwdInput, confirmInput].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void handleReset();
        }
      });
    });

    resetBtn?.addEventListener("click", () => {
      void handleReset();
    });

    resendBtn?.addEventListener("click", () => {
      if (resendBtn.disabled) {
        return;
      }
      void handleSendCode({ isResend: true });
    });
  }

  function buildStars() {
    const container = document.getElementById("stars");
    if (!container) return;

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 80; index += 1) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 1.8 + 0.4;
      star.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${size}px;
        height:${size}px;
        --d:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 5).toFixed(1)}s;
        --min-o:${(Math.random() * 0.1 + 0.05).toFixed(2)};
        --max-o:${(Math.random() * 0.5 + 0.3).toFixed(2)};
      `;
      fragment.appendChild(star);
    }

    container.appendChild(fragment);
  }

  function bindOtpInputs() {
    otpBoxes.forEach((box, index) => {
      box.addEventListener("keydown", (event) => {
        if (event.key === "Backspace") {
          event.preventDefault();
          if (box.value) {
            box.value = "";
            box.classList.remove("filled", "verified");
          } else if (index > 0) {
            const previous = otpBoxes[index - 1];
            previous.value = "";
            previous.classList.remove("filled", "verified");
            previous.focus();
          }
          clearOtpStatus();
        } else if (event.key === "ArrowLeft" && index > 0) {
          event.preventDefault();
          otpBoxes[index - 1].focus();
        } else if (event.key === "ArrowRight" && index < otpBoxes.length - 1) {
          event.preventDefault();
          otpBoxes[index + 1].focus();
        }
      });

      box.addEventListener("input", (event) => {
        const numericValue = event.target.value.replace(/[^0-9]/g, "");
        box.value = numericValue ? numericValue[numericValue.length - 1] : "";
        box.classList.toggle("filled", Boolean(box.value));
        box.classList.remove("verified");

        if (box.value && index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        }

        clearOtpStatus();
      });

      box.addEventListener("paste", (event) => {
        event.preventDefault();
        const pasted = (event.clipboardData || window.clipboardData)
          .getData("text")
          .replace(/[^0-9]/g, "")
          .slice(0, otpBoxes.length);

        pasted.split("").forEach((character, pastedIndex) => {
          if (!otpBoxes[pastedIndex]) {
            return;
          }
          otpBoxes[pastedIndex].value = character;
          otpBoxes[pastedIndex].classList.add("filled");
          otpBoxes[pastedIndex].classList.remove("verified");
        });

        const nextIndex = otpBoxes.findIndex((otpBox) => !otpBox.value);
        (nextIndex >= 0 ? otpBoxes[nextIndex] : otpBoxes[otpBoxes.length - 1])?.focus();
        clearOtpStatus();
      });

      box.addEventListener("focus", () => {
        box.select();
      });
    });
  }

  async function handleSendCode({ isResend = false } = {}) {
    const username = String(usernameInput?.value || resetUsername).trim();
    if (!username) {
      showInputError(usernameInput, requestError, "Username is required.");
      usernameInput?.focus();
      return;
    }

    if (isRequesting) {
      return;
    }

    isRequesting = true;
    setRequestBusy(true, isResend);
    clearInputError(usernameInput, requestError);
    clearOtpStatus();

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Failed to send reset code.");
      }

      resetUsername = username;
      resetTicket = payload.resetTicket || "";
      usernameInput.value = username;

      if (!resetTicket) {
        throw new Error("Reset session was not created. Please try again.");
      }

      revealResetStep(payload.maskedEmail || "your email");
      resetOtpBoxes();
      startResendCountdown();
      setOtpStatus("verified", isResend ? "A new reset code has been sent." : "Reset code sent successfully.");
    } catch (error) {
      if (stepReset?.style.display === "none" || !stepReset?.style.display) {
        showInputError(usernameInput, requestError, error.message || "Failed to send reset code.");
      } else {
        setOtpStatus("error", error.message || "Failed to resend reset code.");
      }
    } finally {
      isRequesting = false;
      setRequestBusy(false, isResend);
    }
  }

  function revealResetStep(maskedEmail) {
    if (stepRequest) {
      stepRequest.style.display = "none";
    }
    if (stepReset) {
      stepReset.style.display = "block";
    }
    if (maskedEmailHint) {
      maskedEmailHint.textContent = `We sent a 6-digit reset code to ${maskedEmail}.`;
    }
    if (cardSubtitle) {
      cardSubtitle.textContent = "Enter the code from your email, then choose a new password.";
    }
    otpBoxes[0]?.focus();
  }

  async function handleReset() {
    if (isResetting) {
      return;
    }

    const code = getOtpCode();
    const newPassword = String(newPwdInput?.value || "");
    const confirmPassword = String(confirmInput?.value || "");

    if (!resetTicket) {
      setOtpStatus("error", "Please request a reset code first.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setOtpStatus("error", "Please enter the full 6-digit reset code.");
      otpBoxes[0]?.focus();
      return;
    }

    if (!allRulesPass(newPassword)) {
      shakeInput(newPwdInput);
      return;
    }

    if (!confirmPassword || confirmPassword !== newPassword) {
      showInputError(confirmInput, confirmError, "Passwords do not match.");
      return;
    }

    isResetting = true;
    setResetBusy(true);
    clearInputError(confirmInput, confirmError);
    clearOtpStatus();

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetTicket,
          code,
          newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Failed to reset password.");
      }

      otpBoxes.forEach((box) => {
        box.classList.remove("input-error");
        box.classList.add("verified");
      });
      setOtpStatus("verified", "Password reset successful.");
      resetBtn?.classList.add("success");

      if (resetBtnText) {
        resetBtnText.textContent = "Password Reset!";
      }

      window.setTimeout(() => {
        window.location.href = "../auth/login.html";
      }, 1200);
    } catch (error) {
      setOtpStatus("error", error.message || "Failed to reset password.");
      if (/code/i.test(String(error.message || ""))) {
        otpBoxes[0]?.focus();
      }
      setResetBusy(false);
      isResetting = false;
      return;
    }
  }

  function setRequestBusy(isBusy, isResend) {
    if (sendCodeBtn) {
      sendCodeBtn.disabled = isBusy;
    }
    if (sendLoader) {
      sendLoader.classList.toggle("d-none", !isBusy);
    }
    if (sendBtnText) {
      sendBtnText.textContent = isBusy
        ? (isResend ? "Sending Again..." : "Sending...")
        : "Send Reset Code";
    }
  }

  function setResetBusy(isBusy) {
    if (resetBtn) {
      resetBtn.disabled = isBusy;
    }
    if (btnLoader) {
      btnLoader.classList.toggle("d-none", !isBusy);
    }
    if (resetBtnText) {
      resetBtnText.textContent = isBusy ? "Resetting..." : "Reset Password";
    }
  }

  function updatePasswordRules() {
    const passwordValue = String(newPwdInput?.value || "");
    rules.forEach(({ id, test }) => {
      document.getElementById(id)?.classList.toggle("pass", test(passwordValue));
    });
  }

  function allRulesPass(passwordValue) {
    return rules.every(({ test }) => test(String(passwordValue || "")));
  }

  function validateConfirm() {
    const confirmValue = String(confirmInput?.value || "");
    if (confirmValue && confirmValue !== String(newPwdInput?.value || "")) {
      showInputError(confirmInput, confirmError, "Passwords do not match.");
      return false;
    }

    clearInputError(confirmInput, confirmError);
    return true;
  }

  function getOtpCode() {
    return otpBoxes.map((box) => box.value).join("");
  }

  function resetOtpBoxes() {
    otpBoxes.forEach((box) => {
      box.value = "";
      box.classList.remove("filled", "verified", "input-error");
    });
    clearOtpStatus();
  }

  function setOtpStatus(type, message) {
    if (!otpStatus) {
      return;
    }
    otpStatus.textContent = message;
    otpStatus.className = `otp-status ${type}`;
  }

  function clearOtpStatus() {
    if (!otpStatus) {
      return;
    }
    otpStatus.textContent = "";
    otpStatus.className = "otp-status";
  }

  function startResendCountdown() {
    resendRemaining = REQUEST_RESEND_SECONDS;
    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.innerHTML = `Resend in <span id="resendCd">${REQUEST_RESEND_SECONDS}s</span>`;
    }

    window.clearInterval(resendTimer);
    resendTimer = window.setInterval(() => {
      resendRemaining -= 1;
      const countdown = document.getElementById("resendCd");
      if (countdown) {
        countdown.textContent = `${Math.max(0, resendRemaining)}s`;
      }

      if (resendRemaining <= 0) {
        window.clearInterval(resendTimer);
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.textContent = "Resend code";
        }
      }
    }, 1000);
  }

  function showInputError(input, errorNode, message) {
    if (input) {
      input.classList.remove("input-error");
      void input.offsetWidth;
      input.classList.add("input-error");
    }
    if (errorNode) {
      errorNode.textContent = message;
      errorNode.classList.add("visible");
    }
  }

  function clearInputError(input, errorNode) {
    input?.classList.remove("input-error");
    if (errorNode) {
      errorNode.textContent = "";
      errorNode.classList.remove("visible");
    }
  }

  function shakeInput(input) {
    if (!input) {
      return;
    }
    input.classList.remove("input-error");
    void input.offsetWidth;
    input.classList.add("input-error");
    window.setTimeout(() => {
      input.classList.remove("input-error");
    }, 400);
  }
})();
