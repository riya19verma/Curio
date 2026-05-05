/* ══════════════════════════════════════════════════════════════════
   CATEGORY ONBOARDING
   curio-postgres/public/js/onboarding.js

   Flow:
     1. After register: api.js calls openOnboarding()
     2. User picks 1-8 categories and clicks "Start reading"
     3. POST /api/user/preferences  →  saves to user_preferences
        (port-5000 server then async-calls port-3000 to seed the embedding)
     4. Success screen shown, then overlay closes and feed loads.

   Also called on page load (checkOnboarding) for users who registered
   but closed the browser before finishing.
══════════════════════════════════════════════════════════════════ */

/* ── Category definitions ─────────────────────────────────────── */
const CATEGORIES = [
  { name: 'World',         emoji: '🌍' },
  { name: 'Technology',    emoji: '💻' },
  { name: 'Sports',        emoji: '🏅' },
  { name: 'Business',      emoji: '💹' },
  { name: 'Science',       emoji: '🔬' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Politics',      emoji: '🏛️' },
  { name: 'Environment',   emoji: '🌿' },
];

const MIN_PICKS = 1;
const MAX_PICKS = 8;   // all — user can pick everything

/* ── State ─────────────────────────────────────────────────────── */
let selected = new Set();

/* ── DOM helpers (created once) ────────────────────────────────── */
function buildOverlay() {
  if (document.getElementById('onboarding-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="onboard-panel" id="ob-panel">

      <!-- Progress (2-step: pick → done) -->
      <div class="ob-progress">
        <div class="ob-dot active" id="ob-step1"></div>
        <div class="ob-dot"        id="ob-step2"></div>
      </div>

      <!-- Picker screen -->
      <div id="ob-picker">
        <p class="ob-eyebrow">Step 1 of 2 — Personalise your feed</p>
        <h1 class="ob-headline">What do you<br>care about?</h1>
        <p class="ob-sub">Pick the topics you want to follow. You can change these any time from your profile.</p>

        <div class="ob-grid" id="ob-grid"></div>

        <p class="ob-counter" id="ob-counter">Pick at least 1 topic to continue</p>
        <p class="ob-error"  id="ob-error"></p>

        <button class="ob-btn" id="ob-cta" disabled>
          <span class="btn-label">Start reading →</span>
          <div class="spinner"></div>
        </button>
        <button class="ob-skip" id="ob-skip">Skip for now</button>
      </div>

      <!-- Success screen -->
      <div class="ob-success" id="ob-success">
        <div class="ob-success-icon">🎯</div>
        <div class="ob-success-title">You're all set!</div>
        <p class="ob-success-sub">Your personalised feed is ready. We'll keep learning what you love.</p>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  // Build chip grid
  const grid = document.getElementById('ob-grid');
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'ob-chip';
    chip.dataset.cat = cat.name;
    chip.innerHTML = `
      <div class="ob-chip-tick">
        <svg viewBox="0 0 10 10" fill="none" stroke="var(--charcoal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1.5,5 4,7.5 8.5,2.5"/>
        </svg>
      </div>
      <span class="ob-chip-emoji">${cat.emoji}</span>
      <span class="ob-chip-label">${cat.name}</span>
    `;
    chip.addEventListener('click', () => toggleChip(chip, cat.name));
    grid.appendChild(chip);
  });

  // CTA
  document.getElementById('ob-cta').addEventListener('click', submitPreferences);
  document.getElementById('ob-skip').addEventListener('click', skipOnboarding);
}

/* ── Toggle a chip ──────────────────────────────────────────────── */
function toggleChip(chip, name) {
  if (selected.has(name)) {
    selected.delete(name);
    chip.classList.remove('selected');
  } else {
    if (selected.size >= MAX_PICKS) return; // hard cap
    selected.add(name);
    chip.classList.add('selected');
  }
  updateCounter();
}

function updateCounter() {
  const n      = selected.size;
  const el     = document.getElementById('ob-counter');
  const btn    = document.getElementById('ob-cta');
  const errEl  = document.getElementById('ob-error');

  if (n === 0) {
    el.textContent = 'Pick at least 1 topic to continue';
    el.classList.remove('ready');
  } else if (n === MAX_PICKS) {
    el.textContent = `All ${n} topics selected`;
    el.classList.add('ready');
  } else {
    el.textContent = `${n} topic${n > 1 ? 's' : ''} selected`;
    el.classList.toggle('ready', n >= MIN_PICKS);
  }

  btn.disabled = n < MIN_PICKS;
  errEl.textContent = '';
}

/* ── Submit ─────────────────────────────────────────────────────── */
async function submitPreferences() {
  const btn   = document.getElementById('ob-cta');
  const errEl = document.getElementById('ob-error');
  const token = localStorage.getItem('curio_token');

  if (!token) {
    errEl.textContent = 'Session expired. Please log in again.';
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  errEl.textContent = '';

  try {
    const res  = await fetch('/api/user/preferences', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ categories: [...selected] }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.message || 'Something went wrong. Please try again.';
      return;
    }

    // Show success screen
    document.getElementById('ob-step2').classList.add('active');
    document.getElementById('ob-picker').style.display = 'none';
    document.getElementById('ob-success').classList.add('show');

    // Close after 1.8 s and reload the feed
    setTimeout(() => {
      closeOnboarding();
      // Reload personalised content without a full page refresh
      if (typeof loadRecommendations === 'function') loadRecommendations();
      if (typeof UpdateRecommendations === 'function') UpdateRecommendations();
    }, 1800);

  } catch (err) {
    errEl.textContent = 'Network error — please check your connection.';
    console.error('Onboarding submit error:', err);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = selected.size < MIN_PICKS;
  }
}

/* ── Skip ───────────────────────────────────────────────────────── */
function skipOnboarding() {
  // Mark locally so we don't re-prompt this session
  sessionStorage.setItem('ob_skipped', '1');
  closeOnboarding();
}

/* ── Open / close ───────────────────────────────────────────────── */
function openOnboarding() {
  buildOverlay();
  // Reset state
  selected.clear();
  document.querySelectorAll('.ob-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('ob-picker').style.display  = '';
  document.getElementById('ob-success').classList.remove('show');
  document.getElementById('ob-step2').classList.remove('active');
  document.getElementById('ob-error').textContent = '';
  updateCounter();

  document.getElementById('onboarding-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOnboarding() {
  const el = document.getElementById('onboarding-overlay');
  if (el) el.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Check on page load ─────────────────────────────────────────── */
/**
 * Called from api.js DOMContentLoaded.
 * If the user is logged in but hasn't finished onboarding (and hasn't
 * skipped in this session), show the picker.
 */
async function checkOnboarding() {
  if (sessionStorage.getItem('ob_skipped')) return;

  const token = localStorage.getItem('curio_token');
  if (!token) return;

  try {
    const res  = await fetch('/api/user/onboarding', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return;
    const { done } = await res.json();
    if (!done) openOnboarding();
  } catch {
    // Non-critical — silently skip if server is unreachable
  }
}

/* ── Expose to global scope ─────────────────────────────────────── */
window.openOnboarding  = openOnboarding;
window.closeOnboarding = closeOnboarding;
window.checkOnboarding = checkOnboarding;