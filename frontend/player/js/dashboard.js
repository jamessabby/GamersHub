(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const auth = window.GamersHubAuth;
  const session = auth?.getSession?.() || {};
  const REACTION_META = {
    like: { label: "Like", icon: "../assets/icons/player-dashboard-icons/like-react.png" },
    love: { label: "Love", icon: "../assets/icons/player-dashboard-icons/heart-react.png" },
    wow: { label: "Wow", icon: "../assets/icons/player-dashboard-icons/wow-react.png" },
  };
  const FEED_POLL_INTERVAL_MS = 5000;
  const FRIEND_POLL_INTERVAL_MS = 8000;

  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const createPostInput = document.getElementById("createPostInput");
  const mediaComposerRow = document.getElementById("mediaComposerRow");
  const attachPhotoBtn = document.getElementById("attachPhotoBtn");
  const attachVideoBtn = document.getElementById("attachVideoBtn");
  const photoFileInput = document.getElementById("photoFileInput");
  const videoFileInput = document.getElementById("videoFileInput");
  const mediaPreviewVisual = document.getElementById("mediaPreviewVisual");
  const mediaPreviewLabel = document.getElementById("mediaPreviewLabel");
  const mediaPreviewName = document.getElementById("mediaPreviewName");
  const clearMediaBtn = document.getElementById("clearMediaBtn");
  const createPostBtn = document.getElementById("createPostBtn");
  const createPostStatus = document.getElementById("createPostStatus");
  const feedList = document.getElementById("feedList");
  const friendSearchInput = document.getElementById("friendSearchInput");
  const friendSearchStatus = document.getElementById("friendSearchStatus");
  const friendSearchResults = document.getElementById("friendSearchResults");
  const friendRequestsList = document.getElementById("friendRequestsList");
  const dashboardFriendsList = document.getElementById("dashboardFriendsList");

  let selectedMediaType = null;
  let selectedMediaFile = null;
  let selectedMediaPreviewUrl = "";
  let selectedMediaName = "";
  let searchDebounceId = null;
  let feedSnapshot = "";
  let feedPollTimer = null;
  let friendPollTimer = null;
  let isFeedSyncing = false;
  const reactionSummaryCache = new Map();
  const commentsLoadedPosts = new Set();

  window.addEventListener("scroll", () => {
    topNav?.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".post-reaction-picker") && !event.target.closest("[data-post-action='react-toggle']")) {
      closeAllReactionPickers();
    }
  });

  createPostBtn?.addEventListener("click", () => void createPost());
  attachPhotoBtn?.addEventListener("click", () => openMediaPicker("image"));
  attachVideoBtn?.addEventListener("click", () => openMediaPicker("video"));
  clearMediaBtn?.addEventListener("click", resetMediaComposer);

  createPostInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void createPost();
    }
  });

  createPostInput?.addEventListener("input", () => {
    createPostInput.style.height = "32px";
    createPostInput.style.height = `${Math.min(createPostInput.scrollHeight, 84)}px`;
    syncComposerControls();
  });

  photoFileInput?.addEventListener("change", (event) => {
    void handleMediaFileSelection(event.target.files?.[0] || null, "image");
  });

  videoFileInput?.addEventListener("change", (event) => {
    void handleMediaFileSelection(event.target.files?.[0] || null, "video");
  });

  friendSearchInput?.addEventListener("input", () => {
    const query = friendSearchInput.value.trim();
    clearTimeout(searchDebounceId);

    if (query.length < 2) {
      renderSearchIdleState();
      return;
    }

    setFriendSearchStatus("Searching players...", false);
    searchDebounceId = window.setTimeout(() => void searchPlayers(query), 240);
  });

  friendSearchResults?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-friend]");
    if (button) {
      void sendFriendRequest(button.dataset.addFriend);
    }
  });

  friendRequestsList?.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-request-action]");
    if (actionButton) {
      void respondToFriendRequest(
        actionButton.dataset.requestUserId,
        actionButton.dataset.requestAction,
      );
    }
  });

  feedList?.addEventListener("click", (event) => {
    const commentDeleteBtn = event.target.closest("[data-comment-action='delete']");
    if (commentDeleteBtn) {
      const commentId = Number(commentDeleteBtn.dataset.commentId);
      const postId = Number(commentDeleteBtn.dataset.postId);
      if (Number.isInteger(commentId) && commentId > 0 && Number.isInteger(postId) && postId > 0) {
        void deleteComment(commentId, postId);
      }
      return;
    }

    const actionButton = event.target.closest("[data-post-action]");
    if (!actionButton) {
      return;
    }

    const postCard = actionButton.closest("[data-post-id]");
    const postId = Number(postCard?.dataset.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      return;
    }

    const action = actionButton.dataset.postAction;
    if (action === "react-toggle") {
      toggleReactionPicker(postCard);
      return;
    }
    if (action === "reaction-select") {
      void handleReactionSelection(postId, actionButton.dataset.reactionType);
      return;
    }
    if (action === "comment-toggle") {
      void toggleComments(postCard, postId);
      return;
    }
    if (action === "delete-post") {
      void deletePost(postId);
      return;
    }
    if (action === "share") {
      sharePost(postId);
    }
  });

  feedList?.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-comment-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const postCard = form.closest("[data-post-id]");
    const postId = Number(postCard?.dataset.postId);
    const input = form.querySelector("[data-comment-input]");
    if (Number.isInteger(postId) && postId > 0) {
      void createComment(postId, input);
    }
  });

  window.addEventListener("gh:friends-updated", () => void loadFriendPanel());
  window.addEventListener("focus", () => {
    void refreshLiveDashboard({ forceFeed: true });
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);

  syncComposerControls();
  renderLoadingState();
  renderSearchIdleState();
  renderIncomingPlaceholder("No incoming friend requests right now.");
  renderFriendsPlaceholder("Your accepted friends will appear here.");
  void Promise.all([loadFeed(), loadFriendPanel()]);
  startLivePolling();
  void checkProfileCompleteness();

  const profileCompleteBanner = document.getElementById("profileCompleteBanner");
  const pcbDismiss = document.getElementById("pcbDismiss");
  const pcbMissingFields = document.getElementById("pcbMissingFields");
  const PCB_DISMISS_KEY = `gh_pcb_dismissed_${session.userId || ""}`;

  pcbDismiss?.addEventListener("click", () => {
    profileCompleteBanner?.classList.add("hidden");
    try {
      sessionStorage.setItem(PCB_DISMISS_KEY, "1");
    } catch {
      // storage unavailable — ignore
    }
  });

  async function checkProfileCompleteness() {
    if (!session.userId) {
      return;
    }

    try {
      const dismissed = sessionStorage.getItem(PCB_DISMISS_KEY);
      if (dismissed) {
        return;
      }
    } catch {
      // storage unavailable — proceed
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/profile/${session.userId}`);
      if (!response.ok) {
        return;
      }

      const profile = await response.json();
      const missing = [];
      if (!profile.firstName) missing.push("first name");
      if (!profile.lastName) missing.push("last name");
      if (!profile.courseYear) missing.push("course & year");
      if (!profile.phoneNumber) missing.push("phone number");

      if (missing.length === 0 || !profileCompleteBanner) {
        return;
      }

      if (pcbMissingFields) {
        pcbMissingFields.textContent = missing.join(", ");
      }

      profileCompleteBanner.classList.remove("hidden");
    } catch {
      // silently ignore — banner is non-critical
    }
  }

  async function loadFeed({ preserveState = false, silent = false, items = null } = {}) {
    try {
      const nextItems = items || await fetchFeedItems();
      await renderFetchedFeed(nextItems, { preserveState });
    } catch (error) {
      console.error("Feed loading failed:", error);
      if (!silent) {
        renderFeed([]);
        setComposerStatus("Feed is offline right now. Please check the backend service.", true);
      }
    }
  }

  async function fetchFeedItems() {
    const response = await fetch(`${API_BASE}/api/feed?limit=20`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Failed to load feed.");
    }

    return payload.items || [];
  }

  async function renderFetchedFeed(items, { preserveState = false } = {}) {
    const previousState = preserveState ? captureFeedUiState() : null;
    renderFeed(items);
    feedSnapshot = buildFeedSnapshot(items);
    await hydrateFeedEngagement(items);

    if (previousState) {
      await restoreFeedUiState(previousState);
    }
  }

  async function hydrateFeedEngagement(items) {
    await Promise.all(items.map(async (post) => {
      try {
        applyReactionSummary(post.postId, await fetchReactionSummary(post.postId));
      } catch (error) {
        console.error(`Failed to hydrate reactions for post ${post.postId}:`, error);
      }
    }));
  }

  async function refreshLiveDashboard({ forceFeed = false } = {}) {
    if (isFeedSyncing || document.hidden) {
      return;
    }

    isFeedSyncing = true;
    try {
      const nextItems = await fetchFeedItems();
      const nextSnapshot = buildFeedSnapshot(nextItems);

      if (forceFeed || nextSnapshot !== feedSnapshot) {
        await renderFetchedFeed(nextItems, { preserveState: true });
      } else {
        await refreshRenderedEngagement();
      }

      await loadFriendPanel();
    } catch (error) {
      console.error("Live dashboard refresh failed:", error);
    } finally {
      isFeedSyncing = false;
    }
  }

  async function refreshRenderedEngagement() {
    const postIds = Array.from(feedList?.querySelectorAll("[data-post-id]") || [])
      .map((node) => Number(node.dataset.postId))
      .filter ((postId) => Number.isInteger(postId) && postId > 0);

    await Promise.all(postIds.map(async (postId) => {
      try {
        applyReactionSummary(postId, await fetchReactionSummary(postId));
        const commentsSection = findPostCard(postId)?.querySelector("[data-post-comments-section]");
        if (commentsSection && !commentsSection.classList.contains("hidden")) {
          await loadComments(postId, { silent: true });
        }
      } catch (error) {
        console.error(`Failed to refresh engagement for post ${postId}:`, error);
      }
    }));
  }

  function startLivePolling() {
    stopLivePolling();

    feedPollTimer = window.setInterval(() => {
      void refreshLiveDashboard();
    }, FEED_POLL_INTERVAL_MS);

    friendPollTimer = window.setInterval(() => {
      if (!document.hidden) {
        void loadFriendPanel();
      }
    }, FRIEND_POLL_INTERVAL_MS);
  }

  function stopLivePolling() {
    if (feedPollTimer) {
      window.clearInterval(feedPollTimer);
      feedPollTimer = null;
    }

    if (friendPollTimer) {
      window.clearInterval(friendPollTimer);
      friendPollTimer = null;
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopLivePolling();
      return;
    }

    startLivePolling();
    void refreshLiveDashboard({ forceFeed: true });
  }

  async function fetchReactionSummary(postId) {
    const response = await fetch(
      `${API_BASE}/api/reactions/posts/${postId}/summary?viewerUserId=${encodeURIComponent(session.userId || "")}`,
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Failed to load reaction summary.");
    }
    reactionSummaryCache.set(postId, payload);
    return payload;
  }

  async function loadFriendPanel() {
    if (!session.userId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${session.userId}/friends`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load friends.");
      }

      renderIncomingRequests(payload.incoming || []);
      renderAcceptedFriends(payload.accepted || []);
    } catch (error) {
      console.error("Friend panel loading failed:", error);
      renderIncomingPlaceholder("Incoming requests are unavailable right now.");
      renderFriendsPlaceholder("Friends are unavailable right now.");
    }
  }

  async function searchPlayers(query) {
    if (!session.userId || !friendSearchResults) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/users/search?viewerUserId=${encodeURIComponent(session.userId)}&q=${encodeURIComponent(query)}&limit=8`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to search players.");
      }

      renderSearchResults(payload.items || [], query);
    } catch (error) {
      console.error("Player search failed:", error);
      setFriendSearchStatus(error.message || "Player search failed.", true);
      friendSearchResults.innerHTML = "";
    }
  }

  async function sendFriendRequest(targetUserId) {
    if (!session.userId) {
      setFriendSearchStatus("Please log in again before sending a request.", true);
      return;
    }

    try {
      setFriendSearchStatus("Sending friend request...", false);
      const response = await fetch(`${API_BASE}/api/users/${session.userId}/friends/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: Number(targetUserId) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to send friend request.");
      }

      setFriendSearchStatus("Friend request sent.", false);
      await loadFriendPanel();
      window.dispatchEvent(new Event("gh:notifications-updated"));
      const query = friendSearchInput?.value.trim() || "";
      if (query.length >= 2) {
        await searchPlayers(query);
      }
    } catch (error) {
      console.error("Friend request failed:", error);
      setFriendSearchStatus(error.message || "Friend request failed.", true);
    }
  }

  async function respondToFriendRequest(requesterUserId, action) {
    if (!session.userId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/users/${session.userId}/friends/requests/${requesterUserId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to update friend request.");
      }

      await loadFriendPanel();
      window.dispatchEvent(new Event("gh:notifications-updated"));
      const query = friendSearchInput?.value.trim() || "";
      if (query.length >= 2) {
        await searchPlayers(query);
      }
    } catch (error) {
      console.error("Friend request response failed:", error);
      renderIncomingPlaceholder(error.message || "Failed to update friend request.");
    }
  }

  async function createPost() {
    const content = createPostInput?.value.trim() || "";

    if (!session.userId) {
      setComposerStatus("Please log in again before posting.", true);
      return;
    }

    if (!content && !selectedMediaFile) {
      setComposerStatus("Write something or attach a photo or video first.", true);
      return;
    }

    try {
      setComposerBusy(true, "Posting to the community feed...");
      const formData = new FormData();
      formData.append("userId", String(session.userId));
      formData.append("content", content);
      if (selectedMediaType) {
        formData.append("mediaType", selectedMediaType);
      }
      if (selectedMediaFile) {
        formData.append("media", selectedMediaFile);
      }

      const response = await fetch(`${API_BASE}/api/feed`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to create post.");
      }

      createPostInput.value = "";
      resetMediaComposer();
      setComposerBusy(false, "Your post was saved to the feed database.");
      syncComposerControls();
      await refreshLiveDashboard({ forceFeed: true });
    } catch (error) {
      console.error("Post creation failed:", error);
      setComposerBusy(false, error.message || "Post creation failed.", true);
    }
  }

  async function handleReactionSelection(postId, reactionType) {
    if (!session.userId) {
      return;
    }

    const currentSummary = reactionSummaryCache.get(postId);
    try {
      const response = currentSummary?.viewerReaction === reactionType
        ? await fetch(`${API_BASE}/api/reactions/posts/${postId}?userId=${encodeURIComponent(session.userId)}`, {
          method: "DELETE",
        })
        : await fetch(`${API_BASE}/api/reactions/posts/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.userId,
            reactionType,
          }),
        });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to update reaction.");
      }

      applyReactionSummary(postId, payload);
      closeAllReactionPickers();
    } catch (error) {
      console.error("Reaction update failed:", error);
      setComposerStatus(error.message || "Failed to update reaction.", true);
    }
  }

  async function toggleComments(postCard, postId) {
    const commentsSection = postCard.querySelector("[data-post-comments-section]");
    const commentsInput = commentsSection?.querySelector("[data-comment-input]");
    if (!commentsSection) {
      return;
    }

    const willOpen = commentsSection.classList.contains("hidden");
    closeAllReactionPickers();
    commentsSection.classList.toggle("hidden", !willOpen);
    if (!willOpen) {
      return;
    }

    if (!commentsLoadedPosts.has(postId)) {
      await loadComments(postId);
    }
    commentsInput?.focus();
  }

  async function loadComments(postId, { silent = false } = {}) {
    const postCard = findPostCard(postId);
    const commentsList = postCard?.querySelector("[data-comments-list]");
    const commentsStatus = postCard?.querySelector("[data-comments-status]");
    if (!commentsList || !commentsStatus) {
      return;
    }

    if (!silent) {
      commentsStatus.textContent = "Loading comments...";
      commentsStatus.classList.remove("is-error");
    }

    try {
      const response = await fetch(`${API_BASE}/api/reactions/posts/${postId}/comments?limit=20`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load comments.");
      }

      commentsLoadedPosts.add(postId);
      renderComments(postId, payload.items || []);
    } catch (error) {
      console.error(`Failed to load comments for post ${postId}:`, error);
      commentsStatus.textContent = error.message || "Comments are unavailable right now.";
      commentsStatus.classList.add("is-error");
    }
  }

  async function createComment(postId, input) {
    if (!session.userId || !input) {
      return;
    }

    const message = input.value.trim();
    if (!message) {
      updateCommentStatus(postId, "Write a comment before sending.", true);
      return;
    }

    input.disabled = true;
    updateCommentStatus(postId, "Sending comment...", false);

    try {
      const response = await fetch(`${API_BASE}/api/reactions/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          message,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to create comment.");
      }

      input.value = "";
      appendComment(postId, payload.comment);
      if (payload.summary) {
        applyReactionSummary(postId, payload.summary);
      }
      commentsLoadedPosts.add(postId);
      updateCommentStatus(postId, "Comment posted.", false);
    } catch (error) {
      console.error("Comment creation failed:", error);
      updateCommentStatus(postId, error.message || "Failed to create comment.", true);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  function renderLoadingState() {
    if (!feedList) {
      return;
    }

    feedList.innerHTML = `
      <article class="post-card skeleton-card">
        <div class="post-header">
          <div class="post-avatar skel"></div>
          <div class="post-meta">
            <div class="skel" style="height: 14px; width: 160px; border-radius: 999px;"></div>
            <div class="skel" style="height: 12px; width: 110px; border-radius: 999px;"></div>
          </div>
        </div>
        <div class="post-body">
          <div class="skel" style="height: 14px; width: 100%; border-radius: 999px; margin-bottom: 10px;"></div>
          <div class="skel" style="height: 14px; width: 72%; border-radius: 999px;"></div>
        </div>
      </article>
    `;
  }

  function renderFeed(items) {
    if (!feedList) {
      return;
    }

    if (!items.length) {
      feedList.innerHTML = `
        <section class="post-empty-state">
          <p class="post-empty-copy">
            No posts yet. When players start publishing updates, they will stack here
            using the same card layout from your dashboard design.
          </p>
        </section>
      `;
      return;
    }

    feedList.innerHTML = items.map(renderPostCard).join("");
  }

  function renderPostCard(post) {
    const schoolTag = post.author?.schoolTag
      ? `<span class="post-school-tag">${escapeHtml(post.author.schoolTag)}</span>`
      : "";

    return `
      <article class="post-card" data-post-id="${escapeAttribute(String(post.postId))}">
        <div class="post-header">
          <div class="post-avatar">
            <img
              src="../assets/icons/player-dashboard-icons/user-profile.png"
              alt="${escapeHtml(post.author?.displayName || "Player")}"
            />
          </div>
          <div class="post-meta">
            <div class="post-author-row">
              <span class="post-author">${escapeHtml(post.author?.displayName || "Player")}</span>
              ${schoolTag}
            </div>
            <div class="post-time">
              <img class="privacy-icon" src="../assets/icons/player-dashboard-icons/privacy-public.png" alt="" />
              <span>${escapeHtml(formatMetaLabel(post.createdLabel))}</span>
              <span>&bull;</span>
              <span>@${escapeHtml(post.author?.username || "user")}</span>
            </div>
          </div>
        </div>

        <div class="post-body">
          ${post.content ? `<p class="post-text">${escapeHtml(post.content).replace(/\n/g, "<br />")}</p>` : ""}
          ${renderMedia(post)}
        </div>

        <div class="post-reactions-row">
          <div class="reaction-icons" data-post-summary-icons>
            <span class="reaction-count" data-post-total-reactions>0 reactions</span>
          </div>
          <span class="post-comment-total" data-post-comment-count-inline>0 comments</span>
        </div>

        <div class="post-actions">
          <div class="post-reaction-action">
            <button type="button" class="post-action-btn post-react-btn" data-post-action="react-toggle">
              <img class="action-icon" src="../assets/icons/player-dashboard-icons/like-default-react.svg" alt="" />
              <span data-post-react-label>React</span>
            </button>
            <div class="post-reaction-picker hidden" data-post-reaction-picker>
              ${renderReactionPicker(post.postId)}
            </div>
          </div>
          <button type="button" class="post-action-btn" data-post-action="comment-toggle">
            <img class="action-icon" src="../assets/icons/player-dashboard-icons/comment.svg" alt="" />
            <span data-post-comment-button-label>Comment</span>
          </button>
          <button type="button" class="post-action-btn" data-post-action="share">
            <img class="action-icon" src="../assets/icons/player-dashboard-icons/share.svg" alt="" />
            <span>Share</span>
          </button>
          ${Number(post.userId) === Number(session.userId) ? `
          <button type="button" class="post-action-btn post-action-delete" data-post-action="delete-post">
            <span>Delete</span>
          </button>` : ""}
        </div>

        <section class="post-comments hidden" data-post-comments-section>
          <div class="post-comments-status" data-comments-status>Open comments to join the discussion.</div>
          <ul class="post-comments-list" data-comments-list></ul>
          <form class="post-comment-form" data-comment-form>
            <input
              type="text"
              class="post-comment-input"
              data-comment-input
              placeholder="Write a comment..."
              maxlength="500"
            />
            <button type="submit" class="post-comment-submit">Send</button>
          </form>
        </section>
      </article>
    `;
  }

  function renderReactionPicker(postId) {
    return Object.entries(REACTION_META).map(([reactionType, meta]) => `
      <button
        type="button"
        class="post-reaction-option"
        data-post-action="reaction-select"
        data-reaction-type="${escapeAttribute(reactionType)}"
        data-post-id="${escapeAttribute(String(postId))}"
      >
        <img src="${escapeAttribute(meta.icon)}" alt="" />
        <span>${escapeHtml(meta.label)}</span>
      </button>
    `).join("");
  }

  function renderMedia(post) {
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

  function applyReactionSummary(postId, summary) {
    reactionSummaryCache.set(postId, summary);
    const postCard = findPostCard(postId);
    if (!postCard) {
      return;
    }

    const iconsWrap = postCard.querySelector("[data-post-summary-icons]");
    const commentCountNode = postCard.querySelector("[data-post-comment-count-inline]");
    const commentButtonLabel = postCard.querySelector("[data-post-comment-button-label]");
    const reactLabel = postCard.querySelector("[data-post-react-label]");
    const reactButton = postCard.querySelector("[data-post-action='react-toggle']");
    const picker = postCard.querySelector("[data-post-reaction-picker]");

    if (iconsWrap) {
      iconsWrap.innerHTML = buildReactionIconsMarkup(summary.counts);
    }
    if (commentCountNode) {
      commentCountNode.textContent = formatCommentCountLabel(summary.commentCount);
    }
    if (commentButtonLabel) {
      commentButtonLabel.textContent = formatCommentButtonLabel(summary.commentCount);
    }
    if (reactLabel) {
      reactLabel.textContent = summary.viewerReaction
        ? REACTION_META[summary.viewerReaction]?.label || "React"
        : "React";
    }

    reactButton?.classList.toggle("liked", Boolean(summary.viewerReaction));
    picker?.querySelectorAll("[data-reaction-type]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.reactionType === summary.viewerReaction);
    });
  }

  function buildReactionIconsMarkup(counts = {}) {
    const orderedTypes = ["like", "love", "wow"].filter((type) => Number(counts[type]) > 0);
    const total = orderedTypes.reduce((sum, type) => sum + (Number(counts[type]) || 0), 0);
    if (!orderedTypes.length) {
      return `<span class="reaction-count" data-post-total-reactions>0 reactions</span>`;
    }

    return `
      ${orderedTypes.map((type) => `<img class="react-icon" src="${escapeAttribute(REACTION_META[type].icon)}" alt="${escapeAttribute(REACTION_META[type].label)}" />`).join("")}
      <span class="reaction-count" data-post-total-reactions>${escapeHtml(formatReactionCountLabel(total))}</span>
    `;
  }

  function toggleReactionPicker(postCard) {
    const picker = postCard.querySelector("[data-post-reaction-picker]");
    if (!picker) {
      return;
    }

    const shouldOpen = picker.classList.contains("hidden");
    closeAllReactionPickers();
    picker.classList.toggle("hidden", !shouldOpen);
  }

  function closeAllReactionPickers() {
    feedList?.querySelectorAll("[data-post-reaction-picker]").forEach((picker) => {
      picker.classList.add("hidden");
    });
  }

  function findPostCard(postId) {
    return feedList?.querySelector(`[data-post-id="${String(postId)}"]`) || null;
  }

  function captureFeedUiState() {
    return Array.from(feedList?.querySelectorAll("[data-post-comments-section]") || [])
      .filter((section) => !section.classList.contains("hidden"))
      .map((section) => {
        const postCard = section.closest("[data-post-id]");
        const postId = Number(postCard?.dataset.postId);
        const input = section.querySelector("[data-comment-input]");

        return {
          postId,
          commentDraft: input?.value || "",
        };
      })
      .filter((entry) => Number.isInteger(entry.postId) && entry.postId > 0);
  }

  async function restoreFeedUiState(entries) {
    await Promise.all(entries.map(async (entry) => {
      const postCard = findPostCard(entry.postId);
      const commentsSection = postCard?.querySelector("[data-post-comments-section]");
      const input = commentsSection?.querySelector("[data-comment-input]");

      if (!postCard || !commentsSection) {
        return;
      }

      commentsSection.classList.remove("hidden");
      if (input) {
        input.value = entry.commentDraft || "";
      }

      await loadComments(entry.postId, { silent: true });
    }));
  }

  function buildFeedSnapshot(items) {
    return items
      .map((item) => `${item.postId}:${item.createdAt || ""}:${item.content || ""}`)
      .join("|");
  }

  function renderComments(postId, comments) {
    const postCard = findPostCard(postId);
    const commentsList = postCard?.querySelector("[data-comments-list]");
    const commentsStatus = postCard?.querySelector("[data-comments-status]");
    if (!commentsList || !commentsStatus) {
      return;
    }

    if (!comments.length) {
      commentsList.innerHTML = "";
      commentsStatus.textContent = "No comments yet. Start the conversation.";
      commentsStatus.classList.remove("is-error");
      return;
    }

    commentsList.innerHTML = comments.map(renderCommentItem).join("");
    commentsStatus.textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"} loaded`;
    commentsStatus.classList.remove("is-error");
  }

  function appendComment(postId, comment) {
    const postCard = findPostCard(postId);
    const commentsList = postCard?.querySelector("[data-comments-list]");
    const commentsStatus = postCard?.querySelector("[data-comments-status]");
    if (!commentsList || !commentsStatus) {
      return;
    }

    commentsStatus.classList.remove("is-error");
    if (!commentsList.children.length) {
      commentsList.innerHTML = renderCommentItem(comment);
    } else {
      commentsList.insertAdjacentHTML("beforeend", renderCommentItem(comment));
    }
  }

  function renderCommentItem(comment) {
    const schoolTag = comment.author?.schoolTag
      ? `<span class="post-comment-school-tag">${escapeHtml(comment.author.schoolTag)}</span>`
      : "";

    return `
      <li class="post-comment-item">
        <div class="post-comment-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(comment.author?.displayName || "Player")}" />
        </div>
        <div class="post-comment-body">
          <div class="post-comment-meta">
            <span class="post-comment-author">${escapeHtml(comment.author?.displayName || "Player")}</span>
            ${schoolTag}
            <span class="post-comment-time">${escapeHtml(comment.createdLabel || "Just now")}</span>
            ${Number(comment.userId) === Number(session.userId) ? `<button type="button" class="post-comment-delete" data-comment-action="delete" data-comment-id="${escapeAttribute(String(comment.commentId))}" data-post-id="${escapeAttribute(String(comment.postId))}">Delete</button>` : ""}
          </div>
          <p class="post-comment-message">${escapeHtml(comment.message || "")}</p>
        </div>
      </li>
    `;
  }

  function updateCommentStatus(postId, message, isError) {
    const postCard = findPostCard(postId);
    const statusNode = postCard?.querySelector("[data-comments-status]");
    if (!statusNode) {
      return;
    }

    statusNode.textContent = message;
    statusNode.classList.toggle("is-error", Boolean(isError));
  }

  function sharePost(postId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    navigator.clipboard?.writeText?.(shareUrl).catch(() => {});
    setComposerStatus("Post link copied for sharing.", false);
  }

  async function deletePost(postId) {
    if (!session.userId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/feed/${postId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete post.");
      }

      await refreshLiveDashboard({ forceFeed: true });
    } catch (error) {
      console.error("Post deletion failed:", error);
      setComposerStatus(error.message || "Failed to delete post.", true);
    }
  }

  async function deleteComment(commentId, postId) {
    if (!session.userId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/reactions/posts/${postId}/comments/${commentId}`,
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete comment.");
      }

      commentsLoadedPosts.delete(postId);
      await loadComments(postId);
      if (payload.summary) {
        applyReactionSummary(postId, payload.summary);
      }
    } catch (error) {
      console.error("Comment deletion failed:", error);
      updateCommentStatus(postId, error.message || "Failed to delete comment.", true);
    }
  }

  function renderSearchIdleState() {
    if (!friendSearchResults) {
      return;
    }

    setFriendSearchStatus(
      "Search existing players by in-game name, first name, last name, or school.",
      false,
    );
    friendSearchResults.innerHTML = "";
  }

  function renderSearchResults(items, query) {
    if (!friendSearchResults) {
      return;
    }

    if (!items.length) {
      setFriendSearchStatus(`No players matched "${query}".`, false);
      friendSearchResults.innerHTML = "";
      return;
    }

    setFriendSearchStatus(`Found ${items.length} player${items.length === 1 ? "" : "s"}.`, false);
    friendSearchResults.innerHTML = items.map(renderSearchResultItem).join("");
  }

  function renderSearchResultItem(player) {
    const schoolTag = player.schoolTag
      ? `<span class="friend-school-tag">${escapeHtml(player.schoolTag)}</span>`
      : "";

    return `
      <li class="friend-item friend-item-static">
        <div class="friend-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(player.displayName)}" />
        </div>
        <div class="friend-info">
          <div class="friend-meta">
            <span class="friend-name">${escapeHtml(player.displayName)}</span>
            ${schoolTag}
          </div>
          <span class="friend-username">@${escapeHtml(player.username)}</span>
          <span class="friend-status watching">${escapeHtml(player.primaryGame || player.school || "GamersHub player")}</span>
        </div>
        <div class="friend-actions">${renderSearchAction(player)}</div>
      </li>
    `;
  }

  function renderSearchAction(player) {
    switch (player.relationshipState) {
      case "friends":
        return `<button type="button" class="friend-action-btn secondary" disabled>Friends</button>`;
      case "outgoing_pending":
        return `<button type="button" class="friend-action-btn secondary" disabled>Requested</button>`;
      case "incoming_pending":
        return `<button type="button" class="friend-action-btn secondary" disabled>Check Request</button>`;
      default:
        return `<button type="button" class="friend-action-btn" data-add-friend="${escapeAttribute(String(player.userId))}">Add Friend</button>`;
    }
  }

  function renderIncomingRequests(items) {
    if (!friendRequestsList) {
      return;
    }

    if (!items.length) {
      renderIncomingPlaceholder("No incoming friend requests right now.");
      return;
    }

    friendRequestsList.innerHTML = items.map(renderIncomingRequestItem).join("");
  }

  function renderIncomingRequestItem(friend) {
    const schoolTag = friend.schoolTag
      ? `<span class="friend-school-tag">${escapeHtml(friend.schoolTag)}</span>`
      : "";

    return `
      <li class="friend-item friend-item-static">
        <div class="friend-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(friend.displayName)}" />
        </div>
        <div class="friend-info">
          <div class="friend-meta">
            <span class="friend-name">${escapeHtml(friend.displayName)}</span>
            ${schoolTag}
          </div>
          <span class="friend-username">@${escapeHtml(friend.username)}</span>
          <span class="friend-status watching">${escapeHtml(friend.primaryGame || friend.school || "Wants to connect")}</span>
        </div>
        <div class="friend-actions">
          <button type="button" class="friend-action-btn" data-request-action="accept" data-request-user-id="${escapeAttribute(String(friend.userId))}">Accept</button>
          <button type="button" class="friend-action-btn secondary" data-request-action="decline" data-request-user-id="${escapeAttribute(String(friend.userId))}">Decline</button>
        </div>
      </li>
    `;
  }

  function renderAcceptedFriends(items) {
    if (!dashboardFriendsList) {
      return;
    }

    if (!items.length) {
      renderFriendsPlaceholder("Your accepted friends will appear here.");
      return;
    }

    dashboardFriendsList.innerHTML = items.map(renderAcceptedFriendItem).join("");
  }

  function renderAcceptedFriendItem(friend) {
    if (window.GamersHubFriendsUI?.renderAcceptedFriendItem) {
      return window.GamersHubFriendsUI.renderAcceptedFriendItem(friend);
    }

    const schoolTag = friend.schoolTag
      ? `<span class="friend-school-tag">${escapeHtml(friend.schoolTag)}</span>`
      : "";

    return `
      <li class="friend-item friend-item-static friend-item-menuable">
        <div class="friend-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(friend.displayName)}" />
        </div>
        <div class="friend-info">
          <div class="friend-meta">
            <span class="friend-name">${escapeHtml(friend.displayName)}</span>
            ${schoolTag}
          </div>
          <span class="friend-username">@${escapeHtml(friend.username)}</span>
          <span class="friend-status watching">${escapeHtml(friend.primaryGame || friend.school || "Connected on GamersHub")}</span>
        </div>
      </li>
    `;
  }

  function renderIncomingPlaceholder(message) {
    if (!friendRequestsList) {
      return;
    }

    friendRequestsList.innerHTML = `
      <li class="friend-item friend-item-empty">
        <div class="friend-empty-copy">
          <span class="friend-name">No requests waiting</span>
          <span class="friend-status friend-status-empty">${escapeHtml(message)}</span>
        </div>
      </li>
    `;
  }

  function renderFriendsPlaceholder(message) {
    if (!dashboardFriendsList) {
      return;
    }

    dashboardFriendsList.innerHTML = `
      <li class="friend-item friend-item-empty">
        <div class="friend-empty-copy">
          <span class="friend-name">No friends yet</span>
          <span class="friend-status friend-status-empty">${escapeHtml(message)}</span>
        </div>
      </li>
    `;
  }

  function setFriendSearchStatus(message, isError) {
    if (!friendSearchStatus) {
      return;
    }

    friendSearchStatus.textContent = message;
    friendSearchStatus.classList.toggle("is-error", Boolean(isError));
  }

  function setComposerBusy(isBusy, message, isError = false) {
    if (createPostBtn) {
      createPostBtn.disabled = isBusy;
      createPostBtn.textContent = isBusy ? "Posting..." : "Post";
    }
    if (createPostInput) {
      createPostInput.disabled = isBusy;
    }
    if (photoFileInput) {
      photoFileInput.disabled = isBusy;
    }
    if (videoFileInput) {
      videoFileInput.disabled = isBusy;
    }
    if (clearMediaBtn) {
      clearMediaBtn.disabled = isBusy;
    }
    attachPhotoBtn && (attachPhotoBtn.disabled = isBusy);
    attachVideoBtn && (attachVideoBtn.disabled = isBusy);
    setComposerStatus(message, isError);
    syncComposerControls();
  }

  function setComposerStatus(message, isError = false) {
    if (!createPostStatus) {
      return;
    }

    createPostStatus.textContent = message;
    createPostStatus.classList.toggle("is-error", isError);
    createPostStatus.classList.add("is-visible");
  }

  function inferMediaType(url) {
    if (!url) {
      return null;
    }
    if (String(url).startsWith("/uploads/posts/")) {
      return /\.(mp4|webm|ogg|mov)$/i.test(url) ? "video" : "image";
    }
    if (String(url).startsWith("data:image/")) {
      return "image";
    }
    if (String(url).startsWith("data:video/")) {
      return "video";
    }
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url) ? "image" : "link";
  }

  function openMediaPicker(mediaType) {
    if (selectedMediaType === mediaType && selectedMediaFile) {
      resetMediaComposer();
      return;
    }

    if (mediaType === "image") {
      photoFileInput?.click();
      return;
    }

    videoFileInput?.click();
  }

  async function handleMediaFileSelection(file, mediaType) {
    if (!file) {
      return;
    }

    const sizeLimitBytes = mediaType === "video" ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > sizeLimitBytes) {
      setComposerStatus(
        mediaType === "video"
          ? "Please choose a video smaller than 12 MB."
          : "Please choose an image smaller than 5 MB.",
        true,
      );
      clearSelectedFileInput(mediaType);
      return;
    }

    try {
      selectedMediaType = mediaType;
      selectedMediaFile = file;
      if (selectedMediaPreviewUrl) {
        URL.revokeObjectURL(selectedMediaPreviewUrl);
      }
      selectedMediaPreviewUrl = URL.createObjectURL(file);
      selectedMediaName = file.name || `${mediaType} attachment`;
      mediaComposerRow?.classList.remove("hidden");
      attachPhotoBtn?.classList.toggle("is-active", mediaType === "image");
      attachVideoBtn?.classList.toggle("is-active", mediaType === "video");
      if (mediaPreviewLabel) {
        mediaPreviewLabel.textContent = mediaType === "video" ? "Selected video" : "Selected photo";
      }
      if (mediaPreviewName) {
        mediaPreviewName.textContent = selectedMediaName;
      }
      renderComposerMediaPreview(mediaType, selectedMediaPreviewUrl, selectedMediaName, file.size);
      setComposerStatus(`${selectedMediaName} is ready to post.`, false);
      syncComposerControls();
    } catch (error) {
      console.error("Media selection failed:", error);
      setComposerStatus("That file could not be loaded. Please try another one.", true);
      resetMediaComposer();
    }
  }

  function resetMediaComposer() {
    selectedMediaType = null;
    selectedMediaFile = null;
    if (selectedMediaPreviewUrl) {
      URL.revokeObjectURL(selectedMediaPreviewUrl);
      selectedMediaPreviewUrl = "";
    }
    selectedMediaName = "";
    mediaComposerRow?.classList.add("hidden");
    attachPhotoBtn?.classList.remove("is-active");
    attachVideoBtn?.classList.remove("is-active");
    if (mediaPreviewLabel) {
      mediaPreviewLabel.textContent = "Selected media";
    }
    if (mediaPreviewName) {
      mediaPreviewName.textContent = "No file selected";
    }
    renderComposerMediaPreview();
    if (photoFileInput) {
      photoFileInput.value = "";
    }
    if (videoFileInput) {
      videoFileInput.value = "";
    }
    syncComposerControls();
  }

  function syncComposerControls() {
    const hasText = Boolean(createPostInput?.value.trim());
    const hasMediaSelection = Boolean(selectedMediaFile);
    const shouldShowPost = hasText || hasMediaSelection;

    createPostBtn?.classList.toggle("hidden", !shouldShowPost);
    createPostStatus?.classList.toggle("is-visible", Boolean(createPostStatus?.textContent.trim()) && shouldShowPost);
  }

  function clearSelectedFileInput(mediaType) {
    if (mediaType === "video") {
      if (videoFileInput) {
        videoFileInput.value = "";
      }
      return;
    }

    if (photoFileInput) {
      photoFileInput.value = "";
    }
  }

  function renderComposerMediaPreview(mediaType = "", previewUrl = "", fileName = "", fileSize = 0) {
    if (!mediaPreviewVisual) {
      return;
    }

    if (!previewUrl || !mediaType) {
      mediaPreviewVisual.innerHTML = `<span class="cp-file-preview-placeholder">+</span>`;
      return;
    }

    const metaCopy = `${mediaType === "video" ? "Video" : "Photo"} • ${formatFileSize(fileSize)}`;
    if (mediaPreviewName) {
      mediaPreviewName.innerHTML = `
        ${escapeHtml(fileName)}
        <span class="cp-file-meta">${escapeHtml(metaCopy)}</span>
      `;
    }

    mediaPreviewVisual.innerHTML = mediaType === "video"
      ? `
        <video muted playsinline preload="metadata">
          <source src="${escapeAttribute(previewUrl)}" />
        </video>
      `
      : `<img src="${escapeAttribute(previewUrl)}" alt="${escapeAttribute(fileName || "Selected media")}" />`;
  }

  function formatFileSize(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024 * 1024) {
      return `${Math.max(1, Math.round(value / 1024))} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatMetaLabel(value) {
    if (!value) {
      return "1 hr";
    }
    return String(value).startsWith("Post #") ? "Recently posted" : String(value);
  }

  function formatReactionCountLabel(value) {
    const count = Number(value) || 0;
    return count === 1 ? "1 reaction" : `${count} reactions`;
  }

  function formatCommentCountLabel(value) {
    const count = Number(value) || 0;
    return count === 1 ? "1 comment" : `${count} comments`;
  }

  function formatCommentButtonLabel(value) {
    const count = Number(value) || 0;
    return count > 0 ? `Comment (${count})` : "Comment";
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
