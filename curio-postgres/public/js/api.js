/* ══ Curio API Client ══ */

const API = '/api';

// ── Verify News API ───────────────────────
async function verifyNews() {
  const input = document.querySelector('.hero-input');
  const url = input.value.trim();
  if (!url) { alert('Please enter a news URL or headline.'); return; }

  const btn = document.querySelector('.hero-form-btn');
  btn.textContent = 'Checking…';
  btn.disabled = true;

  try {
    const result = await fetch(`http://localhost:3000/api/analyze-url/analyze-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await result.json();
    const { title, scores } = data.data;
    displayVerifyResult(title, scores, url);
  } catch (err) {
    alert('Failed to analyze URL. Make sure the backend is running.');
    console.error(err);
  } finally {
    btn.textContent = 'Verify Now';
    btn.disabled = false;
  }
}

function displayVerifyResult(title, scores, url) {
  let panel = document.getElementById('verify-result-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'verify-result-panel';
    document.querySelector('.hero-form').insertAdjacentElement('afterend', panel);
  }

  const total = scores.total_score;
  const label = total >= 70 ? 'Likely Real' : total >= 50 ? 'Uncertain' : 'Likely Fake';
  const color = total >= 70 ? '#2dcc72' : total >= 50 ? '#f5d842' : '#e8453c';
  const textColor = total >= 50 && total < 70 ? '#7a5c00' : '#fff';

  panel.innerHTML = `
    <div style="
      background: var(--white, #fff);
      border: 1.5px solid var(--border, rgba(15,21,18,.1));
      border-radius: 20px;
      padding: 28px 32px;
      max-width: 520px;
      margin: 20px auto 0;
      box-shadow: 0 8px 32px rgba(15,21,18,.09);
      text-align: left;
    ">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
        <div style="
          background:${color};
          color:${textColor};
          font-family:'Anton',sans-serif;
          font-size:.72rem;
          letter-spacing:.14em;
          text-transform:uppercase;
          padding:5px 14px;
          border-radius:999px;
          flex-shrink:0;
        ">${label}</div>
        <div style="font-size:.82rem;color:rgba(15,21,18,.45);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <a href="${url}" target="_blank" style="color:inherit;">${url}</a>
        </div>
      </div>

      <div style="font-family:'Anton',sans-serif;font-size:1.05rem;color:#0f1512;margin-bottom:20px;line-height:1.3;">
        ${title || 'Article analyzed'}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        ${scoreCard('Credibility', scores.fake_score, '#2dcc72')}
        ${scoreCard('Clickbait', scores.clickbait_score, '#e8453c')}
        ${scoreCard('Source', scores.source_score, '#378add')}
        ${scoreCard('Overall', total / 100, color)}
      </div>

      <div style="background:rgba(15,21,18,.04);border-radius:10px;padding:12px 16px;">
        <div style="font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(15,21,18,.4);margin-bottom:6px;">Overall Score</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="flex:1;height:8px;background:rgba(15,21,18,.08);border-radius:4px;overflow:hidden;">
            <div style="width:${total}%;height:100%;background:${color};border-radius:4px;transition:width 1s ease;"></div>
          </div>
          <div style="font-family:'Anton',sans-serif;font-size:1.3rem;color:#0f1512;">${Math.round(total)}</div>
        </div>
      </div>
    </div>
  `;

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function scoreCard(label, value, color) {
  const pct = Math.round(value * 100);
  return `
    <div style="background:rgba(15,21,18,.03);border-radius:10px;padding:12px 14px;">
      <div style="font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:rgba(15,21,18,.4);margin-bottom:6px;">${label}</div>
      <div style="font-family:'Anton',sans-serif;font-size:1.5rem;color:#0f1512;">${pct}%</div>
      <div style="height:4px;background:rgba(15,21,18,.08);border-radius:2px;margin-top:6px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;"></div>
      </div>
    </div>
  `;
}

// ── Click tracking ────────────────────────────────────────────
/**
 * Log a click for a real news article (one that lives in the DB, i.e.
 * has a UUID nid).  Safe to call even when not logged in — it will
 * silently skip.
 *
 * @param {string} nid  — UUID from the news table
 */
async function logClick(nid) {
  const token = getToken();
  if (!token || !nid) return; // not logged in, or no real nid — skip silently

  try {
    await fetch(`/api/news/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nid })
    });
  } catch (err) {
    // Non-critical — swallow errors so the article still opens
    console.warn('Click log failed:', err.message);
  }
}

