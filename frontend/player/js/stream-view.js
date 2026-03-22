(() => {
  /* Navbar scroll shadow */
  const topNav = document.getElementById("topNav");
  window.addEventListener("scroll", () => {
    topNav?.classList.toggle("scrolled", window.scrollY > 8);
  });

  /* Like button toggle */
  const likeBtn = document.getElementById("likeBtn");
  const likeCount = document.getElementById("likeCount");
  let likeBase = 24100;
  let liked = false;

  likeBtn?.addEventListener("click", () => {
    liked = !liked;
    likeBtn.classList.toggle("liked", liked);
    likeBase += liked ? 1 : -1;
    if (likeCount) {
      likeCount.textContent =
        likeBase >= 1000 ? (likeBase / 1000).toFixed(1) + "K" : likeBase;
    }
  });

  /* Follow button toggle */
  const followBtn = document.getElementById("followBtn");
  let following = false;

  followBtn?.addEventListener("click", () => {
    following = !following;
    followBtn.classList.toggle("following", following);
    followBtn.textContent = following ? "Following" : "+ Follow";
  });

  /* Comment send */
  const commentInput = document.getElementById("commentInput");
  const sendBtn = document.getElementById("sendCommentBtn");
  const commentsList = document.getElementById("commentsList");

  function sendComment() {
    const text = commentInput?.value.trim();
    if (!text) return;

    const li = document.createElement("li");
    li.className = "comment-item";
    li.innerHTML = `
      <div class="comment-avatar">
        <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt=""
             onerror="this.style.background='rgba(124,58,237,0.3)'" />
      </div>
      <div class="comment-body">
        <span class="comment-username">You</span>
        <p class="comment-text">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    `;

    commentsList?.appendChild(li);
    commentInput.value = "";
    if (commentsList) commentsList.scrollTop = commentsList.scrollHeight;
  }

  sendBtn?.addEventListener("click", sendComment);
  commentInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendComment();
  });

  /* Gift modal */
  const streamId = new URLSearchParams(location.search).get("streamId") || "1";
  const userId = 1; /* TODO: replace with actual session user ID */
  const GIFT_API_URL = "http://localhost:3000/api/streams/send-gift";

  const sendGiftBtn = document.getElementById("sendGiftBtn");
  const modalOverlay = document.getElementById("giftModalOverlay");
  const cancelGiftBtn = document.getElementById("cancelGiftBtn");
  const closeGiftBtn = document.getElementById("closeGiftBtn");
  const confirmGiftBtn = document.getElementById("confirmGiftBtn");
  const confirmText = document.getElementById("confirmBtnText");
  const confirmSpinner = document.getElementById("confirmBtnSpinner");
  const giftQtyInput = document.getElementById("giftQuantity");
  const giftTotalEl = document.getElementById("giftTotal");
  const giftTypeSelect = document.getElementById("giftType");
  const giftTypeGrid = document.getElementById("giftTypeGrid");
  const successMsg = document.getElementById("giftSuccessMsg");
  const qtyMinus = document.getElementById("qtyMinus");
  const qtyPlus = document.getElementById("qtyPlus");

  const GIFT_VALUES = { Star: 5, Heart: 10, Rocket: 25 };
  let selectedGiftType = "Star";
  let selectedGiftValue = GIFT_VALUES.Star;

  function openModal() {
    modalOverlay?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    updateTotal();
  }

  function closeModal() {
    modalOverlay?.classList.add("hidden");
    document.body.style.overflow = "";
    successMsg?.classList.add("hidden");
  }

  function updateTotal() {
    const qty = Math.max(1, parseInt(giftQtyInput?.value, 10) || 1);
    if (giftQtyInput) giftQtyInput.value = String(qty);
    if (giftTotalEl) giftTotalEl.textContent = String(qty * selectedGiftValue);
  }

  sendGiftBtn?.addEventListener("click", openModal);
  cancelGiftBtn?.addEventListener("click", closeModal);
  closeGiftBtn?.addEventListener("click", closeModal);

  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay?.classList.contains("hidden")) {
      closeModal();
    }
  });

  giftTypeGrid?.addEventListener("click", (e) => {
    const opt = e.target.closest(".gift-type-opt");
    if (!opt) return;
    giftTypeGrid
      .querySelectorAll(".gift-type-opt")
      .forEach((o) => o.classList.remove("active"));
    opt.classList.add("active");
    selectedGiftType = opt.dataset.type || "Star";
    selectedGiftValue = parseInt(opt.dataset.value, 10) || GIFT_VALUES.Star;
    if (giftTypeSelect) giftTypeSelect.value = selectedGiftType;
    updateTotal();
  });

  qtyMinus?.addEventListener("click", () => {
    const v = parseInt(giftQtyInput?.value, 10) || 1;
    if (v > 1 && giftQtyInput) {
      giftQtyInput.value = String(v - 1);
      updateTotal();
    }
  });

  qtyPlus?.addEventListener("click", () => {
    const v = parseInt(giftQtyInput?.value, 10) || 1;
    if (giftQtyInput) {
      giftQtyInput.value = String(v + 1);
      updateTotal();
    }
  });

  giftQtyInput?.addEventListener("input", updateTotal);

  async function sendGift() {
    const quantity = Math.max(1, parseInt(giftQtyInput?.value, 10) || 1);

    if (!confirmGiftBtn || !confirmText || !confirmSpinner || !successMsg) return;

    confirmGiftBtn.disabled = true;
    confirmText.classList.add("hidden");
    confirmSpinner.classList.remove("hidden");
    successMsg.classList.add("hidden");

    try {
      const res = await fetch(GIFT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: parseInt(streamId, 10),
          userId,
          giftType: selectedGiftType,
          quantity,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Server error");
      }

      successMsg.classList.remove("hidden");
      setTimeout(closeModal, 1800);
    } catch (err) {
      console.error("[Gift] send failed:", err.message);
      alert("Failed to send gift: " + err.message);
    } finally {
      confirmGiftBtn.disabled = false;
      confirmText.classList.remove("hidden");
      confirmSpinner.classList.add("hidden");
    }
  }

  confirmGiftBtn?.addEventListener("click", sendGift);

  /* Share button */
  const shareBtn = document.getElementById("shareBtn");
  shareBtn?.addEventListener("click", () => {
    if (navigator.share) {
      navigator.share({ title: document.title, url: location.href });
    } else {
      navigator.clipboard?.writeText(location.href);
    }
  });

  /* Keyboard shortcut */
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      document.getElementById("searchInput")?.focus();
    }
  });
})();
