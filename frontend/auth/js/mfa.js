(() => {
  const auth = window.GamersHubAuth;
  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const MAX_ATTEMPTS = 5;
  const LOCK_SECS = 30;
  const RESET_SECS = 30;

  const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
  const codeError = document.getElementById("codeError");
  const verifyBtn = document.getElementById("verifyBtn");
  const btnText = verifyBtn.querySelector(".btn-text");
  const btnLoader = document.getElementById("btnLoader");
  const lockoutBanner = document.getElementById("lockoutBanner");
  const lockCountdown = document.getElementById("lockCountdown");
  const resendBtn = document.getElementById("resendBtn");
  const resendCountdown = document.getElementById("resendCountdown");
  const setupPanel = document.getElementById("mfaSetupPanel");
  const setupSecret = document.getElementById("mfaSecret");
  const setupAccount = document.getElementById("mfaAccount");
  const setupCopy = document.getElementById("mfaSetupCopy");

  const pendingMfa = auth?.getPendingMfa?.();

  let submitting = false;
  let failedAttempts = 0;
  let lockTimer = null;
  let resendTimer = null;
  let lockRemaining = 0;
  let resetRemaining = 0;

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

  function showError(message) {
    otpBoxes.forEach((box) => {
      box.classList.remove("input-error");
      void box.offsetWidth;
      box.classList.add("input-error");
    });
    codeError.textContent = message;
    codeError.classList.add("visible");
  }

  function clearError() {
    otpBoxes.forEach((box) => box.classList.remove("input-error"));
    codeError.textContent = "";
    codeError.classList.remove("visible");
  }

  function getCode() {
    return otpBoxes.map((box) => box.value).join("");
  }

  function clearBoxes() {
    otpBoxes.forEach((box) => {
      box.value = "";
      box.classList.remove("filled");
    });
    otpBoxes[0]?.focus();
  }

  function setLocked(locked) {
    otpBoxes.forEach((box) => {
      box.disabled = locked;
    });
    verifyBtn.disabled = locked;
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
        clearError();
        clearBoxes();
      }
    }, 1000);
  }

  function startResetCountdown() {
    resetRemaining = RESET_SECS;
    resendBtn.disabled = true;
    resendCountdown.textContent = `${resetRemaining}s`;
    clearInterval(resendTimer);
    resendTimer = window.setInterval(() => {
      resetRemaining -= 1;
      resendCountdown.textContent = `${resetRemaining}s`;
      if (resetRemaining <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = pendingMfa?.mfaSetupRequired ? "Refresh setup" : "Clear code";
      }
    }, 1000);
  }

  function setLoading(loading) {
    submitting = loading;
    btnText.textContent = loading ? "Verifying..." : "Verify Code";
    btnLoader.classList.toggle("d-none", !loading);
    verifyBtn.disabled = loading;
    otpBoxes.forEach((box) => {
      box.disabled = loading;
    });
  }

  async function fetchSetup() {
    if (!pendingMfa?.mfaSetupRequired) {
      return;
    }

    const response = await fetch(`${API_BASE}/api/auth/mfa/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mfaTicket: pendingMfa.mfaTicket }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load MFA setup details.");
    }

    setupPanel.style.display = "block";
    setupSecret.textContent = payload.secret || "";
    setupAccount.textContent = payload.accountName
      ? `Account: ${payload.accountName}`
      : "Add this secret to your authenticator app.";
    setupCopy.textContent = "Scan or manually enter the secret below, then type the current 6-digit code to finish setup.";
  }

  async function handleVerify() {
    if (submitting || lockRemaining > 0) {
      return;
    }

    const code = getCode();
    if (!/^\d{6}$/.test(code)) {
      showError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mfaTicket: pendingMfa.mfaTicket,
          code,
        }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.message || "Failed to verify MFA.");
      }

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
      auth.clearPendingMfa();

      verifyBtn.classList.add("success");
      btnText.textContent = "Verified!";
      btnLoader.classList.add("d-none");
      const fallback = session.redirectPath
        ? auth.buildAppUrl(session.redirectPath)
        : auth.getRoleHomePath(session.role, session.needsSchoolVerification);

      window.setTimeout(() => {
        if (pendingMfa?.redirect && !session.needsSchoolVerification) {
          window.location.replace(auth.resolveRedirect(pendingMfa.redirect, fallback));
          return;
        }
        window.location.replace(fallback);
      }, 700);
    } catch (error) {
      setLoading(false);
      failedAttempts += 1;

      if (failedAttempts >= MAX_ATTEMPTS) {
        startLockdown();
        return;
      }

      const remaining = MAX_ATTEMPTS - failedAttempts;
      showError(`${error.message || "Invalid verification code."} ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
      clearBoxes();
    }
  }

  otpBoxes.forEach((box, index) => {
    box.addEventListener("keydown", (event) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        if (box.value) {
          box.value = "";
          box.classList.remove("filled");
        } else if (index > 0) {
          otpBoxes[index - 1].focus();
          otpBoxes[index - 1].value = "";
          otpBoxes[index - 1].classList.remove("filled");
        }
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        otpBoxes[index - 1].focus();
      } else if (event.key === "ArrowRight" && index < otpBoxes.length - 1) {
        event.preventDefault();
        otpBoxes[index + 1].focus();
      } else if (event.key === "Enter") {
        void handleVerify();
      }
    });

    box.addEventListener("input", (event) => {
      const value = event.target.value.replace(/[^0-9]/g, "");
      box.value = value ? value[value.length - 1] : "";
      box.classList.toggle("filled", Boolean(box.value));
      clearError();
      if (box.value && index < otpBoxes.length - 1) {
        otpBoxes[index + 1].focus();
      }
    });

    box.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/[^0-9]/g, "")
        .slice(0, 6);
      pasted.split("").forEach((character, pastedIndex) => {
        if (otpBoxes[pastedIndex]) {
          otpBoxes[pastedIndex].value = character;
          otpBoxes[pastedIndex].classList.add("filled");
        }
      });
      const nextEmpty = otpBoxes.findIndex((input) => !input.value);
      (nextEmpty >= 0 ? otpBoxes[nextEmpty] : otpBoxes[otpBoxes.length - 1]).focus();
      clearError();
    });
  });

  resendBtn?.addEventListener("click", async () => {
    if (resendBtn.disabled) return;
    clearBoxes();
    clearError();
    if (pendingMfa?.mfaSetupRequired) {
      try {
        await fetchSetup();
      } catch (error) {
        showError(error.message || "Failed to refresh MFA setup.");
      }
    }
    startResetCountdown();
  });

  verifyBtn.addEventListener("click", () => void handleVerify());

  (async () => {
    if (!pendingMfa?.mfaTicket) {
      window.location.replace(auth.buildAppUrl("auth/login.html"));
      return;
    }

    buildStars();
    startResetCountdown();
    otpBoxes[0]?.focus();

    try {
      await fetchSetup();
    } catch (error) {
      showError(error.message || "Failed to load MFA setup.");
    }
  })();
})();
