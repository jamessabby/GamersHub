/* payment-success.js - GamersHub
 * Shown after PayMongo redirects back post-GCash payment.
 * URL: /public/payment-success.html?ref=<publicId>
 */

(function () {
  "use strict";

  const DEFAULT_REMOTE_API_BASE =
    "https://retriever-unwashed-reseller.ngrok-free.dev";
  const API_BASE = resolveApiBase();
  const API = `${API_BASE}/api`;
  const API_HEADERS = API_BASE.includes("ngrok-free")
    ? { "ngrok-skip-browser-warning": "true" }
    : {};

  function $(id) {
    return document.getElementById(id);
  }

  function showCard(id) {
    ["loadingCard", "errorCard", "successCard"].forEach((cardId) => {
      const el = $(cardId);
      if (el) el.style.display = cardId === id ? "" : "none";
    });
  }

  function showError(title, body) {
    $("errorTitle").textContent = title || "Something went wrong";
    $("errorBody").textContent = body || "Please contact support.";
    showCard("errorCard");
  }

  function resolveApiBase() {
    const queryBase = new URLSearchParams(window.location.search).get(
      "apiBase",
    );
    const candidates = [
      queryBase,
      window.GamersHubAuth?.apiBase,
      window.GAMERSHUB_API_BASE,
      isLocalHost() ? "http://localhost:3000" : DEFAULT_REMOTE_API_BASE,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeApiBase(candidate);
      if (normalized) return normalized;
    }
    return DEFAULT_REMOTE_API_BASE;
  }

  function isLocalHost() {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  function normalizeApiBase(value) {
    if (!value) return "";
    const trimmed = String(value).trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
      return url.origin + path;
    } catch {
      return "";
    }
  }

  function formatPeso(amount) {
    const pesos = Math.max(0, Number(amount) || 0) / 100;
    return `PHP ${pesos.toFixed(2)}`;
  }

  function spawnStars() {
    const container = $("stars");
    if (!container) return;

    for (let i = 0; i < 80; i++) {
      const star = document.createElement("div");
      star.className = "star";
      star.style.cssText = [
        `left:${Math.random() * 100}%`,
        `top:${Math.random() * 100}%`,
        `width:${Math.random() * 2 + 1}px`,
        `height:${Math.random() * 2 + 1}px`,
        `animation-delay:${Math.random() * 4}s`,
        `animation-duration:${2 + Math.random() * 3}s`,
      ].join(";");
      container.appendChild(star);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const publicId = params.get("ref");

  spawnStars();

  if (!publicId) {
    showError(
      "Missing reference",
      "No registration reference found in the URL.",
    );
    return;
  }

  fetch(`${API}/tournaments/registration/${encodeURIComponent(publicId)}`, {
    headers: API_HEADERS,
  })
    .then((response) =>
      response
        .json()
        .catch(() => ({}))
        .then((data) => {
          if (!response.ok) {
            const error = new Error(
              response.status === 404 ? "not_found" : "fetch_failed",
            );
            error.status = response.status;
            error.messageFromServer = data?.message || "";
            throw error;
          }
          return data;
        }),
    )
    .then((reg) => {
      const info = $("regInfo");
      if (info) {
        const feeText = reg.feeAmount > 0 ? formatPeso(reg.feeAmount) : "Free";
        info.innerHTML = `
          <div><strong>Team:</strong> ${escHtml(reg.teamName)}</div>
          <div><strong>Tournament:</strong> ${escHtml(reg.tournamentTitle || "-")}</div>
          <div><strong>Contact:</strong> ${escHtml(reg.contactEmail)}</div>
          <div><strong>Fee:</strong> ${feeText}</div>
          <div><strong>Payment status:</strong> <span style="color:#34d399;">${escHtml(reg.paymentStatus || "-")}</span></div>
        `;
      }

      showCard("successCard");
      initUpload(reg);
    })
    .catch((err) => {
      if (err.message === "not_found") {
        showError(
          "Registration not found",
          "We couldn't find a registration with that reference. It may have already been processed.",
        );
        return;
      }

      showError(
        "Network error",
        `Could not load registration from ${API_BASE}. Make sure ngrok is online and forwarding to localhost:3000.`,
      );
    });

  function initUpload(reg) {
    const uploadZone = $("uploadZone");
    const uploadInner = $("uploadInner");
    const uploadPreview = $("uploadPreview");
    const previewImg = $("previewImg");
    const removeBtn = $("removeBtn");
    const fileInput = $("fileInput");
    const uploadBtn = $("uploadBtn");
    const uploadError = $("uploadError");
    const skipUpload = $("skipUpload");

    function showUploadError(msg) {
      uploadError.textContent = msg;
      uploadError.style.display = "";
    }

    function clearUploadError() {
      uploadError.style.display = "none";
    }

    function applyFile(file) {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showUploadError("Receipt must be an image (JPG, PNG, or WebP).");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showUploadError("Image must be smaller than 8 MB.");
        return;
      }

      clearUploadError();
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        uploadInner.style.display = "none";
        uploadPreview.style.display = "flex";
      };
      reader.readAsDataURL(file);

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }

    uploadZone.addEventListener("click", (event) => {
      if (event.target === removeBtn || removeBtn.contains(event.target))
        return;
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) applyFile(fileInput.files[0]);
    });

    uploadZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      uploadZone.classList.add("drag-over");
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("drag-over");
    });

    uploadZone.addEventListener("drop", (event) => {
      event.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (event.dataTransfer.files[0]) applyFile(event.dataTransfer.files[0]);
    });

    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      fileInput.value = "";
      previewImg.src = "";
      uploadInner.style.display = "";
      uploadPreview.style.display = "none";
      clearUploadError();
    });

    uploadBtn.addEventListener("click", () => {
      const file = fileInput.files[0];
      if (!file) {
        showUploadError("Please select your GCash receipt screenshot first.");
        return;
      }
      clearUploadError();
      doUpload(file, reg);
    });

    skipUpload.addEventListener("click", (event) => {
      event.preventDefault();
      showDone(
        "Registration Submitted!",
        `Your registration for "${reg.tournamentTitle || "the tournament"}" has been received. ` +
          `An admin will review it and send your join code to ${reg.contactEmail} once approved.`,
      );
    });
  }

  function doUpload(file, reg) {
    const uploadBtn = $("uploadBtn");
    const uploadBtnText = $("uploadBtnText");
    const uploadLoader = $("uploadLoader");
    const uploadError = $("uploadError");

    uploadBtn.disabled = true;
    uploadBtnText.textContent = "Uploading...";
    uploadLoader.classList.remove("d-none");

    const form = new FormData();
    form.append("paymentProof", file);

    fetch(
      `${API}/tournaments/registration/${encodeURIComponent(reg.publicId)}/upload-proof`,
      {
        method: "POST",
        headers: API_HEADERS,
        body: form,
      },
    )
      .then((response) =>
        response
          .json()
          .catch(() => ({}))
          .then((data) => ({
            ok: response.ok,
            data,
          })),
      )
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || "Upload failed.");
        showDone(
          "Receipt Uploaded!",
          "Your GCash receipt has been saved. " +
            `An admin will review your registration and send your join code to ${reg.contactEmail} once approved.`,
        );
      })
      .catch((err) => {
        uploadError.textContent =
          err.message || "Upload failed. Please try again.";
        uploadError.style.display = "";
        uploadBtn.disabled = false;
        uploadBtnText.textContent = "Upload Receipt";
        uploadLoader.classList.add("d-none");
      });
  }

  function showDone(title, body) {
    $("stepUpload").style.display = "none";
    $("doneTitle").textContent = title;
    $("doneBody").textContent = body;
    $("stepDone").style.display = "";
  }

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
