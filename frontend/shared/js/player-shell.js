(() => {
  const auth = window.GamersHubAuth;
  if (!auth) {
    return;
  }

  const session = auth.requireAuth({ redirectTo: "../auth/login.html" });
  if (!session) {
    return;
  }

  const API_BASE = auth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const LOCAL_STORAGE_KEY = "gh_notifications";
  const SHARED_ACTIVITY_POLL_INTERVAL_MS = 8000;
  const FRIENDS_COPY = {
    defaultStatus: "Connected on GamersHub",
    messageTitle: "Direct messaging is coming soon",
    messageBody(name) {
      return `We have ${name} selected already. Direct messages are planned next, but the inbox flow is not live yet.`;
    },
    unfriendTitle: "Remove friend",
    unfriendBody(name) {
      return `This will remove ${name} from your accepted friends list. You can always send another friend request later.`;
    },
  };

  const bellButton = document.querySelector(".nav-bell");
  const friendsList = document.querySelector(".friends-list");
  const isDashboardFriendManager = Boolean(document.getElementById("friendSearchInput"));

  let activeFriendMenu = null;
  let activeFriendModal = null;
  let activeModalCleanup = null;
  let sharedActivityPollTimer = null;

  auth.applyUserName();
  applySharedNavigation();

  if (friendsList && !isDashboardFriendManager && friendsList.dataset.source !== "dashboard") {
    void loadAcceptedFriends();
  }

  setupFriendActions();
  setupNotifications();
  startSharedActivityPolling();

  window.addEventListener("gh:friends-updated", () => {
    closeFriendMenu();

    if (friendsList && !isDashboardFriendManager && friendsList.dataset.source !== "dashboard") {
      void loadAcceptedFriends();
    }
  });

  window.addEventListener("gh:notifications-updated", () => {
    void renderNotifications();
  });
  window.addEventListener("focus", () => {
    void refreshSharedActivity();
  });
  document.addEventListener("visibilitychange", handleSharedVisibilityChange);

  function applySharedNavigation() {
    const role = String(session.role || "").toLowerCase();
    const pageRoutes = {
      home: "../player/dashboard.html",
      livestreams: "../player/livestream.html",
      events: "../player/events.html",
      profile: "../player/profile.html",
    };

    document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
      const route = pageRoutes[link.dataset.page];
      if (route) {
        link.setAttribute("href", route);
      }
    });

    document
      .querySelectorAll(".sidebar-logout, .sidebar-link")
      .forEach((link) => {
        const label = (link.textContent || "").trim().toLowerCase();
        if (label === "logout") {
          link.setAttribute("href", "../auth/logout-confirm.html");
        }
      });

    document.querySelector(".nav-logo-wrap")?.setAttribute(
      "href",
      "../player/dashboard.html",
    );

    const homeLink = Array.from(document.querySelectorAll(".nav-link-item")).find(
      (link) => link.textContent.trim().toLowerCase() === "home",
    );
    homeLink?.setAttribute("href", "../player/dashboard.html");

    const tournamentsLink = Array.from(
      document.querySelectorAll(".nav-link-item"),
    ).find((link) => link.textContent.trim().toLowerCase() === "tournaments");
    tournamentsLink?.setAttribute("href", "../player/tournaments.html");

    document.querySelector(".nav-account")?.addEventListener("click", () => {
      window.location.href = "../player/profile.html";
    });

    if (role === "admin" || role === "superadmin") {
      injectRoleShortcut(role);
    }

    injectMobileHamburger();
  }

  function injectMobileHamburger() {
    const navInner = document.querySelector(".nav-inner");
    const leftSidebar = document.querySelector(".left-sidebar");
    if (!navInner || !leftSidebar) return;

    const btn = document.createElement("button");
    btn.className = "nav-hamburger";
    btn.setAttribute("aria-label", "Open navigation");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="2" y="4" width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
      '<rect x="2" y="8.1" width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
      '<rect x="2" y="12.2" width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
      "</svg>";
    navInner.prepend(btn);

    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);

    function openSidebar() {
      leftSidebar.classList.add("is-mobile-open");
      overlay.classList.add("is-visible");
      btn.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
      leftSidebar.classList.remove("is-mobile-open");
      overlay.classList.remove("is-visible");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", openSidebar);
    overlay.addEventListener("click", closeSidebar);

    leftSidebar.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("click", closeSidebar);
    });
  }

  function injectRoleShortcut(role) {
    const sidebarNav = document.querySelector(".sidebar-nav");
    const navLinks = document.querySelector(".nav-right");
    const shortcutHref = role === "superadmin"
      ? "../superadmin/dashboard.html"
      : "../admin/dashboard.html";
    const shortcutLabel = role === "superadmin" ? "Control Center" : "Admin Console";

    if (sidebarNav && !sidebarNav.querySelector("[data-gh-role-shortcut]")) {
      const link = document.createElement("a");
      link.href = shortcutHref;
      link.className = "sidebar-link";
      link.dataset.ghRoleShortcut = "true";
      link.innerHTML = `
        <span class="sidebar-icon">+</span>
        <span>${shortcutLabel}</span>
      `;
      sidebarNav.appendChild(link);
    }

    if (navLinks && !navLinks.querySelector("[data-gh-role-shortcut-nav]")) {
      const link = document.createElement("a");
      link.href = shortcutHref;
      link.className = "nav-link-item";
      link.dataset.ghRoleShortcutNav = "true";
      link.textContent = role === "superadmin" ? "Superadmin" : "Admin";
      navLinks.insertBefore(link, navLinks.querySelector(".nav-account"));
    }
  }

  async function loadAcceptedFriends() {
    if (!friendsList || !session.userId) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${session.userId}/friends`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load friends.");
      }

      renderAcceptedFriends(payload.accepted || []);
      friendsList.dataset.source = "live";
    } catch (error) {
      console.error("Friends loading failed:", error);
      renderFriendsPlaceholder("Friend activity is unavailable right now.");
    }
  }

  function renderAcceptedFriends(items) {
    if (!friendsList) {
      return;
    }

    if (!items.length) {
      renderFriendsPlaceholder(
        "Friend presence will appear here once you start connecting with players.",
      );
      return;
    }

    friendsList.innerHTML = items.map((friend) => renderAcceptedFriendItem(friend)).join("");
  }

  function renderFriendsPlaceholder(message) {
    if (!friendsList) {
      return;
    }

    friendsList.innerHTML = `
      <li class="friend-item friend-item-empty">
        <div class="friend-empty-copy">
          <span class="friend-name">No friend activity yet</span>
          <span class="friend-status friend-status-empty">${escapeHtml(message)}</span>
        </div>
      </li>
    `;
  }

  function renderAcceptedFriendItem(friend, options = {}) {
    const schoolTag = friend.schoolTag
      ? `<span class="friend-school-tag">${escapeHtml(friend.schoolTag)}</span>`
      : "";
    const statusCopy =
      friend.primaryGame || friend.school || options.statusCopy || FRIENDS_COPY.defaultStatus;

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
          <span class="friend-status watching">${escapeHtml(statusCopy)}</span>
        </div>
        <div class="friend-menu-shell">
          <button
            type="button"
            class="friend-menu-trigger"
            data-friend-menu-toggle
            data-friend-id="${escapeAttribute(String(friend.userId))}"
            data-friend-name="${escapeAttribute(friend.displayName)}"
            data-friend-username="${escapeAttribute(friend.username)}"
            aria-label="Open friend actions"
            aria-expanded="false"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="friend-card-menu hidden" data-friend-menu>
            <button
              type="button"
              class="friend-card-menu-item"
              data-friend-action="visit-profile"
              data-friend-id="${escapeAttribute(String(friend.userId))}"
            >
              Visit Profile
            </button>
            <button
              type="button"
              class="friend-card-menu-item"
              data-friend-action="message"
              data-friend-id="${escapeAttribute(String(friend.userId))}"
              data-friend-name="${escapeAttribute(friend.displayName)}"
            >
              Message
            </button>
            <button
              type="button"
              class="friend-card-menu-item danger"
              data-friend-action="unfriend"
              data-friend-id="${escapeAttribute(String(friend.userId))}"
              data-friend-name="${escapeAttribute(friend.displayName)}"
            >
              Unfriend
            </button>
          </div>
        </div>
      </li>
    `;
  }

  function setupFriendActions() {
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-friend-menu-toggle]");
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        toggleFriendMenu(toggle);
        return;
      }

      const actionButton = event.target.closest("[data-friend-action]");
      if (actionButton) {
        event.preventDefault();
        event.stopPropagation();
        void handleFriendAction(actionButton);
        return;
      }

      if (!event.target.closest(".friend-menu-shell")) {
        closeFriendMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeFriendMenu();
        closeFriendModal();
      }
    });
  }

  function toggleFriendMenu(toggle) {
    const menuShell = toggle.closest(".friend-menu-shell");
    const menu = menuShell?.querySelector("[data-friend-menu]");
    if (!menu) {
      return;
    }

    const shouldOpen = menu.classList.contains("hidden");
    closeFriendMenu();

    if (!shouldOpen) {
      return;
    }

    menu.classList.remove("hidden");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    activeFriendMenu = menuShell;
  }

  function closeFriendMenu() {
    if (!activeFriendMenu) {
      return;
    }

    const toggle = activeFriendMenu.querySelector("[data-friend-menu-toggle]");
    const menu = activeFriendMenu.querySelector("[data-friend-menu]");
    menu?.classList.add("hidden");
    toggle?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    activeFriendMenu = null;
  }

  async function handleFriendAction(button) {
    const action = button.dataset.friendAction;
    const friendUserId = Number(button.dataset.friendId);
    const friendName = button.dataset.friendName || "this player";
    closeFriendMenu();

    if (!Number.isInteger(friendUserId) || friendUserId < 1) {
      return;
    }

    if (action === "visit-profile") {
      window.location.href = `../player/profile.html?userId=${encodeURIComponent(friendUserId)}`;
      return;
    }

    if (action === "message") {
      openFriendModal({
        title: FRIENDS_COPY.messageTitle,
        body: FRIENDS_COPY.messageBody(friendName),
        tone: "default",
        confirmLabel: "Got it",
      });
      return;
    }

    if (action === "unfriend") {
      openFriendModal({
        title: FRIENDS_COPY.unfriendTitle,
        body: FRIENDS_COPY.unfriendBody(friendName),
        tone: "danger",
        confirmLabel: "Unfriend",
        cancelLabel: "Keep Friend",
        onConfirm: async () => {
          await removeFriend(friendUserId, friendName);
        },
      });
    }
  }

  async function removeFriend(friendUserId, friendName) {
    const response = await fetch(
      `${API_BASE}/api/users/${session.userId}/friends/${friendUserId}`,
      {
        method: "DELETE",
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Failed to remove friend.");
    }

    addLocalNotification({
      title: "Friend removed",
      body: `${friendName} was removed from your friends list.`,
      linkUrl: "../player/dashboard.html",
    });
    window.dispatchEvent(new Event("gh:friends-updated"));
    window.dispatchEvent(new Event("gh:notifications-updated"));
  }

  function openFriendModal({
    title,
    body,
    confirmLabel = "Close",
    cancelLabel = "",
    tone = "default",
    onConfirm = null,
  }) {
    const modal = buildFriendModal();
    const titleNode = modal.querySelector("[data-friend-modal-title]");
    const bodyNode = modal.querySelector("[data-friend-modal-body]");
    const cancelButton = modal.querySelector("[data-friend-modal-cancel]");
    const confirmButton = modal.querySelector("[data-friend-modal-confirm]");

    titleNode.textContent = title;
    bodyNode.textContent = body;
    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle("danger", tone === "danger");

    if (cancelLabel) {
      cancelButton.textContent = cancelLabel;
      cancelButton.classList.remove("hidden");
    } else {
      cancelButton.classList.add("hidden");
    }

    activeModalCleanup = async () => {
      if (!onConfirm) {
        closeFriendModal();
        return;
      }

      confirmButton.disabled = true;
      cancelButton.disabled = true;
      confirmButton.textContent = tone === "danger" ? "Removing..." : "Opening...";

      try {
        await onConfirm();
        closeFriendModal();
      } catch (error) {
        console.error("Friend action failed:", error);
        bodyNode.textContent = error.message || "This action could not be completed right now.";
        confirmButton.disabled = false;
        cancelButton.disabled = false;
        confirmButton.textContent = confirmLabel;
      }
    };

    modal.classList.remove("hidden");
    document.body.classList.add("has-friend-modal-open");
    activeFriendModal = modal;
  }

  function closeFriendModal() {
    if (!activeFriendModal) {
      return;
    }

    activeFriendModal.classList.add("hidden");
    document.body.classList.remove("has-friend-modal-open");
    activeFriendModal = null;
    activeModalCleanup = null;
  }

  function buildFriendModal() {
    let modal = document.querySelector(".gh-friend-modal-overlay");
    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.className = "gh-friend-modal-overlay hidden";
    modal.innerHTML = `
      <div class="gh-friend-modal" role="dialog" aria-modal="true" aria-labelledby="ghFriendModalTitle">
        <button type="button" class="gh-friend-modal-close" data-friend-modal-close aria-label="Close friend dialog">
          <span></span>
          <span></span>
        </button>
        <div class="gh-friend-modal-kicker">Friend Actions</div>
        <h3 class="gh-friend-modal-title" id="ghFriendModalTitle" data-friend-modal-title></h3>
        <p class="gh-friend-modal-body" data-friend-modal-body></p>
        <div class="gh-friend-modal-actions">
          <button type="button" class="gh-friend-modal-btn ghost" data-friend-modal-cancel>Cancel</button>
          <button type="button" class="gh-friend-modal-btn" data-friend-modal-confirm>Close</button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-friend-modal-close]")) {
        closeFriendModal();
      }
    });

    modal
      .querySelector("[data-friend-modal-cancel]")
      ?.addEventListener("click", closeFriendModal);
    modal
      .querySelector("[data-friend-modal-confirm]")
      ?.addEventListener("click", () => {
        void activeModalCleanup?.();
      });

    document.body.appendChild(modal);
    return modal;
  }

  function setupNotifications() {
    if (!bellButton) {
      return;
    }

    bellButton.addEventListener("click", toggleNotifications);

    document.addEventListener("click", (event) => {
      const panel = document.querySelector(".nav-notifications-panel");
      if (!panel || panel.classList.contains("hidden")) {
        return;
      }

      const clickedInsidePanel = panel.contains(event.target);
      const clickedBell = bellButton.contains(event.target);
      if (!clickedInsidePanel && !clickedBell) {
        closeNotifications();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNotifications();
      }
    });

    document.addEventListener("click", (event) => {
      const clearButton = event.target.closest("#notificationsClearBtn");
      if (!clearButton) {
        return;
      }

      event.preventDefault();
      void clearNotifications();
    });

    document.addEventListener("click", (event) => {
      const notificationLink = event.target.closest(".notification-item");
      if (!notificationLink) {
        return;
      }

      void markNotificationFromElement(notificationLink);
    });

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-gh-notification-title]");
      if (!trigger) {
        return;
      }

      event.preventDefault();
      addLocalNotification({
        title: trigger.dataset.ghNotificationTitle,
        body: trigger.dataset.ghNotificationBody || "",
        linkUrl: trigger.dataset.ghNotificationHref || "#",
      });

      trigger.classList.add("is-saved");
      if (trigger.dataset.ghNotificationLabel) {
        trigger.textContent = trigger.dataset.ghNotificationLabel;
      }
    });

    void renderNotifications();
  }

  function startSharedActivityPolling() {
    stopSharedActivityPolling();
    sharedActivityPollTimer = window.setInterval(() => {
      void refreshSharedActivity();
    }, SHARED_ACTIVITY_POLL_INTERVAL_MS);
  }

  function stopSharedActivityPolling() {
    if (sharedActivityPollTimer) {
      window.clearInterval(sharedActivityPollTimer);
      sharedActivityPollTimer = null;
    }
  }

  async function refreshSharedActivity() {
    if (document.hidden) {
      return;
    }

    const tasks = [renderNotifications()];
    if (friendsList && !isDashboardFriendManager && friendsList.dataset.source !== "dashboard") {
      tasks.push(loadAcceptedFriends());
    }

    await Promise.allSettled(tasks);
  }

  function handleSharedVisibilityChange() {
    if (document.hidden) {
      stopSharedActivityPolling();
      return;
    }

    startSharedActivityPolling();
    void refreshSharedActivity();
  }

  async function renderNotifications() {
    if (!bellButton) {
      return;
    }

    const panel = buildNotificationsPanel();
    const serverNotifications = await fetchServerNotifications();
    const localNotifications = readLocalNotifications();
    const mergedItems = mergeNotifications(serverNotifications, localNotifications);
    const count = mergedItems.filter((item) => item.isRead !== true).length;
    const countNode = panel?.querySelector("#notificationsCount");
    const listNode = panel?.querySelector("#notificationsList");

    ensureBellBadge(count);

    if (countNode) {
      countNode.textContent =
        mergedItems.length === 0 ? "0 notifications" : `${count} unread`;
    }

    if (!listNode) {
      return;
    }

    if (!mergedItems.length) {
      listNode.innerHTML = `
        <div class="notification-empty-state">
          <div>
            <div class="notification-empty-icon">0</div>
            <p class="notification-empty-title">0 notifications</p>
            <p class="notification-empty-sub">
              New alerts will be stored here once friend requests and other player activity start happening.
            </p>
          </div>
        </div>
      `;
      return;
    }

    listNode.innerHTML = mergedItems
      .map((item) => `
        <a
          class="notification-item"
          href="${escapeAttribute(item.linkUrl || "#")}"
          data-id="${escapeAttribute(String(item.notificationId))}"
          data-source="${escapeAttribute(item.source)}"
        >
          <span class="notification-item-title">${escapeHtml(item.title || "Notification")}</span>
          <span class="notification-item-body">${escapeHtml(item.body || "")}</span>
          <span class="notification-item-time">${timeAgo(item.createdAt)}</span>
        </a>
      `)
      .join("");
  }

  async function fetchServerNotifications() {
    if (!session.userId) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/${session.userId}/notifications`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load notifications.");
      }

      return (payload.items || []).map((item) => ({
        ...item,
        source: "server",
      }));
    } catch (error) {
      console.error("Notification loading failed:", error);
      return [];
    }
  }

  async function markNotificationFromElement(element) {
    const source = element.dataset.source;
    const id = element.dataset.id;

    if (source === "server") {
      try {
        await fetch(`${API_BASE}/api/users/${session.userId}/notifications/${id}/read`, {
          method: "PUT",
        });
      } catch (error) {
        console.error("Failed to mark server notification as read:", error);
      }
    } else {
      writeLocalNotifications(
        readLocalNotifications().map((item) =>
          item.notificationId === id ? { ...item, isRead: true } : item,
        ),
      );
    }

    void renderNotifications();
    closeNotifications();
  }

  async function clearNotifications() {
    writeLocalNotifications([]);

    if (session.userId) {
      try {
        await fetch(`${API_BASE}/api/users/${session.userId}/notifications/read-all`, {
          method: "PUT",
        });
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }

    void renderNotifications();
  }

  function addLocalNotification({ title, body, linkUrl = "#" } = {}) {
    const nextItems = [
      {
        notificationId: `local-${Date.now()}`,
        title: title || "Notification",
        body: body || "",
        linkUrl,
        isRead: false,
        createdAt: new Date().toISOString(),
        source: "local",
      },
      ...readLocalNotifications(),
    ].slice(0, 30);

    writeLocalNotifications(nextItems);
    void renderNotifications();
  }

  function readLocalNotifications() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => ({
        notificationId: item.notificationId || item.id || `local-${Date.now()}`,
        title: item.title || "Notification",
        body: item.body || "",
        linkUrl: item.linkUrl || item.href || "#",
        isRead: item.isRead === true || item.read === true,
        createdAt: item.createdAt || new Date().toISOString(),
        source: "local",
      }));
    } catch {
      return [];
    }
  }

  function writeLocalNotifications(items) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  }

  function mergeNotifications(serverItems, localItems) {
    return [...serverItems, ...localItems]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }

  function timeAgo(isoString) {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function ensureBellBadge(count) {
    let badge = bellButton.querySelector(".bell-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "bell-badge";
      bellButton.appendChild(badge);
    }

    badge.textContent = count > 99 ? "99+" : String(count);
    return badge;
  }

  function buildNotificationsPanel() {
    let panel = document.querySelector(".nav-notifications-panel");
    if (panel) {
      return panel;
    }

    panel = document.createElement("section");
    panel.className = "nav-notifications-panel hidden";
    panel.setAttribute("aria-label", "Notifications");
    panel.innerHTML = `
      <div class="notifications-panel-header">
        <div class="notifications-panel-title">
          <span class="notifications-panel-title-text">Notifications</span>
          <span class="notifications-panel-count" id="notificationsCount">0</span>
        </div>
        <button type="button" class="notifications-panel-clear" id="notificationsClearBtn">
          Clear all
        </button>
      </div>
      <div class="notifications-panel-list" id="notificationsList"></div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  function openNotifications() {
    const panel = buildNotificationsPanel();
    void renderNotifications();
    panel.classList.remove("hidden");
    bellButton.classList.add("is-open");
  }

  function closeNotifications() {
    const panel = document.querySelector(".nav-notifications-panel");
    if (!panel) {
      return;
    }

    panel.classList.add("hidden");
    bellButton.classList.remove("is-open");
  }

  function toggleNotifications(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const panel = buildNotificationsPanel();
    if (panel.classList.contains("hidden")) {
      openNotifications();
    } else {
      closeNotifications();
    }
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

  window.GamersHubFriendsUI = {
    renderAcceptedFriendItem,
    closeFriendMenu,
  };

  window.GamersHubNotifications = {
    list() {
      return readLocalNotifications();
    },
    add({ title, body, href = "#", linkUrl } = {}) {
      addLocalNotification({
        title,
        body,
        linkUrl: linkUrl || href || "#",
      });
    },
    clear() {
      void clearNotifications();
    },
    markAllRead() {
      void clearNotifications();
    },
  };
})();
