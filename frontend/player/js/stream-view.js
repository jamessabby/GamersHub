(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const auth = window.GamersHubAuth;
  const session = auth?.getSession?.() || {};
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const streamId = new URLSearchParams(window.location.search).get("streamId");
  const streamPageTitle = document.getElementById("streamPageTitle");
  const streamPageSubtitle = document.getElementById("streamPageSubtitle");
  const streamPlayerWrap = document.getElementById("streamPlayerWrap");
  const streamActions = document.getElementById("streamActions");
  const streamInfoBlock = document.getElementById("streamInfoBlock");
  const commentsLiveIndicator = document.getElementById(
    "commentsLiveIndicator",
  );
  const commentsEmptyState = document.getElementById("commentsEmptyState");
  const commentsList = document.getElementById("commentsList");
  const commentInput = document.getElementById("commentInput");
  const sendCommentBtn = document.getElementById("sendCommentBtn");

  window.addEventListener(
    "scroll",
    () => {
      topNav?.classList.toggle("scrolled", window.scrollY > 8);
    },
    { passive: true },
  );

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  sendCommentBtn?.addEventListener("click", () => {
    void submitComment();
  });

  commentInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitComment();
    }
  });

  renderLoadingState();
  if (streamId) {
    void loadStream();
  } else {
    renderMissingState("No stream was selected.");
  }

  async function loadStream() {
    try {
      const [streamResponse, commentsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/streams/${encodeURIComponent(streamId)}`),
        fetch(
          `${API_BASE}/api/streams/${encodeURIComponent(streamId)}/comments?limit=50`,
        ),
      ]);

      const streamPayload = await streamResponse.json();
      const commentsPayload = await commentsResponse.json();

      if (!streamResponse.ok) {
        throw new Error(streamPayload.message || "Failed to load stream.");
      }

      if (!commentsResponse.ok) {
        throw new Error(commentsPayload.message || "Failed to load comments.");
      }

      renderStream(streamPayload);
      renderComments(commentsPayload.items || [], streamPayload.isLive);

      // Track view and load like status concurrently — non-blocking
      void fetch(
        `${API_BASE}/api/streams/${encodeURIComponent(streamId)}/view`,
        { method: "POST" },
      );
      void loadLikeStatus();
    } catch (error) {
      console.error("Stream view loading failed:", error);
      renderMissingState(error.message || "Failed to load stream.");
    }
  }

  async function submitComment() {
    const message = commentInput?.value.trim() || "";
    if (!streamId || !message) {
      return;
    }

    if (!session.userId) {
      commentInput.value = "";
      commentInput.placeholder = "Please log in again before commenting";
      return;
    }

    try {
      setCommentComposerBusy(true);

      const response = await fetch(
        `${API_BASE}/api/streams/${encodeURIComponent(streamId)}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: session.userId,
            message,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to send comment.");
      }

      commentInput.value = "";
      prependComment(payload);
      setCommentComposerBusy(false);
    } catch (error) {
      console.error("Comment creation failed:", error);
      setCommentComposerBusy(false);
      commentInput.placeholder = error.message || "Comment failed to send";
    }
  }

  function renderLoadingState() {
    if (streamPlayerWrap) {
      streamPlayerWrap.innerHTML = `
        <div class="stream-player-empty-copy">
          <span class="stream-player-empty-kicker">Loading</span>
          <h2 class="stream-player-empty-title">Opening the broadcast room</h2>
          <p class="stream-player-empty-sub">
            We are loading the selected stream and its live comments from your database.
          </p>
        </div>
      `;
    }

    if (streamActions) {
      streamActions.innerHTML = `
        <a href="./livestream.html" class="stream-action-btn stream-action-btn-ghost">
          Back To Livestreams
        </a>
      `;
    }

    if (streamInfoBlock) {
      streamInfoBlock.innerHTML = `
        <div class="stream-status-line">Checking stream status</div>
      `;
    }

    if (commentInput) {
      commentInput.disabled = true;
      commentInput.placeholder = "Loading stream comments";
    }

    if (sendCommentBtn) {
      sendCommentBtn.disabled = true;
    }
  }

  function renderMissingState(message) {
    if (streamPageSubtitle) {
      streamPageSubtitle.textContent = message;
    }

    if (streamPlayerWrap) {
      streamPlayerWrap.className = "stream-player-wrap stream-player-empty";
      streamPlayerWrap.innerHTML = `
        <div class="stream-player-empty-copy">
          <span class="stream-player-empty-kicker">No Active Broadcast</span>
          <h2 class="stream-player-empty-title">There is no live stream to show yet</h2>
          <p class="stream-player-empty-sub">${escapeHtml(message)}</p>
        </div>
      `;
    }

    if (streamActions) {
      streamActions.innerHTML = `
        <button
          type="button"
          class="stream-action-btn stream-action-btn-live"
          data-gh-notification-title="Stream alerts enabled"
          data-gh-notification-body="When a real stream goes live, related alerts can be surfaced in your notification panel."
          data-gh-notification-href="../player/stream-view.html"
          data-gh-notification-label="Saved To Notifications"
        >
          Notify Me When A Stream Starts
        </button>
        <a href="./livestream.html" class="stream-action-btn stream-action-btn-ghost">
          Back To Livestreams
        </a>
      `;
    }

    if (streamInfoBlock) {
      streamInfoBlock.innerHTML = `
        <div class="stream-status-line">Waiting for a real livestream session record</div>
        <p class="stream-description">
          Once a stream is created from the platform backend, this view can display the
          actual broadcast player, metadata, reactions, and live discussion instead of
          placeholder content.
        </p>
      `;
    }

    if (commentsLiveIndicator) {
      commentsLiveIndicator.textContent = "0 live comments";
      commentsLiveIndicator.classList.add("comments-live-indicator-muted");
    }

    if (commentInput) {
      commentInput.disabled = true;
      commentInput.placeholder =
        "Commenting will unlock during real live sessions";
    }

    if (sendCommentBtn) {
      sendCommentBtn.disabled = true;
    }
  }

  function renderStream(stream) {
    document.title = `GamersHub - ${stream.title || "Stream View"}`;

    if (streamPageTitle) {
      streamPageTitle.textContent = stream.title || "Stream View";
    }

    if (streamPageSubtitle) {
      streamPageSubtitle.textContent = stream.isLive
        ? `Live now in ${stream.gameName || "GamersHub"}`
        : `Recorded or scheduled stream in ${stream.gameName || "GamersHub"}`;
    }

    renderPlayer(stream);
    renderActions(stream);
    renderInfo(stream);

    if (commentInput) {
      commentInput.disabled = false;
      commentInput.placeholder = stream.isLive
        ? "Join the live chat"
        : "Leave a comment on this stream";
    }

    if (sendCommentBtn) {
      sendCommentBtn.disabled = false;
    }
  }

  function renderPlayer(stream) {
    if (!streamPlayerWrap) {
      return;
    }

    streamPlayerWrap.className = "stream-player-wrap";
    streamPlayerWrap.innerHTML = `
      ${
        stream.isLive
          ? `
        <div class="stream-live-badge">
          <span class="stream-live-dot"></span>
          LIVE
        </div>
      `
          : ""
      }
      <div class="stream-viewer-count">${formatCount(stream.viewerCount)} views</div>
      ${renderPlaybackEmbed(stream)}
    `;
  }

  function renderActions(stream) {
    if (!streamActions) {
      return;
    }

    const playbackHref = stream.playbackUrl || "#";
    streamActions.className = "stream-actions";
    streamActions.innerHTML = `
      <a
        href="${escapeAttribute(playbackHref)}"
        class="stream-action-btn stream-action-btn-live"
        ${stream.playbackUrl ? 'target="_blank" rel="noreferrer"' : ""}
      >
        Open Playback
      </a>
      <button type="button" class="stream-action-btn" id="streamLikeBtn">&#9825; — Like</button>
      <button type="button" class="stream-action-btn" id="copyStreamLinkBtn">Share</button>
      <a href="./livestream.html" class="stream-action-btn stream-action-btn-ghost">
        Back To Livestreams
      </a>
    `;

    const copyButton = document.getElementById("copyStreamLinkBtn");
    copyButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyButton.textContent = "Copied";
      } catch {
        copyButton.textContent = "Link Ready";
      }
    });
  }

  async function loadLikeStatus() {
    try {
      const response = await fetch(
        `${API_BASE}/api/streams/${encodeURIComponent(streamId)}/likes`,
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      renderLikeButton(data.likeCount, data.liked);
      bindLikeButton();
    } catch {
      // Non-critical — like button stays as placeholder
    }
  }

  function renderLikeButton(count, liked) {
    const btn = document.getElementById("streamLikeBtn");
    if (!btn) {
      return;
    }
    btn.textContent = liked ? `♥ ${count} Liked` : `♡ ${count} Like`;
    btn.classList.toggle("stream-action-btn-liked", liked);
    btn.dataset.liked = liked ? "true" : "false";
    btn.dataset.likeCount = String(count);
  }

  function bindLikeButton() {
    const btn = document.getElementById("streamLikeBtn");
    if (!btn) {
      return;
    }
    btn.addEventListener("click", async () => {
      if (!session.userId) {
        btn.textContent = "Log in to like";
        return;
      }
      const isLiked = btn.dataset.liked === "true";
      btn.disabled = true;
      try {
        const response = await fetch(
          `${API_BASE}/api/streams/${encodeURIComponent(streamId)}/likes`,
          { method: isLiked ? "DELETE" : "POST" },
        );
        if (response.ok) {
          const data = await response.json();
          renderLikeButton(data.likeCount, data.liked);
        }
      } catch {
        // Non-critical
      } finally {
        btn.disabled = false;
      }
    });
  }

  function renderInfo(stream) {
    if (!streamInfoBlock) {
      return;
    }

    const schoolTag = stream.author?.schoolTag
      ? `<span class="stream-tag">${escapeHtml(stream.author.schoolTag)}</span>`
      : "";
    const gameTag = stream.gameName
      ? `<span class="stream-tag">${escapeHtml(stream.gameName)}</span>`
      : "";
    const tournamentTag = stream.tournamentId
      ? `<span class="stream-tag stream-tag-tournament">Tournament #${stream.tournamentId}</span>`
      : "";

    streamInfoBlock.className = "stream-info-block";
    streamInfoBlock.innerHTML = `
      <div class="stream-status-line">
        ${escapeHtml(stream.isLive ? `Live now • ${stream.startedLabel}` : stream.startedLabel)}
      </div>
      <div class="stream-channel-row">
        <div class="stream-channel-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(stream.author?.displayName || "Streamer")}" />
        </div>
        <div class="stream-channel-meta">
          <div class="stream-channel-name">${escapeHtml(stream.author?.displayName || "Streamer")}</div>
          <div class="stream-channel-sub">@${escapeHtml(stream.author?.username || "user")}</div>
        </div>
      </div>
      <div class="stream-title">${escapeHtml(stream.title || "Untitled stream")}</div>
      <p class="stream-description">
        ${escapeHtml(stream.description || "No stream description has been added yet.")}
      </p>
      <div class="stream-tags">
        ${gameTag}
        ${tournamentTag}
        ${schoolTag}
      </div>
    `;
  }

  function renderComments(items, isLive) {
    if (!commentsLiveIndicator || !commentsEmptyState || !commentsList) {
      return;
    }

    commentsLiveIndicator.textContent = `${items.length} live comments`;
    commentsLiveIndicator.classList.toggle(
      "comments-live-indicator-muted",
      !isLive,
    );

    if (!items.length) {
      commentsEmptyState.classList.remove("hidden");
      commentsList.classList.add("hidden");
      commentsList.innerHTML = "";
      return;
    }

    commentsEmptyState.classList.add("hidden");
    commentsList.classList.remove("hidden");
    commentsList.innerHTML = items.map(renderCommentItem).join("");
    commentsList.scrollTop = commentsList.scrollHeight;
  }

  function prependComment(comment) {
    if (!commentsEmptyState || !commentsList || !commentsLiveIndicator) {
      return;
    }

    commentsEmptyState.classList.add("hidden");
    commentsList.classList.remove("hidden");
    commentsList.insertAdjacentHTML("beforeend", renderCommentItem(comment));

    const count = commentsList.querySelectorAll(".comment-item").length;
    commentsLiveIndicator.textContent = `${count} live comments`;
    commentsLiveIndicator.classList.remove("comments-live-indicator-muted");
    commentsList.scrollTop = commentsList.scrollHeight;
  }

  function setCommentComposerBusy(isBusy) {
    if (commentInput) {
      commentInput.disabled = isBusy;
    }

    if (sendCommentBtn) {
      sendCommentBtn.disabled = isBusy;
    }
  }

  function renderPlaybackEmbed(stream) {
    if (stream.playbackUrl) {
      const youtubeUrl = toYouTubeEmbedUrl(stream.playbackUrl);
      if (youtubeUrl) {
        return `
          <iframe
            class="stream-video-placeholder"
            src="${escapeAttribute(youtubeUrl)}"
            title="${escapeAttribute(stream.title || "Stream playback")}"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
          ></iframe>
        `;
      }

      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(stream.playbackUrl)) {
        return `
          <video class="stream-video-placeholder" controls autoplay ${stream.isLive ? "muted" : ""}>
            <source src="${escapeAttribute(stream.playbackUrl)}" />
          </video>
        `;
      }
    }

    return `
      <img
        class="stream-video-placeholder"
        src="${escapeAttribute(stream.thumbnailUrl || "../assets/img/livestreams/thumbnail.jpg")}"
        alt="${escapeAttribute(stream.title || "Stream thumbnail")}"
      />
    `;
  }

  function toYouTubeEmbedUrl(url) {
    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes("youtube.com")) {
        const videoId = parsed.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (parsed.hostname.includes("youtu.be")) {
        const videoId = parsed.pathname.replace(/^\//, "");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    } catch {
      return null;
    }

    return null;
  }

  function renderCommentItem(comment) {
    return `
      <li class="comment-item">
        <div class="comment-avatar">
          <img src="../assets/icons/player-dashboard-icons/user-profile.png" alt="${escapeAttribute(comment.author?.displayName || "Player")}" />
        </div>
        <div class="comment-body">
          <span class="comment-username">
            ${escapeHtml(comment.author?.displayName || "Player")} • ${escapeHtml(comment.createdLabel || "Just now")}
          </span>
          <p class="comment-text">${escapeHtml(comment.message || "")}</p>
        </div>
      </li>
    `;
  }

  function formatCount(value) {
    const count = Number(value) || 0;
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    }

    return String(count);
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
