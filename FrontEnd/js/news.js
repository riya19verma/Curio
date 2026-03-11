
// Top-10 slider, article modal, show-more, category filter

/* ── News data (mock — replace with API later) ───── */
const NEWS = [
  { id:1,  emoji:'🌏', cat:'World',         title:'UN Summit Reaches Historic Climate Agreement Limiting 1.5°C Rise',            snippet:'World leaders gathered in Geneva signed a landmark accord pledging net-zero emissions by 2040, backed by a $500 billion fund for developing nations.',                                               source:'Reuters',         time:'2h ago', score:96 },
  { id:2,  emoji:'🚀', cat:'Science',       title:'SpaceX Starship Completes First Successful Orbital Test Flight',              snippet:"Elon Musk's Starship completed a full orbital flight and landed back at the launch site, marking a pivotal milestone in deep-space exploration history.",                                       source:'BBC Science',     time:'4h ago', score:98 },
  { id:3,  emoji:'💰', cat:'Business',      title:'RBI Cuts Repo Rate by 25 Basis Points Amid Growth Push',                     snippet:'The Reserve Bank of India reduced its benchmark rate to 6.25%, signaling a shift toward accommodative monetary policy to support GDP growth.',                                               source:'Economic Times',  time:'5h ago', score:95 },
  { id:4,  emoji:'🏆', cat:'Sports',        title:'India Wins Test Series Against Australia 3-1 in Thrilling Final Test',        snippet:'Team India secured a historic series victory on Australian soil for only the second time, with Jasprit Bumrah taking 7 wickets in the decider.',                                           source:'ESPNCricinfo',    time:'6h ago', score:99 },
  { id:5,  emoji:'🤖', cat:'Technology',    title:'OpenAI Releases GPT-5 with Advanced Reasoning and Autonomous Tool Use',      snippet:'The new flagship model reportedly scores in the 95th percentile on bar exams and can autonomously browse, code, and write long-form research.',                                               source:'The Verge',       time:'7h ago', score:91 },
  { id:6,  emoji:'🏛️', cat:'Politics',      title:'Parliament Passes Digital India Bill 2025 with Sweeping Tech Reforms',       snippet:'The bill introduces new regulations for big tech companies, data localization requirements, national digital ID for citizens, and a cybersecurity framework.',                               source:'NDTV',            time:'8h ago', score:93 },
  { id:7,  emoji:'🌱', cat:'Environment',   title:'India Achieves 500GW Renewable Energy Milestone Ahead of Schedule',          snippet:'India became only the fourth nation to cross the 500GW renewable mark, with solar contributing 280GW and wind energy accounting for 150GW of capacity.',                                   source:'Mint',            time:'10h ago',score:97 },
  { id:8,  emoji:'🎓', cat:'Education',     title:'NEP 2025 Implementation Begins Across 22 Indian States Simultaneously',      snippet:'The National Education Policy rollout includes multilingual textbooks, coding from Class 3, and a new 5+3+3+4 school structure replacing the older 10+2 framework.',                    source:'Times of India',  time:'12h ago',score:92 },
  { id:9,  emoji:'💊', cat:'Health',        title:'WHO Places New Respiratory Strain Under Heightened Global Observation',       snippet:'Health officials are monitoring a novel influenza sub-variant detected in three countries, urging hospitals worldwide to increase their surveillance capacity.',                              source:'WHO / AFP',       time:'14h ago',score:88 },
  { id:10, emoji:'🎬', cat:'Entertainment', title:'Bollywood Crosses ₹5000 Crore Box Office Record — Most Profitable Year',     snippet:"India's film industry registered its most profitable year ever, with three films crossing ₹1000 crore globally and digital streaming rights soaring to new highs.",                    source:'Bollywood Hungama',time:'1d ago', score:94 },
];

/* ── Validity color helper ───────────────────────── */
function validColor(score) {
  return score >= 90 ? 'var(--valid-high)' : score >= 70 ? 'var(--valid-mid)' : 'var(--valid-low)';
}

/* ── Build Top-10 slider cards ───────────────────── */
function buildSlider() {
  const track = document.getElementById('sliderTrack');
  if (!track) return;
  track.innerHTML = NEWS.map(n => `
    <article class="news-card" data-id="${n.id}" role="button" tabindex="0" aria-label="${n.title}">
      <div class="card-thumb">${n.emoji}</div>
      <div class="card-body">
        <div class="card-cat">${n.cat}</div>
        <h3 class="card-title">${n.title}</h3>
      </div>
    </article>
  `).join('');

  track.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => openArticle(+card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openArticle(+card.dataset.id); });
  });
}

