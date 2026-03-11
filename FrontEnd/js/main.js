// ============================================================
// CURIO — main.js
// Navbar interactions, greeting, breaking news ticker
// ============================================================

/* ── Greeting based on time ──────────────────────── */
function setGreeting() {
  const el = document.getElementById('greetingTime');
  if (!el) return;
  const h = new Date().getHours();
  let msg = h < 12 ? '☀️ Good Morning' : h < 17 ? '🌤️ Good Afternoon' : '🌙 Good Evening';
  el.textContent = msg;
}

/* ── Active nav link highlight ───────────────────── */
function initNavHighlight() {
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    if (link.href === window.location.href) link.style.color = 'var(--brown-deep)';
  });
}

/* ── Scroll: add shadow to navbar ───────────────── */
function initNavScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.boxShadow = window.scrollY > 20 ? '0 4px 24px rgba(44,26,14,.1)' : 'none';
  }, { passive: true });
}

/* ── Smooth scroll for anchor buttons ───────────── */
function initSmoothScroll() {
  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/* ── Intersection Observer: fade-in sections ─────── */
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = 'fadeUp .7s ease both';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.step-card, .headline-item, .news-card').forEach(el => {
    el.style.opacity = '0';
    obs.observe(el);
  });
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  initNavHighlight();
  initNavScroll();
  initSmoothScroll();
  setTimeout(initScrollReveal, 400);
});