/**
 * On page load: send all accumulated clicks to the BackEnd so it can
 * update the user's interest embedding, then clear those clicks.
 * Fire-and-forget — failures are logged but don't block the page.
 */
async function flushClicks() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/news/flush-clicks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.flushed > 0) {
      console.log(`[Curio] Flushed ${data.flushed} click(s) → embedding updated`);
    }
  } catch (err) {
    console.warn('Flush-clicks failed:', err.message);
  }
}

// For News Headlines
const EMOJI_BY_SOURCE = {
  'Reuters': '🌍', 'BBC News': '📺', 'CNN': '📡',
  'AP News': '📰', 'Bloomberg': '💹', 'TechCrunch': '💻',
  'ESPN': '🏅', 'NASA': '🚀', 'default': '📰'
};

function getEmoji(source) {
  return EMOJI_BY_SOURCE[source] || EMOJI_BY_SOURCE['default'];
}

async function loadHeadlines() {
  const track = document.getElementById('newsSliderTrack');
  const dotsWrap = document.getElementById('sliderDots');
  if (!track) return;

  // Skeleton loading state
  track.innerHTML = Array(4).fill(`
    <article class="news-card" style="opacity:.4;pointer-events:none;">
      <div class="news-card-img" style="background:#eee;"></div>
      <div class="news-card-body">
        <div style="height:10px;background:#eee;border-radius:4px;margin-bottom:8px;width:60%"></div>
        <div style="height:14px;background:#eee;border-radius:4px;margin-bottom:6px;"></div>
        <div style="height:14px;background:#eee;border-radius:4px;width:80%"></div>
      </div>
    </article>
  `).join('');

  // Hide static dummy rows if user is logged in
  document.querySelectorAll('#news-list .news-row, #news-list .hidden-row').forEach(row => {
    row.style.display = 'none';
  });
  document.getElementById('showMoreBtn')?.closest('.show-more-wrap').style.setProperty('display', 'none');

  try {
    console.log('Fetching headlines from API...');
    const res = await fetch('/api/news/headlines', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    track.innerHTML = data.headlines.map(item => `
      <article class="news-card"
        data-nid="${item.nid || ''}"
        style="cursor:pointer;"
        onclick="handleNewsCardClick(event, '${item.url}', '${item.nid || ''}')">
        <div class="news-card-img" style="${item.image ? `background-image:url('${item.image}');background-size:cover;background-position:center;` : ''}">
          ${!item.image ? `<span>${getEmoji(item.source)}</span>` : ''}
          <div class="news-card-img-gradient"></div>
          <div class="news-card-rank">#${item.rank}</div>
        </div>
        <div class="news-card-body">
          <div class="news-card-source">${item.source}</div>
          <div class="news-card-title">${item.title}</div>
          <div class="news-card-score" style="justify-content:flex-end;">
            <div class="score-val" style="font-size:.7rem;color:rgba(15,21,18,.4);">
              ${new Date(item.publishedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
            </div>
          </div>
        </div>
      </article>
    `).join('');

    // Rebuild dots now that real cards exist
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      data.headlines.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'slider-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => goToSlide(i));
        dotsWrap.appendChild(d);
      });
    }

  } catch (err) {
    console.error('Headlines error:', err);
    track.innerHTML = `
      <div style="padding:2rem;color:rgba(15,21,18,.4);font-size:.88rem;">
        Could not load headlines. ${err.message || ''}
      </div>`;
  }
}

/**
 * Unified click handler for news cards.
 * Logs the click (if nid is a real UUID) then opens the article.
 *
 * @param {Event}  event
 * @param {string} url   — article URL to open
 * @param {string} nid   — UUID from the news table (empty string for dummy news)
 */
function handleNewsCardClick(event, url, nid) {
  // Log asynchronously — don't await so the article opens immediately
  if (nid) logClick(nid);
  window.open(url, '_blank');
}
window.handleNewsCardClick = handleNewsCardClick;

