(() => {
  /* ─────────────────────────────────────────────
     MOCK EVENT DATA
     ───────────────────────────────────────────── */
  const EVENTS = {
    1: {
      title:  "Valorant Champions Tour",
      org:    "DLSUD CEAT Esports · University Championship Series",
      game:   "Valorant",
      status: "upcoming",
      date:   "March 28, 2026",
      time:   "2:00 PM – 6:00 PM",
      format: "5v5 Double Elim",
      prize:  "₱15,000 Prize Pool",
      desc:   "The Valorant Champions Tour is GamersHub's flagship university-level competition. Eight teams from across the college battle it out in a best-of-three double-elimination bracket. Matches are broadcast live on GamersHub with full production coverage.",
      img:    "../assets/img/livestreams/event2-icon.png",
    },
    2: {
      title:  "MLBB Championship: DLSUD vs NU-D",
      org:    "DLSUD ULS",
      game:   "MLBB",
      status: "upcoming",
      date:   "February 19, 2026",
      time:   "1:00 PM – 4:00 PM",
      format: "5v5 Best of 3",
      prize:  "University Points",
      desc:   "Inter-university Mobile Legends: Bang Bang match between the reigning DLSUD Esports team and the NU-Dasmariñas challengers. Playoffs qualifier — winner advances to the next round of the league.",
      img:    "../assets/img/livestreams/event1-icon.jpg",
    },
    3: {
      title:  "Valorant Championship: DLSUD vs NU-D",
      org:    "DLSUD ULS",
      game:   "Valorant",
      status: "upcoming",
      date:   "February 19, 2026",
      time:   "4:00 PM – 6:00 PM",
      format: "5v5 Best of 3",
      prize:  "University Points",
      desc:   "Head-to-head Valorant qualifier between DLSUD and NU-Dasmariñas. Both squads are seeded from the regular season standings. The winning team earns automatic seeding into the championship bracket.",
      img:    "../assets/img/livestreams/event2-icon.png",
    },
    4: {
      title:  "PUBG Mobile Grand Finals – Season 4",
      org:    "DLSUD CEAT",
      game:   "PUBG Mobile",
      status: "live",
      date:   "March 22, 2026",
      time:   "10:00 AM – 5:00 PM",
      format: "16 Teams · Battle Royale",
      prize:  "₱20,000 Prize Pool",
      desc:   "Top 16 university teams compete across six rounds of PUBG Mobile for the Season 4 championship. Current standings and live stats visible on the GamersHub stream dashboard.",
      img:    "../assets/img/livestreams/thumbnail.jpg",
    },
    5: {
      title:  "GamersHub Community Cup – Spring 2026",
      org:    "GHub Community",
      game:   "Multi-title",
      status: "upcoming",
      date:   "April 5, 2026",
      time:   "9:00 AM – 8:00 PM",
      format: "Open Registration",
      prize:  "Exclusive GHub Merch",
      desc:   "Open to all registered GamersHub players — not just university students. The Spring Community Cup spans MLBB, Valorant, and PUBG Mobile in a single-day festival format with drop-in brackets.",
      img:    "../assets/img/livestreams/event3-icon.jpg",
    },
    6: {
      title:  "COD Mobile Intercollege Showdown",
      org:    "DLSUD ULS",
      game:   "COD Mobile",
      status: "ended",
      date:   "March 8, 2026",
      time:   "1:00 PM – 7:00 PM",
      format: "4 Colleges · Round Robin",
      prize:  "₱8,000 Prize Pool",
      desc:   "Four college teams competed in a full round-robin bracket for the COD Mobile intercollege title. Finals match was streamed live with 3.2K concurrent viewers. DLSUD CEAT claimed first place.",
      img:    "../assets/img/livestreams/cod-select.jpg",
    },
    7: {
      title:  "Freshmen Esports Cup 2026",
      org:    "GHub Community",
      game:   "Multi-title",
      status: "upcoming",
      date:   "April 12, 2026",
      time:   "8:00 AM – 6:00 PM",
      format: "First-year Only",
      prize:  "Trophies + GHub Profile Badges",
      desc:   "The annual freshmen-exclusive esports festival. Register your team of 5 in MLBB, Valorant, or PUBG Mobile and compete for bragging rights, trophies, and exclusive GamersHub profile badges for your entire squad.",
      img:    "../assets/img/livestreams/dlsud-logo.jpg",
    },
  };

  /* ─────────────────────────────────────────────
     DOM REFERENCES
     ───────────────────────────────────────────── */
  const topNav       = document.getElementById('topNav');
  const bellBtn      = document.getElementById('bellBtn');
  const bellBadge    = document.getElementById('bellBadge');
  const filterTabs   = document.querySelectorAll('.events-filter-tab');
  const eventCards   = document.querySelectorAll('.event-card');
  const emptyState   = document.getElementById('eventsEmpty');
  const resultCount  = document.getElementById('resultCount');
  const gameAvatars  = document.querySelectorAll('.game-selector-avatar');

  /* Drawer */
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerClose   = document.getElementById('drawerClose');
  const drawerImg     = document.getElementById('drawerImg');
  const drawerTitle   = document.getElementById('drawerTitle');
  const drawerOrg     = document.getElementById('drawerOrg');
  const drawerDesc    = document.getElementById('drawerDesc');
  const drawerDate    = document.getElementById('drawerDate');
  const drawerTime    = document.getElementById('drawerTime');
  const drawerFormat  = document.getElementById('drawerFormat');
  const drawerPrize   = document.getElementById('drawerPrize');
  const drawerStatus  = document.getElementById('drawerStatus');
  const drawerGame    = document.getElementById('drawerGame');
  const drawerCta     = document.getElementById('drawerCta');
  const featuredCta   = document.querySelector('.events-featured-cta');

  /* ─────────────────────────────────────────────
     NAVBAR SCROLL SHADOW
     ───────────────────────────────────────────── */
  window.addEventListener('scroll', () => {
    topNav?.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ─────────────────────────────────────────────
     BELL BADGE DISMISS
     ───────────────────────────────────────────── */
  bellBtn?.addEventListener('click', () => {
    if (bellBadge) {
      bellBadge.style.transform = 'scale(0)';
      bellBadge.style.transition = 'transform 0.2s ease';
    }
  });

  /* ─────────────────────────────────────────────
     FILTER LOGIC
     ───────────────────────────────────────────── */

  /* Tab → game mapping for sidebar avatar clicks */
  const GAME_TO_FILTER = {
    all:      'all',
    valorant: 'valorant',
    cod:      'cod',
    pubg:     'pubg',
    roblox:   'community',
  };

  function applyFilter(filterValue) {
    let visible = 0;

    eventCards.forEach((card) => {
      const cardFilter = card.dataset.filter;
      const show =
        filterValue === 'all' ||
        cardFilter === filterValue;

      if (show) {
        card.style.display = 'flex';
        /* re-trigger reveal animation */
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = '';
        visible++;
      } else {
        card.style.display = 'none';
      }
    });

    /* Empty state */
    if (emptyState) {
      emptyState.classList.toggle('visible', visible === 0);
    }

    /* Result count */
    if (resultCount) {
      resultCount.textContent = visible === 1 ? '1 Event' : `${visible} Events`;
    }
  }

  /* Tab click */
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      applyFilter(tab.dataset.filter);
    });
  });

  /* Sidebar game avatar click */
  gameAvatars.forEach((avatar) => {
    avatar.addEventListener('click', () => {
      gameAvatars.forEach((a) => a.classList.remove('active'));
      avatar.classList.add('active');

      const game   = avatar.dataset.game;
      const filter = GAME_TO_FILTER[game] || 'all';

      /* Sync the filter tabs */
      filterTabs.forEach((t) => {
        const match = t.dataset.filter === filter;
        t.classList.toggle('active', match);
        t.setAttribute('aria-selected', String(match));
      });

      applyFilter(filter);
    });
  });

  /* ─────────────────────────────────────────────
     DRAWER
     ───────────────────────────────────────────── */
  function openDrawer(eventId) {
    const ev = EVENTS[eventId];
    if (!ev) return;

    /* Populate */
    drawerImg.src     = ev.img;
    drawerImg.alt     = ev.title;
    drawerTitle.textContent  = ev.title;
    drawerOrg.textContent    = ev.org;
    drawerDesc.textContent   = ev.desc;
    drawerDate.textContent   = ev.date;
    drawerTime.textContent   = ev.time;
    drawerFormat.textContent = ev.format;
    drawerPrize.textContent  = ev.prize;
    drawerGame.textContent   = ev.game;

    /* Status badge */
    drawerStatus.textContent = ev.status === 'live' ? 'Live Now'
                             : ev.status === 'ended' ? 'Ended'
                             : 'Upcoming';
    drawerStatus.className = 'event-drawer-status-badge ' + ev.status;

    /* CTA state */
    drawerCta.textContent = ev.status === 'ended'  ? 'View Recap'
                          : ev.status === 'live'   ? 'Watch Live'
                          : 'Register Now';
    drawerCta.disabled = false;

    drawerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /* Card click */
  eventCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      /* Don't double-fire if cta chevron is clicked */
      const id = parseInt(card.dataset.eventId, 10);
      openDrawer(id);
    });
  });

  /* Featured CTA */
  featuredCta?.addEventListener('click', () => {
    const id = parseInt(featuredCta.dataset.eventId, 10);
    openDrawer(id);
  });

  /* Close controls */
  drawerClose?.addEventListener('click', closeDrawer);

  drawerOverlay?.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawerOverlay.classList.contains('hidden')) {
      closeDrawer();
    }
  });

  /* ─────────────────────────────────────────────
     KEYBOARD SHORTCUT: Ctrl/Cmd+K → search
     ───────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    }
  });

  /* ─────────────────────────────────────────────
     INIT — default: show all
     ───────────────────────────────────────────── */
  applyFilter('all');
})();

