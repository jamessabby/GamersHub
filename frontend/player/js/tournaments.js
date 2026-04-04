/* ═══════════════════════════════════════════════
   tournaments.js  —  GamersHub · Tournaments page
   IIFE — no globals, no framework.
   ═══════════════════════════════════════════════ */
(() => {

  /* ── NAVBAR SCROLL SHADOW ─────────────────────── */
  const topNav = document.getElementById('topNav');

  window.addEventListener('scroll', () => {
    topNav?.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ── BELL BADGE DISMISS ───────────────────────── */
  const bellBtn = document.getElementById('bellBtn');

  bellBtn?.addEventListener('click', () => {
    const badge = bellBtn.querySelector('.bell-badge');
    if (badge) {
      badge.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      badge.style.transform  = 'scale(0)';
      badge.style.opacity    = '0';
    }
  });

  /* ── TOURNAMENT ROW CLICKS ────────────────────── */
  /* Stub — wire to a detail page or modal when ready */
  document.querySelectorAll('.trn-row, .trn-row-cta').forEach((el) => {
    el.addEventListener('click', (e) => {
      const row = el.closest('.trn-row') || el;
      const id  = row.dataset.id;
      /* Future: window.location.href = `./tournament-detail.html?id=${id}`; */
      console.log('[Tournament] clicked id:', id);
    });
  });

  /* ── KEYBOARD SHORTCUT: Ctrl/Cmd+K → search ──── */
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    }
  });

})();