(() => {
  // auth-state.js is loaded before this file and exposes window.GamersHubAuth.
  // On this public page there is no session, but apiBase gives the correct backend origin.
  const API_BASE = window.GamersHubAuth?.apiBase
    || `http://${window.location.hostname || "localhost"}:3000`;

  const $ = (id) => document.getElementById(id);
  const tournamentSel = $("regTournament");
  const teamNameInput = $("regTeamName");
  const contactNameInput = $("regContactName");
  const contactEmailInput = $("regContactEmail");
  const contactPhoneInput = $("regContactPhone");
  const playerCountInput = $("regPlayerCount");
  const participantList = $("participantList");
  const addParticipantBtn = $("addParticipantBtn");
  const fileInput = $("regPaymentProof");
  const uploadZone = $("uploadZone");
  const uploadInner = $("uploadInner");
  const uploadPreview = $("uploadPreview");
  const previewImg = $("previewImg");
  const removeProofBtn = $("removeProof");
  const submitBtn = $("submitBtn");
  const globalError = $("globalError");
  const regCard = $("regCard");
  const successCard = $("successCard");
  const successBody = $("successBody");

  // ── Participant list ───────────────────────────────
  function addParticipantRow(value = "") {
    const row = document.createElement("div");
    row.className = "participant-row";
    row.innerHTML = `
      <input type="text" class="input-field participant-input" placeholder="GamersHub username" maxlength="100" value="${value.replace(/"/g, "&quot;")}">
      <button type="button" class="participant-remove" aria-label="Remove">✕</button>
    `;
    row.querySelector(".participant-remove").addEventListener("click", () => row.remove());
    participantList.appendChild(row);
    row.querySelector(".participant-input").focus();
  }

  function getParticipants() {
    return Array.from(participantList.querySelectorAll(".participant-input"))
      .map((el) => el.value.trim())
      .filter(Boolean);
  }

  addParticipantBtn.addEventListener("click", () => addParticipantRow());

  // ── Stars ──────────────────────────────────────────
  function spawnStars() {
    const container = $("stars");
    if (!container) return;
    for (let i = 0; i < 60; i++) {
      const star = document.createElement("div");
      star.className = "star";
      const size = Math.random() * 2 + 1;
      star.style.cssText = [
        `width:${size}px`, `height:${size}px`,
        `left:${Math.random() * 100}%`, `top:${Math.random() * 100}%`,
        `--d:${(Math.random() * 4 + 2).toFixed(1)}s`,
        `--delay:${(Math.random() * 5).toFixed(1)}s`,
        `--min-o:${(Math.random() * 0.15).toFixed(2)}`,
        `--max-o:${(Math.random() * 0.55 + 0.25).toFixed(2)}`,
      ].join(";");
      container.appendChild(star);
    }
  }

  // ── Error display ──────────────────────────────────
  function showError(msg) {
    globalError.textContent = msg;
    globalError.classList.add("visible");
  }

  function clearError() {
    globalError.textContent = "";
    globalError.classList.remove("visible");
  }

  function markInvalid(el) {
    el.classList.add("input-error");
    el.addEventListener("input", () => el.classList.remove("input-error"), { once: true });
  }

  // ── Load tournaments ───────────────────────────────
  async function loadTournaments() {
    try {
      const res = await fetch(`${API_BASE}/api/tournaments`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      const active = list.filter((t) => t.isActive || t.status === "ongoing" || t.status === "upcoming");

      tournamentSel.innerHTML = "";
      if (!active.length) {
        tournamentSel.innerHTML = '<option value="">No open tournaments right now</option>';
        return;
      }

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select a tournament…";
      tournamentSel.appendChild(placeholder);

      active.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.tournamentId;
        opt.textContent = `${t.title}${t.gameName ? ` — ${t.gameName}` : ""}`;
        tournamentSel.appendChild(opt);
      });

      // Pre-select from URL param ?tournament=<id>
      const params = new URLSearchParams(window.location.search);
      const preId = params.get("tournament");
      if (preId) {
        const match = Array.from(tournamentSel.options).find((o) => o.value === preId);
        if (match) tournamentSel.value = preId;
      }
    } catch {
      tournamentSel.innerHTML = '<option value="">Failed to load tournaments</option>';
    }
  }

  // ── File upload ────────────────────────────────────
  function applyFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Payment proof must be an image (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError("Image file must be smaller than 8 MB.");
      return;
    }
    clearError();
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      uploadInner.style.display = "none";
      uploadPreview.style.display = "flex";
    };
    reader.readAsDataURL(file);

    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
  }

  uploadZone.addEventListener("click", (e) => {
    if (e.target === removeProofBtn || removeProofBtn.contains(e.target)) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) applyFile(fileInput.files[0]);
  });

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
  });

  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  });

  removeProofBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.value = "";
    previewImg.src = "";
    uploadInner.style.display = "";
    uploadPreview.style.display = "none";
  });

  // ── Validation ─────────────────────────────────────
  function validate() {
    let ok = true;

    if (!tournamentSel.value) {
      showError("Please select a tournament.");
      markInvalid(tournamentSel);
      ok = false;
    }

    const team = teamNameInput.value.trim();
    if (!team) {
      if (ok) showError("Team name is required.");
      markInvalid(teamNameInput);
      ok = false;
    }

    const contactName = contactNameInput.value.trim();
    if (!contactName) {
      if (ok) showError("Contact person's name is required.");
      markInvalid(contactNameInput);
      ok = false;
    }

    const email = contactEmailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (ok) showError("A valid email address is required.");
      markInvalid(contactEmailInput);
      ok = false;
    }

    const count = parseInt(playerCountInput.value, 10);
    if (!playerCountInput.value || Number.isNaN(count) || count < 1 || count > 20) {
      if (ok) showError("Number of players must be between 1 and 20.");
      markInvalid(playerCountInput);
      ok = false;
    }

    return ok;
  }

  // ── Submit ─────────────────────────────────────────
  async function handleSubmit() {
    clearError();
    if (!validate()) return;

    const btnText = submitBtn.querySelector(".btn-text");
    const loader = $("submitLoader");

    submitBtn.disabled = true;
    btnText.textContent = "Submitting…";
    loader.classList.remove("d-none");

    const fd = new FormData();
    fd.append("tournamentId", tournamentSel.value);
    fd.append("teamName", teamNameInput.value.trim());
    fd.append("contactName", contactNameInput.value.trim());
    fd.append("contactEmail", contactEmailInput.value.trim());
    if (contactPhoneInput.value.trim()) {
      fd.append("contactPhone", contactPhoneInput.value.trim());
    }
    fd.append("playerCount", parseInt(playerCountInput.value, 10));
    const participants = getParticipants();
    if (participants.length) {
      fd.append("participants", JSON.stringify(participants));
    }
    if (fileInput.files[0]) {
      fd.append("paymentProof", fileInput.files[0]);
    }

    try {
      const res = await fetch(`${API_BASE}/api/tournaments/register`, { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        showError(data.message || "Registration failed. Please try again.");
        submitBtn.disabled = false;
        btnText.textContent = "Submit Registration";
        loader.classList.add("d-none");
        return;
      }

      const tourName = tournamentSel.options[tournamentSel.selectedIndex]?.text || "the tournament";
      const teamName = teamNameInput.value.trim();
      const email = contactEmailInput.value.trim();

      if (data.checkoutUrl) {
        successBody.textContent =
          `Your team "${teamName}" has been registered for ${tourName}. ` +
          `You'll be redirected to complete your payment now. ` +
          `Once approved, your join code will be sent to ${email}.`;
        regCard.style.display = "none";
        successCard.style.display = "";
        // Short pause so the user reads the message, then redirect
        setTimeout(() => { window.location.href = data.checkoutUrl; }, 2500);
      } else {
        successBody.textContent =
          `Your team "${teamName}" has been registered for ${tourName}. ` +
          `An admin will review your registration and send your join code to ${email} once approved.`;
        regCard.style.display = "none";
        successCard.style.display = "";
      }
    } catch {
      showError("Network error. Please check your connection and try again.");
      submitBtn.disabled = false;
      btnText.textContent = "Submit Registration";
      loader.classList.add("d-none");
    }
  }

  submitBtn.addEventListener("click", handleSubmit);

  // ── Init ───────────────────────────────────────────
  spawnStars();
  loadTournaments();
})();
