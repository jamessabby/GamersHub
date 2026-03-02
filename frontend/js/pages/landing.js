/* ── NAVBAR ── */
.gh-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
  padding-bottom: 10px;
}

.gh-nav-links {
  list-style: none;
}

.gh-nav-link {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s;
}

.gh-nav-link:hover {
  color: #a78bfa;
}

.gh-nav-link.active {
  color: #a78bfa;
}

/* ── HERO ── */
.gh-hero {
  padding-top: 80px; /* offset fixed navbar */
}

.gh-hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 640px;
  width: 100%;
  padding: 0 16px;
}

.gh-hero-logo {
  width: 236px;
  height: auto;
  object-fit: contain;
  margin-bottom: 28px;
}

.gh-headline {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 14px;
  line-height: 1.3;
}

.gh-subtext {
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.6;
  max-width: 480px;
  margin-bottom: 0;
}

/* ── BUTTONS ── */
.gh-btn-primary {
  background-color: #9b7bff;
  color: #000000;
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.gh-btn-primary:hover {
  background-color: #8060f0;
}

.gh-btn-secondary {
  background-color: transparent;
  color: #ffffff;
  border: 1.5px solid #ffffff;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.gh-btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.08);
}