// ── Recommendations ───────────────────────────────────────────
async function loadRecommendations() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return;

  const container = document.getElementById('newsCardGrid');
  if (!container) return;

  // skeleton — match news-row layout
  container.innerHTML = Array(5).fill(`
    <div class="news-row" style="opacity:.35;pointer-events:none;">
      <div class="news-row-img" style="background:var(--f8-2);border-radius:var(--radius-sm);"></div>
      <div class="news-row-content">
        <div style="height:9px;background:var(--f8-2);border-radius:4px;width:35%;margin-bottom:10px;"></div>
        <div style="height:13px;background:var(--f8-2);border-radius:4px;margin-bottom:7px;"></div>
        <div style="height:11px;background:var(--f8-2);border-radius:4px;width:65%;"></div>
      </div>
    </div>
  `).join('');

  try {
    const res = await fetch('/api/news/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Error ${res.status}`);
    }

    const data = await res.json();
    const news = data.data;

    if (!news || news.length === 0) {
      container.innerHTML = `
        <div style="padding:2rem 0;text-align:center;">
          <div style="font-size:2rem;margin-bottom:12px;">📭</div>
          <div style="font-size:.92rem;color:var(--text-muted);">No recommendations yet.</div>
          <div style="font-size:.82rem;color:var(--text-muted);margin-top:4px;">
            Read some articles to personalise your feed.
          </div>
        </div>`;
      return;
    }

    container.style.display = 'block';
    container.innerHTML = news.map(item => {
      const timeAgo = item.published_at
        ? new Date(item.published_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
        : '';
      const source = item.source || item.s_name || 'Unknown';
      const nid = item.nid || '';

      return `
        <article class="news-row"
          style="cursor:pointer;"
          onclick="handleNewsCardClick(event, '${item.url}', '${nid}')">
          <div class="news-row-img">📰</div>
          <div class="news-row-content">
            <div class="news-row-meta">
              <span class="news-row-source">${source}</span>
              <span class="news-row-dot"></span>
              <span class="news-row-time">${timeAgo}</span>
            </div>
            <div class="news-row-title">${item.title}</div>
          </div>
          <div class="news-row-validity">
            <span style="
              font-size:.68rem;font-weight:700;letter-spacing:.06em;
              text-transform:uppercase;padding:4px 10px;
              border-radius:var(--radius-pill);
              background:var(--f8);color:var(--text-muted);
            ">For You</span>
          </div>
        </article>
      `;
    }).join('');

    // hide static dummy rows + show more button
    document.querySelectorAll('#news-list .news-row:not(#newsCardGrid .news-row), #news-list .hidden-row')
      .forEach(row => row.style.display = 'none');
    document.querySelector('.show-more-wrap')?.style.setProperty('display', 'none');

  } catch (err) {
    console.error('Recommendation error:', err);
    container.style.display = 'block';
    container.innerHTML = `
      <div style="padding:1.5rem 0;display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.2rem;">⚠️</span>
        <span style="font-size:.88rem;color:var(--text-muted);">
          Could not load recommendations — ${err.message}
        </span>
      </div>`;
  }
}

