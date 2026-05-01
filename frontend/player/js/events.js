(() => {
  const API_BASE = window.GamersHubAuth?.apiBase || `http://${window.location.hostname || "localhost"}:3000`;
  const topNav = document.getElementById("topNav");
  const searchInput = document.getElementById("searchInput");
  const eventsLoading = document.getElementById("eventsLoading");
  const eventsList = document.getElementById("eventsList");
  const eventsEmpty = document.getElementById("eventsEmpty");
  const eventsFilters = document.getElementById("eventsFilters");

  let allEvents = [];
  let activeFilter = "all";
  let searchQuery = "";

  window.addEventListener("scroll", () => {
    topNav?.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput?.focus();
    }
  });

  function formatEventDate(dateStr, timeStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!timeStr) return datePart;
    const [h, m] = timeStr.split(":");
    const t = new Date();
    t.setHours(Number(h), Number(m), 0);
    const timePart = t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
  }

  function buildEventRow(ev) {
    const category = (ev.category || "").toLowerCase();
    const dateLabel = formatEventDate(ev.eventDate, ev.eventTime);
    const venue = ev.venue ? `📍 ${ev.venue}` : "";
    const meta = [dateLabel, venue].filter(Boolean).join("  ·  ");

    return `<div class="event-row" data-category="${category}">
      <div class="event-row-thumb">
        <img src="../assets/img/event-placeholder.png" alt="${ev.title}" onerror="this.style.display='none'">
      </div>
      <div class="event-row-body">
        <p class="event-row-title">${ev.title}</p>
        ${ev.description ? `<p class="event-row-desc">${ev.description}</p>` : ""}
        ${meta ? `<p class="event-row-meta">${meta}</p>` : ""}
        ${ev.category ? `<span class="event-row-org">${ev.category}</span>` : ""}
      </div>
    </div>`;
  }

  function applyFilter() {
    const query = searchQuery.toLowerCase().trim();
    const rows = eventsList.querySelectorAll(".event-row");
    let visible = 0;
    rows.forEach((row) => {
      const cat = row.dataset.category || "";
      const text = row.textContent.toLowerCase();
      const catMatch = activeFilter === "all" || cat === activeFilter;
      const textMatch = !query || text.includes(query);
      const matches = catMatch && textMatch;
      row.style.display = matches ? "" : "none";
      if (matches) visible++;
    });
    eventsEmpty.classList.toggle("hidden", visible > 0);
  }

  eventsFilters?.addEventListener("click", (e) => {
    const pill = e.target.closest(".events-pill");
    if (!pill) return;
    eventsFilters.querySelectorAll(".events-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeFilter = pill.dataset.filter || "all";
    applyFilter();
  });

  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    applyFilter();
  });

  async function loadEvents() {
    try {
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      allEvents = data.items || [];
    } catch {
      allEvents = [];
    }

    eventsLoading.classList.add("hidden");

    if (allEvents.length === 0) {
      eventsEmpty.classList.remove("hidden");
      return;
    }

    eventsList.innerHTML = allEvents.map(buildEventRow).join("");
    eventsList.classList.remove("events-list--hidden");
    applyFilter();
  }

  loadEvents();
})();