/* ── Slider navigation ───────────────────────────── */
let sliderOffset = 0;
const CARD_W = 224; // 210 + 14 gap

function slideNews(dir) {
  const track = document.getElementById('sliderTrack');
  if (!track) return;
  const maxOffset = (NEWS.length - 4) * CARD_W;
  sliderOffset = Math.max(0, Math.min(sliderOffset + dir * CARD_W * 2, maxOffset));
  track.style.transform = `translateX(-${sliderOffset}px)`;
}

/* ── Build headlines list ────────────────────────── */
let visibleCount = 5;

function buildHeadlines(data, append = false) {
  const container = document.getElementById('headlinesContainer');
  if (!container) return;
  if (!append) container.innerHTML = '';

  data.forEach(n => {
    const color = validColor(n.score);
    const item = document.createElement('article');
    item.className = 'headline-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('data-id', n.id);
    item.innerHTML = `
      <div class="hl-thumb">${n.emoji}</div>
      <div class="hl-info">
        <div class="hl-meta">
          <span class="hl-cat">${n.cat}</span>
          <span class="hl-time">${n.time} · ${n.source}</span>
        </div>
        <h3 class="hl-title">${n.title}</h3>
        <p class="hl-snip">${n.snippet}</p>
      </div>
      <div class="validity-badge" aria-label="ML validity score ${n.score}%">
        <span class="vb-label">ML Score</span>
        <div class="vb-bar"><div class="vb-fill" style="width:${n.score}%;background:${color}"></div></div>
        <span class="vb-score" style="color:${color}">${n.score}%</span>
      </div>
    `;
    item.addEventListener('click', () => openArticle(n.id));
    item.addEventListener('keydown', e => { if (e.key === 'Enter') openArticle(n.id); });
    container.appendChild(item);
  });
}

function loadMoreNews() {
  const next = NEWS.slice(visibleCount, visibleCount + 3);
  buildHeadlines(next, true);
  visibleCount += next.length;
  const btn = document.getElementById('showMoreBtn');
  if (visibleCount >= NEWS.length && btn) {
    btn.textContent = '✓ You\'re all caught up';
    btn.disabled = true;
    btn.style.opacity = '.5';
    btn.style.cursor = 'default';
  }
}

/* ── Category filter ─────────────────────────────── */
function initCategories() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      const filtered = cat === 'All' ? NEWS : NEWS.filter(n => n.cat === cat);
      visibleCount = filtered.length;
      buildHeadlines(filtered);
      const showMoreBtn = document.getElementById('showMoreBtn');
      if (showMoreBtn) { showMoreBtn.style.display = filtered.length >= NEWS.length ? 'none' : 'flex'; }
    });
  });
}

/* ── Article modal ───────────────────────────────── */
function openArticle(id) {
  const n = NEWS.find(x => x.id === id);
  if (!n) return;
  const color = validColor(n.score);
  document.getElementById('articleEmoji').textContent   = n.emoji;
  document.getElementById('articleCat').textContent     = n.cat.toUpperCase();
  document.getElementById('articleTitle').textContent   = n.title;
  document.getElementById('articleSource').textContent  = n.source;
  document.getElementById('articleTime').textContent    = n.time;
  document.getElementById('articleScore').textContent   = `✅ ML Validity: ${n.score}%`;
  document.getElementById('articleScore').style.color   = color;
  document.getElementById('articleBody').textContent    = n.snippet;
  document.getElementById('articleModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeArticle() {
  document.getElementById('articleModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildSlider();
  buildHeadlines(NEWS.slice(0, visibleCount));
  initCategories();

  document.getElementById('slidePrev')?.addEventListener('click', () => slideNews(-1));
  document.getElementById('slideNext')?.addEventListener('click', () => slideNews(1));
  document.getElementById('showMoreBtn')?.addEventListener('click', loadMoreNews);

  // Close article on backdrop
  document.getElementById('articleModal')?.addEventListener('click', e => {
    if (e.target.id === 'articleModal') closeArticle();
  });
});