// ── Auth helpers ──────────────────────────────────────────────
function getToken() { return localStorage.getItem('curio_token'); }
function setToken(t) { localStorage.setItem('curio_token', t); }
function getUser()  { const u = localStorage.getItem('curio_user'); return u ? JSON.parse(u) : null; }
function setUser(u) { localStorage.setItem('curio_user', JSON.stringify(u)); }
function clearAuth() { localStorage.removeItem('curio_token'); localStorage.removeItem('curio_user'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Auth API ──────────────────────────────────────────────────
async function apiLogin(email, password) {
  const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(data.token); setUser(data.user);
  return data.user;
}

async function apiRegister(fields) {
  const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
  setToken(data.token); setUser(data.user);
  return data.user;
}

function apiLogout() {
  clearAuth();
  const container = document.getElementById('newsCardGrid');
  if (container) container.innerHTML = '';
  updateAuthUI();
}

// ── News API ──────────────────────────────────────────────────
async function fetchNews(category = 'All', page = 1, limit = 6) {
  return apiFetch(`/news?category=${category}&page=${page}&limit=${limit}`);
}

async function fetchCategories() { return apiFetch('/news/categories'); }

async function bookmarkNews(id) {
  if (!getToken()) { openLogin('login'); return; }
  return apiFetch(`/news/bookmark/${id}`, { method: 'POST' });
}

// ── UI: Update nav based on auth state ────────────────────────
function updateAuthUI() {
  const user = getUser();
  const loginBtn  = document.querySelector('.btn-login');
  const ctaBtn    = document.querySelector('.btn-nav-cta');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    if (loginBtn)  loginBtn.textContent = user.name.split(' ')[0];
    if (ctaBtn)    ctaBtn.style.display = 'none';
    if (logoutBtn) { logoutBtn.style.display = 'inline-flex'; logoutBtn.onclick = apiLogout; }
    document.querySelectorAll('#news-list .news-row, #news-list .hidden-row')
      .forEach(row => row.style.display = 'none');
    document.querySelector('.show-more-wrap')?.style.setProperty('display', 'none');

    const toast = document.getElementById('authToast');
    if (toast && !sessionStorage.getItem('welcomed')) {
      toast.textContent = `Welcome back, ${user.name.split(' ')[0]}! 👋`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
      sessionStorage.setItem('welcomed', '1');
    }
  } else {
    if (loginBtn)  loginBtn.textContent = 'Login';
    if (ctaBtn)    ctaBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    document.querySelectorAll('#news-list .news-row')
      .forEach(row => row.style.display = '');
    document.querySelector('.show-more-wrap')?.style.setProperty('display', '');
  }
}

// ── UI: Load real news into news section ──────────────────────
let currentPage = 1;
let currentCategory = 'All';

function validityLabel(v) {
  if (v >= 80) return { text: 'Verified ✓', cls: 'valid-high' };
  if (v >= 50) return { text: 'Uncertain', cls: 'valid-mid' };
  return { text: 'Likely False ✗', cls: 'valid-low' };
}

// ── Ask Curio AI (from news cards or suggestion chips) ────────
function askCurio(question) {
  const chatWindow  = document.getElementById('chatbotWindow');
  const chatTrigger = document.getElementById('chatbotTrigger');
  if (chatWindow)  chatWindow.classList.add('open');
  if (chatTrigger) chatTrigger.style.display = 'none';

  const chatInput = document.getElementById('chatInput');
  const chatSend  = document.getElementById('chatSend');
  if (chatInput) {
    chatInput.value = question;
    chatInput.focus();
    chatSend?.click();
  }
}
window.askCurio = askCurio;

function renderNewsCards(news, container, append = false) {
  if (!append) container.innerHTML = '';
  news.forEach(item => {
    const { text, cls } = validityLabel(item.validity);
    const nid = item.nid || item.id || '';
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-card-img" style="background-image:url('${item.image}')">
        <span class="news-validity ${cls}">${text}</span>
      </div>
      <div class="news-card-body">
        <span class="news-cat-tag">${item.category}</span>
        <h3 class="news-card-title">${item.title}</h3>
        <p class="news-card-summary">${item.summary}</p>
        <div class="news-card-meta">
          <span>${item.source}</span>
          <div style="display:flex;gap:.5rem;align-items:center">
            <button class="btn-summarize"
              onclick="askCurio('Summarize this article: ${item.title.replace(/'/g, "\\'")} ')"
              title="Ask AI to summarize">✨ Summarize</button>
            <button class="btn-bookmark" onclick="bookmarkNews('${item.id}')" title="Bookmark">🔖</button>
          </div>
        </div>
      </div>`;

    // Log click when card is opened
    card.addEventListener('click', (e) => {
      // Don't double-fire if a button inside the card was clicked
      if (e.target.closest('button')) return;
      if (nid) logClick(nid);
      window.open(item.url, '_blank');
    });

    container.appendChild(card);
  });
}

async function loadNews(append = false) {
  const container = document.getElementById('newsCardGrid') || document.querySelector('.news-grid');
  if (!container) return;
  try {
    const { news } = await fetchNews(currentCategory, currentPage);
    renderNewsCards(news, container, append);
  } catch (e) { console.error('News load error:', e); }
}

async function loadCategories() {
  const bar = document.getElementById('newsCategoryBar') || document.querySelector('.category-bar');
  if (!bar) return;
  try {
    const cats = await fetchCategories();
    bar.innerHTML = cats.map(c =>
      `<button class="cat-btn${c === currentCategory ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    bar.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.cat;
        currentPage = 1;
        bar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadNews();
      });
    });
  } catch (e) { console.error('Category load error:', e); }
}

// ── Login/Register form wiring ────────────────────────────────
function wireAuthForms() {
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginErr     = document.getElementById('loginError');
  const regErr       = document.getElementById('registerError');

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = loginForm.querySelector('[name=email]')?.value || loginForm.querySelector('#loginEmail')?.value;
      const password = loginForm.querySelector('[name=password]')?.value || loginForm.querySelector('#loginPassword')?.value;
      const btn = loginForm.querySelector('button[type=submit], .btn-login-submit');
      btn && (btn.textContent = 'Logging in…');
      try {
        await apiLogin(email, password);
        updateAuthUI();
        closeLogin();
      } catch (err) {
        if (loginErr) { loginErr.textContent = err.message; loginErr.style.display = 'block'; }
        else alert(err.message);
      } finally { btn && (btn.textContent = 'Login to Curio'); }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name     = registerForm.querySelector('[name=name]')?.value || registerForm.querySelector('#regName')?.value;
      const email    = registerForm.querySelector('[name=email]')?.value || registerForm.querySelector('#regEmail')?.value;
      const password = registerForm.querySelector('[name=password]')?.value || registerForm.querySelector('#regPassword')?.value;
      const phone    = registerForm.querySelector('[name=phone]')?.value || '';
      const btn = registerForm.querySelector('button[type=submit], .btn-login-submit');
      btn && (btn.textContent = 'Creating account…');
      try {
        await apiRegister({ name, email, password, phone });
        updateAuthUI();
        closeLogin();
      } catch (err) {
        if (regErr) { regErr.textContent = err.message; regErr.style.display = 'block'; }
        else alert(err.message);
      } finally { btn && (btn.textContent = 'Create Account'); }
    });
  }
}

