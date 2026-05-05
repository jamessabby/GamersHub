/* payment-success.js — GamersHub
 * Shown after PayMongo redirects back post-GCash payment.
 * URL: /frontend/public/payment-success.html?ref=<publicId>
 *
 * Flow:
 *  1. Read ?ref= (publicId) from URL
 *  2. Fetch registration details from API
 *  3. Show info + receipt upload form
 *  4. POST receipt image → /api/tournaments/registration/:publicId/upload-proof
 *  5. Show "all done" state
 */

(function () {
  "use strict";

  // ── Helpers ────────────────────────────────────────
  const API = "https://reputable-amigo-thermos.ngrok-free.dev/api";

  function $(id) {
    return document.getElementById(id);
  }

  function showCard(id) {
    ["loadingCard", "errorCard", "successCard"].forEach((c) => {
      const el = $(c);
      if (el) el.style.display = c === id ? "" : "none";
    });
  }

  function showError(title, body) {
    $("errorTitle").textContent = title || "Something went wrong";
    $("errorBody").textContent = body || "Please contact support.";
    showCard("errorCard");
  }

  function formatPeso(amount) {
    const pesos = Number(amount) / 100;
    return "₱" + pesos.toFixed(2);
  }

  // ── Stars ──────────────────────────────────────────
  function spawnStars() {
    const container = document.getElementById("stars");
    if (!container) return;
    for (let i = 0; i < 80; i++) {
      const s = document.createElement("div");
      s.className = "star";
      s.style.cssText = `
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        width:${Math.random() * 2 + 1}px;
        height:${Math.random() * 2 + 1}px;
        animation-delay:${Math.random() * 4}s;
        animation-duration:${2 + Math.random() * 3}s;
      `;
      container.appendChild(s);
    }
  }

  // ── Main ───────────────────────────────────────────
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

  // Fetch registration details
  fetch(`${API}/tournaments/registration/${encodeURIComponent(publicId)}`)
    .then((r) => {
      if (!r.ok) throw new Error("not_found");
      return r.json();
    })
    .then((reg) => {
      // Populate info box
      const info = $("regInfo");
      if (info) {
        const feeText = reg.feeAmount > 0 ? formatPeso(reg.feeAmount) : "Free";
        info.innerHTML = `
          <div><strong>Team:</strong> ${escHtml(reg.teamName)}</div>
          <div><strong>Tournament:</strong> ${escHtml(reg.tournamentTitle || "—")}</div>
          <div><strong>Contact:</strong> ${escHtml(reg.contactEmail)}</div>
          <div><strong>Fee:</strong> ${feeText}</div>
          <div><strong>Payment status:</strong> <span style="color:#34d399;">${escHtml(reg.paymentStatus || "—")}</span></div>
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
      } else {
        showError(
          "Network error",
          "Could not load registration. Please check your connection and try again.",
        );
      }
    });

  // ── Upload flow ────────────────────────────────────
  function initUpload(reg) {
    const uploadZone = $("uploadZone");
    const uploadInner = $("uploadInner");
    const uploadPreview = $("uploadPreview");
    const previewImg = $("previewImg");
    const removeBtn = $("removeBtn");
    const fileInput = $("fileInput");
    const uploadBtn = $("uploadBtn");
    const uploadBtnText = $("uploadBtnText");
    const uploadLoader = $("uploadLoader");
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
      if (e.target === removeBtn || removeBtn.contains(e.target)) return;
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files[0]) applyFile(fileInput.files[0]);
    });

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("drag-over");
    });

    uploadZone.addEventListener("dragleave", () =>
      uploadZone.classList.remove("drag-over"),
    );

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files[0]) applyFile(e.dataTransfer.files[0]);
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
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

    skipUpload.addEventListener("click", (e) => {
      e.preventDefault();
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
    uploadBtnText.textContent = "Uploading…";
    uploadLoader.classList.remove("d-none");

    const form = new FormData();
    form.append("paymentProof", file);

    fetch(
      `${API}/tournaments/registration/${encodeURIComponent(reg.publicId)}/upload-proof`,
      {
        method: "POST",
        body: form,
      },
    )
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || "Upload failed.");
        showDone(
          "Receipt Uploaded!",
          `Your GCash receipt has been saved. ` +
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
