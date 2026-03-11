// ============================================================
// CURIO — auth.js
// Login & Register modal open/close, particle animation
// (No backend — UI only for now)
// ============================================================

/* ── Spawn floating particles in modal header ─────── */
function spawnParticles(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('div');
    p.className = 'auth-particle';
    const size = 18 + Math.random() * 56;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${3 + Math.random() * 4}s;
      animation-delay:${Math.random() * 3}s;
    `;
    c.appendChild(p);
  }
}

/* ── Open modal ───────────────────────────────────── */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Spawn particles in whichever header exists
  spawnParticles(id === 'loginOverlay' ? 'loginParticles' : 'regParticles');
}

/* ── Close modal ──────────────────────────────────── */
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Switch between login / register ─────────────── */
function switchToRegister() {
  closeModal('loginOverlay');
  setTimeout(() => openModal('registerOverlay'), 80);
}

function switchToLogin() {
  closeModal('registerOverlay');
  setTimeout(() => openModal('loginOverlay'), 80);
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Open triggers
  document.querySelectorAll('[data-open-login]').forEach(el =>
    el.addEventListener('click', () => openModal('loginOverlay'))
  );
  document.querySelectorAll('[data-open-register]').forEach(el =>
    el.addEventListener('click', () => openModal('registerOverlay'))
  );

  // Close on backdrop click
  ['loginOverlay','registerOverlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) closeModal(id);
    });
  });

  // ESC key closes any open modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['loginOverlay','registerOverlay'].forEach(closeModal);
      closeArticle?.();
      closeQuiz?.();
    }
  });

  // Form submit (UI only — will connect to backend later)
  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    closeModal('loginOverlay');
    // TODO: POST /api/auth/login
  });

  document.getElementById('registerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    closeModal('registerOverlay');
    // TODO: POST /api/auth/register
  });
});