// ── Chatbot: wire Gemini call ─────────────────────────────────
function wireChatbot() {
  const chatInput = document.getElementById('chatInput');
  const chatSend  = document.getElementById('chatSend');
  const chatMsgs  = document.getElementById('chatMessages');
  if (!chatMsgs) return;

  let chatHistory = [];

  function addMsg(text, cls) {
    const d = document.createElement('div');
    d.className = `chat-msg ${cls}`;
    d.textContent = text;
    chatMsgs.appendChild(d);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return d;
  }

  function setInputState(disabled) {
    if (chatInput) chatInput.disabled  = disabled;
    if (chatSend)  chatSend.disabled   = disabled;
  }

  async function sendMessage() {
    const text = chatInput?.value.trim();
    if (!text) return;

    chatInput.value = '';
    addMsg(text, 'user');
    const loadingEl = addMsg('Thinking…', 'bot loading');
    setInputState(true);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history: chatHistory }),
      });

      const data = await res.json();
      loadingEl.remove();

      if (!res.ok) {
        addMsg(data.message || 'Something went wrong. Please try again.', 'bot error');
        return;
      }

      addMsg(data.reply, 'bot');
      chatHistory = data.history || [];

    } catch {
      loadingEl.remove();
      addMsg('Could not reach the server. Please check your connection.', 'bot error');
    } finally {
      setInputState(false);
      chatInput?.focus();
    }
  }

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });
}

// ── Google OAuth token pickup ─────────────────────────────────
function showToast(msg, duration = 4000) {
  const toast = document.getElementById('authToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function pickupOAuthToken() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const error  = params.get('error');

  if (token) {
    setToken(token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: payload.id, name: payload.name, email: payload.email });
    } catch {}
    window.history.replaceState({}, '', '/');
    updateAuthUI();
  }

  if (error) {
    window.history.replaceState({}, '', '/');
    const msgs = {
      oauth_not_configured: 'Google sign-in is not set up yet. Please use email/password.',
      oauth_failed:         'Google sign-in failed. Please try again or use email/password.',
    };
    showToast(msgs[error] || 'Sign-in error. Please try again.');
    openLogin('login');
  }
}

async function checkOAuthStatus() {
  try {
    const res  = await fetch('/api/auth/status');
    const data = await res.json();
    if (!data.googleOAuth) {
      document.querySelectorAll('#btnGoogleLogin, #btnGoogleRegister').forEach(btn => {
        btn.disabled = true;
        btn.title    = 'Google sign-in is not configured on this server';
        btn.style.opacity = '0.45';
        btn.style.cursor  = 'not-allowed';
        btn.onclick = (e) => {
          e.preventDefault();
          showToast('Google sign-in is not set up yet. Use email/password instead.');
        };
      });
    }
  } catch {
    // Server not reachable — leave buttons as-is
  }
}

const UpdateRecommendations = async () => {
  const token = getToken();
  if (!token) return;
  await fetch('http://localhost:3000/api/recommendation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uid: getUser()?.id })
  });
};

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  pickupOAuthToken();
  updateAuthUI();
  wireAuthForms();
  wireChatbot();
  checkOAuthStatus();
  loadCategories();
  loadNews();
  loadHeadlines();

  // Only run logged-in operations if there is a token
  if (getToken()) {
    // 1. Flush clicks from the previous session → updates user embedding
    flushClicks();
    // 2. Refresh recommendation cache on the BackEnd
    UpdateRecommendations();
    // 3. Load personalised feed
    loadRecommendations();
  }

  // Show More button
  const showMore = document.getElementById('showMoreBtn');
  if (showMore) {
    showMore.addEventListener('click', () => {
      currentPage++;
      loadNews(true);
    });
  }
});