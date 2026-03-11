// ============================================================
// CURIO — ui.js
// User dashboard drawer, Chatbot UI, Quiz UI
// Everything is UI-only — no backend connected yet
// ============================================================

/* ============================================================
   USER DASHBOARD DRAWER
   ============================================================ */
function toggleDashboard() {
  const drawer = document.getElementById('userDrawer');
  if (!drawer) return;
  const isOpen = drawer.classList.toggle('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeDashboard() {
  document.getElementById('userDrawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   CHATBOT (UI only — responses are placeholders)
   ============================================================ */
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chatWindow');
  const bubble = document.getElementById('chatBubble');
  if (!win) return;
  win.classList.toggle('open', chatOpen);
  bubble.textContent = chatOpen ? '✕' : '💬';
  if (chatOpen) document.getElementById('chatInput')?.focus();
}

// Placeholder bot responses (replace with API later)
const BOT_REPLIES = [
  "📰 Summary: This article highlights major international developments with potential long-term implications for global policy and trade.",
  "🔍 TL;DR: Key officials reached an agreement after extended deliberations. Experts say the outcome could reshape the sector over the next decade.",
  "📊 In brief: New data reveals a significant trend shift. Analysts project this will influence legislation and public discourse in the near term.",
  "🌐 Quick take: Multiple stakeholders responded with cautious optimism. Independent observers note the agreement still requires parliamentary ratification.",
];
let botReplyIndex = 0;

function sendChat() {
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  if (!input || !messages || !input.value.trim()) return;

  // User bubble
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = input.value;
  messages.appendChild(userMsg);
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Bot reply after short delay
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'chat-msg bot';
    botMsg.textContent = BOT_REPLIES[botReplyIndex % BOT_REPLIES.length];
    botReplyIndex++;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
  }, 900);
}

/* ============================================================
   QUIZ (UI only — questions hardcoded, no scoring saved)
   ============================================================ */
const QUIZ = [
  { q:'Which country hosted the G20 Summit in 2023?',                              opts:['Japan','India','Brazil','USA'],                                             ans:1 },
  { q:'What does "ISRO" stand for?',                                               opts:['Indian Space Research Organization','International Space Rover Observatory','Indian Scientific Research Office','Institute for Space and Robotics'], ans:0 },
  { q:'Chandrayaan-3 successfully landed near which lunar region?',                opts:['North Pole','Equator','South Pole','Mare Tranquillitatis'],                  ans:2 },
  { q:'Which article of the Indian Constitution relates to Right to Education?',   opts:['Article 19','Article 21A','Article 32','Article 44'],                       ans:1 },
  { q:'Which planet was reclassified as a "dwarf planet" in 2006?',                opts:['Mars','Neptune','Pluto','Uranus'],                                           ans:2 },
];

let quizIndex = 0;
let quizAnswered = false;

function openQuiz() {
  quizIndex = 0;
  renderQuestion();
  document.getElementById('quizOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuiz() {
  document.getElementById('quizOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderQuestion() {
  quizAnswered = false;
  const q = QUIZ[quizIndex];
  document.getElementById('quizQNum').textContent  = `Question ${quizIndex + 1} of ${QUIZ.length}`;
  document.getElementById('quizQText').textContent = q.q;
  document.getElementById('quizNextBtn').style.display = 'none';

  const optsEl = document.getElementById('quizOptions');
  optsEl.innerHTML = '';

  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      if (quizAnswered) return;
      quizAnswered = true;
      btn.classList.add(i === q.ans ? 'correct' : 'wrong');
      if (i !== q.ans) optsEl.children[q.ans].classList.add('correct');
      document.getElementById('quizNextBtn').style.display = 'inline-block';
    });
    optsEl.appendChild(btn);
  });
}

function nextQuestion() {
  quizIndex++;
  if (quizIndex >= QUIZ.length) {
    closeQuiz();
    // Could show a score summary later
    return;
  }
  renderQuestion();
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Dashboard
  document.getElementById('avatarBtn')?.addEventListener('click', toggleDashboard);
  document.getElementById('drawerClose')?.addEventListener('click', closeDashboard);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    closeDashboard();
    // TODO: clear auth token, redirect to landing
  });

  // Chatbot
  document.getElementById('chatBubble')?.addEventListener('click', toggleChat);
  document.getElementById('chatCloseBtn')?.addEventListener('click', toggleChat);
  document.getElementById('chatSendBtn')?.addEventListener('click', sendChat);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });

  // Quiz
  document.querySelectorAll('[data-open-quiz]').forEach(el =>
    el.addEventListener('click', openQuiz)
  );
  document.getElementById('quizCloseBtn')?.addEventListener('click', closeQuiz);
  document.getElementById('quizNextBtn')?.addEventListener('click', nextQuestion);
  document.getElementById('quizOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'quizOverlay') closeQuiz();
  });
});
