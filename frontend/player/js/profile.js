(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const PROFILE_UI_STORAGE_KEY = "gh_profile_ui";
  const auth = window.GamersHubAuth;
  const session = auth?.getSession?.() || {};
  const params = new URLSearchParams(window.location.search);
  const requestedUserId = Number(params.get("userId"));
  const viewedUserId =
    Number.isInteger(requestedUserId) && requestedUserId > 0
      ? requestedUserId
      : session.userId || null;
  const isPublicProfile = Boolean(
    viewedUserId &&
    session.userId &&
    Number(viewedUserId) !== Number(session.userId),
  );

  const defaultState = {
    userId: viewedUserId,
    username: session.username || "Account",
    email: "",
    role: "user",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    displayName: session.username || "",
    phoneNumber: "",
    school: "",
    schoolTag: "",
    studentId: "",
    courseYear: "",
    primaryGames: [],
    avatar: "../assets/icons/player-dashboard-icons/user-profile.png",
    socials: {
      instagram: "",
      facebook: "",
      tiktok: "",
    },
  };

  const uiState = isPublicProfile ? {} : loadUiState();
  const state = {
    ...defaultState,
    avatar: uiState.avatar || defaultState.avatar,
    socials: {
      ...defaultState.socials,
      ...(uiState.socials || {}),
    },
  };

  let draft = null;
  let isEditing = false;
  let activePlatform = null;

  const topNav = document.getElementById("topNav");
  const profileMain = document.getElementById("profileMain");
  const profilePageTitle = document.getElementById("profilePageTitle");
  const profilePageSubtitle = document.getElementById("profilePageSubtitle");
  const profilePublicBanner = document.getElementById("profilePublicBanner");
  const editToggleBtn = document.getElementById("editToggleBtn");
  const editToggleLabel = document.getElementById("editToggleLabel");
  const privateProfileFields = [
    document.getElementById("viewDob")?.closest(".pf-info-item"),
    document.getElementById("viewEmail")?.closest(".pf-info-item"),
    document.getElementById("viewPhone")?.closest(".pf-info-item"),
    document.getElementById("viewStudentId")?.closest(".pf-info-item"),
  ].filter(Boolean);

  const avatarWrap = document.getElementById("avatarWrap");
  const avatarImg = document.getElementById("avatarImg");
  const avatarFileInput = document.getElementById("avatarFileInput");
  const avatarEditOverlay = document.getElementById("avatarEditOverlay");

  const identityView = document.getElementById("identityView");
  const identityEdit = document.getElementById("identityEdit");
  const viewUsername = document.getElementById("viewUsername");
  const viewRealname = document.getElementById("viewRealname");
  const viewSchoolTag = document.getElementById("viewSchoolTag");
  const editUsername = document.getElementById("editUsername");
  const editDisplayName = document.getElementById("editDisplayName");
  const editSchoolTag = document.getElementById("editSchoolTag");

  const infoGrid = document.getElementById("infoGrid");
  const editGrid = document.getElementById("editGrid");
  const viewFirstName = document.getElementById("viewFirstName");
  const viewLastName = document.getElementById("viewLastName");
  const viewDob = document.getElementById("viewDob");
  const viewEmail = document.getElementById("viewEmail");
  const viewPhone = document.getElementById("viewPhone");
  const viewRole = document.getElementById("viewRole");
  const editFirstName = document.getElementById("editFirstName");
  const editLastName = document.getElementById("editLastName");
  const editDob = document.getElementById("editDob");
  const editEmail = document.getElementById("editEmail");
  const editPhone = document.getElementById("editPhone");

  const viewStudentId = document.getElementById("viewStudentId");
  const viewCourseYear = document.getElementById("viewCourseYear");
  const editCourseYear = document.getElementById("editCourseYear");
  const editStudentId = document.getElementById("editStudentId");

  const viewSchool = document.getElementById("viewSchool");
  const editSchoolWrap = document.getElementById("editSchoolWrap");
  const editSchool = document.getElementById("editSchool");

  const viewGames = document.getElementById("viewGames");
  const editGamesWrap = document.getElementById("editGamesWrap");
  const gamesChips = document.getElementById("gamesChips");
  const gameInput = document.getElementById("gameInput");
  const addGameBtn = document.getElementById("addGameBtn");

  const actionBar = document.getElementById("actionBar");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveBtn = document.getElementById("saveBtn");

  const socialCard = document.getElementById("profileSocialCard");
  const socialButtons = Array.from(document.querySelectorAll(".social-btn"));
  const socialLinkMap = {
    instagram: document.getElementById("igLink"),
    facebook: document.getElementById("fbLink"),
    tiktok: document.getElementById("ttLink"),
  };

  const socialModalOverlay = document.getElementById("socialModalOverlay");
  const socialModalClose = document.getElementById("socialModalClose");
  const socialModalCancel = document.getElementById("socialModalCancel");
  const socialModalSave = document.getElementById("socialModalSave");
  const socialLinkInput = document.getElementById("socialLinkInput");
  const socialModalTitle = document.getElementById("socialModalTitle");
  const socialModalSub = document.getElementById("socialModalSub");
  const socialModalLabel = document.getElementById("socialModalLabel");
  const modalIcon = document.getElementById("modalIcon");
  const socialModalSuccess = document.getElementById("socialModalSuccess");
  const profilePostsTitle = document.getElementById("profilePostsTitle");
  const profilePostsSubtitle = document.getElementById("profilePostsSubtitle");
  const profilePostsList = document.getElementById("profilePostsList");

  const PLATFORM_META = {
    instagram: {
      label: "Instagram",
      icon: "IG",
      placeholder: "https://instagram.com/yourhandle",
    },
    facebook: {
      label: "Facebook",
      icon: "FB",
      placeholder: "https://facebook.com/yourprofile",
    },
    tiktok: {
      label: "TikTok",
      icon: "TT",
      placeholder: "https://tiktok.com/@yourhandle",
    },
  };

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  editToggleBtn?.addEventListener("click", () => {
    if (isPublicProfile) {
      return;
    }

    if (isEditing) {
      void saveProfile();
      return;
    }

    enterEdit();
  });

  cancelBtn?.addEventListener("click", cancelEdit);
  saveBtn?.addEventListener("click", () => {
    void saveProfile();
  });

  addGameBtn?.addEventListener("click", addGame);
  gameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addGame();
    }
  });

  gamesChips?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".game-chip-remove");
    if (!removeButton || !draft || isPublicProfile) {
      return;
    }

    const index = Number(removeButton.dataset.index);
    if (Number.isInteger(index)) {
      draft.primaryGames.splice(index, 1);
      renderGameChips();
    }
  });

  avatarFileInput?.addEventListener("change", (event) => {
    if (isPublicProfile) {
      avatarFileInput.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result !== "string") {
        return;
      }

      avatarImg.src = result;
      if (draft) {
        draft.avatar = result;
      } else {
        state.avatar = result;
        saveUiState();
      }
    };
    reader.readAsDataURL(file);
    avatarFileInput.value = "";
  });

  socialButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isPublicProfile) {
        return;
      }

      openSocialModal(button.dataset.platform);
    });
  });

  socialModalClose?.addEventListener("click", closeSocialModal);
  socialModalCancel?.addEventListener("click", closeSocialModal);
  socialModalSave?.addEventListener("click", saveSocialLink);

  socialModalOverlay?.addEventListener("click", (event) => {
    if (event.target === socialModalOverlay) {
      closeSocialModal();
    }
  });

  socialLinkInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveSocialLink();
    }

    if (event.key === "Escape") {
      closeSocialModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      socialModalOverlay &&
      !socialModalOverlay.classList.contains("hidden")
    ) {
      closeSocialModal();
    }
  });

  applyProfileMode();
  renderView();
  void hydrateProfile();
  void hydrateProfilePosts();

  async function hydrateProfile() {
    if (!viewedUserId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/profile/${viewedUserId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load profile.");
      }

      applyBackendProfile(payload);
      renderView();
      applyProfileMode();
    } catch (error) {
      console.error("Profile hydration failed:", error);
      window.GamersHubAuth?.toast(
        "Could not load profile data. Check your connection and try refreshing.",
        "error",
        { title: "Profile Unavailable" },
      );
      if (editToggleLabel) {
        editToggleLabel.textContent = "Profile offline";
        setTimeout(() => {
          if (!isEditing && !isPublicProfile) {
            editToggleLabel.textContent = "Edit Profile";
          }
        }, 1800);
      }
    }
  }

  function applyBackendProfile(profile) {
    state.userId = profile.userId;
    state.username = profile.username || state.username;
    state.email = profile.email || state.email;
    state.role = profile.role || state.role;
    state.firstName = profile.firstName || "";
    state.lastName = profile.lastName || "";
    state.dateOfBirth = profile.dateOfBirth || "";
    state.displayName = profile.displayName || state.username;
    state.phoneNumber = profile.phoneNumber || "";
    state.school = profile.school || "";
    state.schoolTag = profile.schoolTag || buildSchoolTag(state.school);
    state.studentId = profile.studentId || "";
    state.courseYear = profile.courseYear || "";
    state.primaryGames = Array.isArray(profile.primaryGames)
      ? profile.primaryGames
      : profile.primaryGame
        ? [profile.primaryGame]
        : [];
  }

  function applyProfileMode() {
    if (!profileMain) {
      return;
    }

    profileMain.classList.toggle("is-readonly", isPublicProfile);

    if (profilePublicBanner) {
      profilePublicBanner.classList.toggle("hidden", !isPublicProfile);
    }

    if (profilePageSubtitle) {
      profilePageSubtitle.classList.remove("hidden");
      profilePageSubtitle.textContent = isPublicProfile
        ? `Viewing @${state.username || "player"} in public profile mode.`
        : "View and update your GamersHub player profile.";
    }

    if (profilePageTitle) {
      profilePageTitle.textContent = isPublicProfile ? "Player Profile" : "Profile";
    }

    if (editToggleBtn) {
      editToggleBtn.classList.toggle("hidden", isPublicProfile);
    }

    if (avatarEditOverlay) {
      avatarEditOverlay.classList.toggle("hidden", isPublicProfile);
    }

    if (socialCard) {
      socialCard.classList.toggle("hidden", isPublicProfile);
    }

    privateProfileFields.forEach((node) => {
      node.classList.toggle("hidden", isPublicProfile);
    });

    if (profilePostsTitle) {
      profilePostsTitle.textContent = isPublicProfile
        ? `${state.displayName || state.username || "Player"}'s Posts`
        : "Your Posts";
    }

    if (profilePostsSubtitle) {
      profilePostsSubtitle.textContent = isPublicProfile
        ? "Public posts shared by this player."
        : "Recent posts you have shared on GamersHub.";
    }

    if (isPublicProfile) {
      cancelEdit();
      document.title = `GamersHub - ${state.displayName || state.username || "Player"}`;
    } else {
      document.title = "GamersHub - Profile";
    }
  }

  async function hydrateProfilePosts() {
    if (!viewedUserId || !profilePostsList) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/feed/users/${viewedUserId}/posts?limit=12`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load profile posts.");
      }

      renderProfilePosts(payload.items || []);
    } catch (error) {
      console.error("Profile posts hydration failed:", error);
      profilePostsList.innerHTML = `
        <div class="profile-posts-empty is-error">
          Could not load posts right now.
        </div>
      `;
    }
  }

  function renderProfilePosts(items) {
    if (!profilePostsList) {
      return;
    }

    if (!items.length) {
      profilePostsList.innerHTML = `
        <div class="profile-posts-empty">
          No posts to show yet.
        </div>
      `;
      return;
    }

    profilePostsList.innerHTML = items.map(renderProfilePost).join("");
  }

  function renderProfilePost(post) {
    const schoolTag = post.author?.schoolTag
      ? `<span class="post-school-tag">${escapeHtml(post.author.schoolTag)}</span>`
      : "";

    return `
      <article class="post-card profile-post-card">
        <div class="post-header">
          <div class="post-avatar">
            <img
              src="../assets/icons/player-dashboard-icons/user-profile.png"
              alt="${escapeAttribute(post.author?.displayName || "Player")}"
            />
          </div>
          <div class="post-meta">
            <div class="post-author-row">
              <span class="post-author">${escapeHtml(post.author?.displayName || "Player")}</span>
              ${schoolTag}
            </div>
            <div class="post-time">
              <img class="privacy-icon" src="../assets/icons/player-dashboard-icons/privacy-public.png" alt="" />
              <span>${escapeHtml(post.createdLabel || "Recently posted")}</span>
              <span>&bull;</span>
              <span>@${escapeHtml(post.author?.username || "user")}</span>
            </div>
          </div>
        </div>
        <div class="post-body">
          ${post.content ? `<p class="post-text">${escapeHtml(post.content).replace(/\n/g, "<br />")}</p>` : ""}
          ${renderProfilePostMedia(post)}
        </div>
      </article>
    `;
  }

  function renderProfilePostMedia(post) {
    if (!post.mediaUrl) {
      return "";
    }

    const mediaSrc = normalizeMediaSource(post.mediaUrl);
    if (post.mediaType === "image") {
      return `
        <div class="post-image-wrap">
          <img class="post-image" src="${escapeAttribute(mediaSrc)}" alt="Post attachment" />
        </div>
      `;
    }

    if (post.mediaType === "video") {
      return `
        <div class="post-video-wrap">
          <video class="post-video" controls preload="metadata">
            <source src="${escapeAttribute(mediaSrc)}" />
            Your browser does not support the video tag.
          </video>
        </div>
      `;
    }

    return `
      <a class="post-link-card" href="${escapeAttribute(mediaSrc)}" target="_blank" rel="noreferrer">
        <span class="post-link-label">Attached Media</span>
        <span class="post-link-url">${escapeHtml(post.mediaUrl)}</span>
      </a>
    `;
  }

  function normalizeMediaSource(mediaUrl) {
    if (!mediaUrl) {
      return "";
    }

    return String(mediaUrl).startsWith("/uploads/")
      ? `${API_BASE}${mediaUrl}`
      : mediaUrl;
  }

  function renderView() {
    auth?.applyUserName?.();

    avatarImg.src = state.avatar || defaultState.avatar;
    viewUsername.textContent = state.username || defaultState.username;
    viewRealname.textContent = state.displayName || state.username || "Player";
    viewSchoolTag.textContent = state.schoolTag || buildSchoolTag(state.school) || "Profile";
    viewFirstName.textContent = state.firstName || "Not set";
    viewLastName.textContent = state.lastName || "Not set";
    viewDob.textContent = formatDate(state.dateOfBirth) || "Not set";
    viewEmail.textContent = state.email || "Not set";
    viewPhone.textContent = state.phoneNumber || "Not set";
    if (viewStudentId) {
      const rawId = state.studentId || "";
      viewStudentId.textContent = rawId && !rawId.startsWith("TEMP-") ? rawId : "Not set";
    }
    if (viewCourseYear) {
      viewCourseYear.textContent = state.courseYear || "Not set";
    }
    viewRole.textContent = state.role || "user";
    viewSchool.textContent = state.school || "Not set";

    viewGames.innerHTML = "";
    if (!state.primaryGames.length) {
      const item = document.createElement("li");
      item.textContent = "Not set";
      viewGames.appendChild(item);
    } else {
      state.primaryGames.forEach((game) => {
        const item = document.createElement("li");
        item.textContent = game;
        viewGames.appendChild(item);
      });
    }

    Object.entries(socialLinkMap).forEach(([platform, linkNode]) => {
      updateSocialButton(platform, linkNode);
    });

    if (editUsername) {
      editUsername.value = state.username || "";
    }
    if (editEmail) {
      editEmail.value = state.email || "";
    }
  }

  function enterEdit() {
    if (isPublicProfile) {
      return;
    }

    draft = {
      ...state,
      primaryGames: [...state.primaryGames],
      socials: { ...state.socials },
    };
    isEditing = true;

    editUsername.value = draft.username;
    editDisplayName.value = draft.displayName;
    editSchoolTag.value = draft.schoolTag || buildSchoolTag(draft.school);
    editFirstName.value = draft.firstName;
    editLastName.value = draft.lastName;
    editDob.value = draft.dateOfBirth;
    editEmail.value = draft.email;
    editPhone.value = draft.phoneNumber;
    if (editCourseYear) {
      editCourseYear.value = draft.courseYear;
    }
    if (editStudentId) {
      const rawId = draft.studentId || "";
      editStudentId.value = rawId && !rawId.startsWith("TEMP-") ? rawId : "";
    }
    editSchool.value = draft.school;

    identityView.classList.add("hidden");
    identityEdit.classList.remove("hidden");
    infoGrid.classList.add("hidden");
    editGrid.classList.remove("hidden");
    viewSchool.classList.add("hidden");
    editSchoolWrap.classList.remove("hidden");
    viewGames.classList.add("hidden");
    editGamesWrap.classList.remove("hidden");
    actionBar.classList.remove("hidden");
    avatarWrap.classList.add("editable");
    editToggleBtn.classList.add("is-editing");
    editToggleLabel.textContent = "Save Changes";

    renderGameChips();
  }

  function cancelEdit() {
    isEditing = false;
    draft = null;

    identityView.classList.remove("hidden");
    identityEdit.classList.add("hidden");
    infoGrid.classList.remove("hidden");
    editGrid.classList.add("hidden");
    viewSchool.classList.remove("hidden");
    editSchoolWrap.classList.add("hidden");
    viewGames.classList.remove("hidden");
    editGamesWrap.classList.add("hidden");
    actionBar.classList.add("hidden");
    avatarWrap.classList.remove("editable");
    editToggleBtn?.classList.remove("is-editing");
    if (editToggleLabel && !isPublicProfile) {
      editToggleLabel.textContent = "Edit Profile";
    }
    avatarImg.src = state.avatar || defaultState.avatar;
  }

  async function saveProfile() {
    if (!draft || !state.userId || isPublicProfile) {
      return;
    }

    draft.displayName = editDisplayName.value.trim() || draft.displayName;
    draft.schoolTag = editSchoolTag.value.trim() || draft.schoolTag;
    draft.firstName = editFirstName.value.trim();
    draft.lastName = editLastName.value.trim();
    draft.dateOfBirth = editDob.value || "";
    draft.phoneNumber = editPhone.value.trim();
    draft.courseYear = editCourseYear ? editCourseYear.value.trim() : draft.courseYear;
    draft.school = editSchool.value.trim();
    syncPendingGameInput();

    try {
      setSavingState(true, "Saving...");

      const response = await fetch(`${API_BASE}/api/users/profile/${state.userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          dateOfBirth: draft.dateOfBirth,
          displayName: draft.displayName,
          phoneNumber: draft.phoneNumber,
          school: draft.school,
          courseYear: draft.courseYear,
          primaryGames: draft.primaryGames,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to update profile.");
      }

      applyBackendProfile(payload);
      state.avatar = draft.avatar || state.avatar;
      state.socials = { ...draft.socials };
      saveUiState();
      cancelEdit();
      renderView();
      setSavingState(false, "Saved");

      setTimeout(() => {
        if (!isEditing && !isPublicProfile) {
          editToggleLabel.textContent = "Edit Profile";
        }
      }, 1400);
    } catch (error) {
      console.error("Profile save failed:", error);
      setSavingState(false, "Save failed");
      window.GamersHubAuth?.toast(
        error.message || "Could not save your profile. Please try again.",
        "error",
      );
      setTimeout(() => {
        if (!editToggleLabel || isPublicProfile) {
          return;
        }

        editToggleLabel.textContent = isEditing ? "Save Changes" : "Edit Profile";
      }, 1800);
    }
  }

  function setSavingState(isSaving, label) {
    if (!editToggleBtn || !editToggleLabel) {
      return;
    }

    editToggleBtn.classList.toggle("is-editing", isSaving || isEditing);
    editToggleLabel.textContent = label;
    saveBtn.disabled = isSaving;
    cancelBtn.disabled = isSaving;
  }

  function renderGameChips() {
    if (!gamesChips || !draft) {
      return;
    }

    gamesChips.innerHTML = "";
    draft.primaryGames.forEach((game, index) => {
      const chip = document.createElement("span");
      chip.className = "game-chip";
      chip.textContent = game;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "game-chip-remove";
      removeButton.dataset.index = String(index);
      removeButton.setAttribute("aria-label", `Remove ${game}`);
      removeButton.textContent = "x";

      chip.appendChild(removeButton);
      gamesChips.appendChild(chip);
    });
  }

  function addGame() {
    if (!draft || isPublicProfile) {
      return;
    }

    const value = gameInput.value.trim();
    if (!value || draft.primaryGames.includes(value)) {
      gameInput.value = "";
      return;
    }

    draft.primaryGames.push(value);
    gameInput.value = "";
    renderGameChips();
  }

  function syncPendingGameInput() {
    if (!draft) {
      return;
    }

    const value = gameInput.value.trim();
    if (!value) {
      return;
    }

    if (!draft.primaryGames.includes(value)) {
      draft.primaryGames.push(value);
    }

    gameInput.value = "";
    renderGameChips();
  }

  function openSocialModal(platform) {
    if (isPublicProfile) {
      return;
    }

    const meta = PLATFORM_META[platform];
    if (!meta) {
      return;
    }

    activePlatform = platform;
    modalIcon.textContent = meta.icon;
    socialModalTitle.textContent = `Link ${meta.label}`;
    socialModalSub.textContent = `Add or update your ${meta.label} profile link.`;
    socialModalLabel.textContent = `${meta.label} profile URL`;
    socialLinkInput.placeholder = meta.placeholder;
    socialLinkInput.value = state.socials[platform] || "";
    socialModalSuccess.classList.add("hidden");
    socialModalOverlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    setTimeout(() => socialLinkInput.focus(), 60);
  }

  function closeSocialModal() {
    socialModalOverlay.classList.add("hidden");
    socialModalSuccess.classList.add("hidden");
    document.body.style.overflow = "";
    activePlatform = null;
  }

  function saveSocialLink() {
    if (!activePlatform || isPublicProfile) {
      return;
    }

    state.socials[activePlatform] = socialLinkInput.value.trim();
    if (draft) {
      draft.socials[activePlatform] = state.socials[activePlatform];
    }
    saveUiState();
    updateSocialButton(activePlatform, socialLinkMap[activePlatform]);
    socialModalSuccess.classList.remove("hidden");
    setTimeout(closeSocialModal, 1000);
  }

  function updateSocialButton(platform, linkNode) {
    const value = state.socials[platform];
    const button = linkNode?.closest(".social-btn");
    if (!linkNode || !button) {
      return;
    }

    linkNode.textContent = value ? shortenUrl(value) : "";
    button.classList.toggle("has-link", Boolean(value));
  }

  function loadUiState() {
    try {
      const raw = localStorage.getItem(buildUiStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveUiState() {
    if (isPublicProfile) {
      return;
    }

    localStorage.setItem(
      buildUiStorageKey(),
      JSON.stringify({
        avatar: state.avatar,
        socials: state.socials,
      }),
    );
  }

  function buildUiStorageKey() {
    return `${PROFILE_UI_STORAGE_KEY}_${session.userId || session.username || "guest"}`;
  }

  function formatDate(isoDate) {
    if (!isoDate) {
      return "";
    }

    const [year, month, day] = isoDate.split("-");
    if (!year || !month || !day) {
      return isoDate;
    }

    return `${day}-${month}-${year}`;
  }

  function shortenUrl(url) {
    return url
      .replace(/^https?:\/\/(www\.)?/i, "")
      .split("/")
      .slice(0, 2)
      .join("/");
  }

  function buildSchoolTag(school) {
    if (!school) {
      return "";
    }

    return school
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 4)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
