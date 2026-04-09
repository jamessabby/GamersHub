(() => {
  const auth = window.GamersHubAuth;
  if (!auth) {
    return;
  }

  const session = auth.requireAuth({ redirectTo: "../auth/login.html" });
  if (!session) {
    return;
  }

  auth.applyUserName();

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

  const friendsList = document.querySelector(".friends-list");
  if (friendsList && friendsList.dataset.source !== "live") {
    friendsList.innerHTML = `
      <li class="friend-item friend-item-empty">
        <div class="friend-empty-copy">
          <span class="friend-name">No friend activity yet</span>
          <span class="friend-status friend-status-empty">
            Friend presence will appear here once real accounts and connection data are available.
          </span>
        </div>
      </li>
    `;
  }

  const STORAGE_KEY = "gh_notifications";
  const bellButton = document.querySelector(".nav-bell");

  function readNotifications() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeNotifications(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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

  function unreadCount(items) {
    return items.filter((item) => item && item.read !== true).length;
  }

  function ensureBellBadge(count) {
    if (!bellButton) {
      return null;
    }

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
    if (!bellButton) {
      return null;
    }

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

  function renderNotifications() {
    if (!bellButton) {
      return;
    }

    const items = readNotifications();
    const panel = buildNotificationsPanel();
    const count = unreadCount(items);
    const countNode = panel?.querySelector("#notificationsCount");
    const listNode = panel?.querySelector("#notificationsList");

    ensureBellBadge(count);

    if (countNode) {
      countNode.textContent =
        items.length === 0
          ? "0 notifications"
          : `${count} unread`;
    }

    if (!listNode) {
      return;
    }

    if (!items.length) {
      listNode.innerHTML = `
        <div class="notification-empty-state">
          <div>
            <div class="notification-empty-icon">0</div>
            <p class="notification-empty-title">0 notifications</p>
            <p class="notification-empty-sub">
              New alerts will be stored here once notification events are available in the app.
            </p>
          </div>
        </div>
      `;
      return;
    }

    listNode.innerHTML = items
      .map((item) => {
        const href = item.href || "#";
        const safeTitle = String(item.title || "Notification");
        const safeBody = String(item.body || "");

        return `
          <a class="notification-item" href="${href}" data-id="${item.id}">
            <span class="notification-item-title">${safeTitle}</span>
            <span class="notification-item-body">${safeBody}</span>
            <span class="notification-item-time">${timeAgo(item.createdAt)}</span>
          </a>
        `;
      })
      .join("");
  }

  function openNotifications() {
    const panel = buildNotificationsPanel();
    if (!panel || !bellButton) {
      return;
    }

    renderNotifications();
    panel.classList.remove("hidden");
    bellButton.classList.add("is-open");
  }

  function closeNotifications() {
    const panel = document.querySelector(".nav-notifications-panel");
    if (!panel || !bellButton) {
      return;
    }

    panel.classList.add("hidden");
    bellButton.classList.remove("is-open");
  }

  function toggleNotifications(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const panel = buildNotificationsPanel();
    if (!panel) {
      return;
    }

    if (panel.classList.contains("hidden")) {
      openNotifications();
    } else {
      closeNotifications();
    }
  }

  window.GamersHubNotifications = {
    list() {
      return readNotifications();
    },
    add({ title, body, href = "#", read = false } = {}) {
      const nextItems = [
        {
          id: `notif-${Date.now()}`,
          title: title || "Notification",
          body: body || "",
          href,
          read,
          createdAt: new Date().toISOString(),
        },
        ...readNotifications(),
      ].slice(0, 30);

      writeNotifications(nextItems);
      renderNotifications();
    },
    clear() {
      writeNotifications([]);
      renderNotifications();
    },
    markAllRead() {
      writeNotifications(
        readNotifications().map((item) => ({ ...item, read: true })),
      );
      renderNotifications();
    },
  };

  if (bellButton) {
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
      window.GamersHubNotifications.clear();
    });

    document.addEventListener("click", (event) => {
      const notificationLink = event.target.closest(".notification-item");
      if (!notificationLink) {
        return;
      }

      const id = notificationLink.dataset.id;
      const updated = readNotifications().map((item) =>
        item.id === id ? { ...item, read: true } : item,
      );
      writeNotifications(updated);
      renderNotifications();
      closeNotifications();
    });

    renderNotifications();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gh-notification-title]");
    if (!trigger) {
      return;
    }

    event.preventDefault();

    const title = trigger.dataset.ghNotificationTitle;
    const body = trigger.dataset.ghNotificationBody || "";
    const href = trigger.dataset.ghNotificationHref || "#";

    window.GamersHubNotifications?.add({
      title,
      body,
      href,
    });

    trigger.classList.add("is-saved");

    if (trigger.dataset.ghNotificationLabel) {
      trigger.textContent = trigger.dataset.ghNotificationLabel;
    }
  });
})();
