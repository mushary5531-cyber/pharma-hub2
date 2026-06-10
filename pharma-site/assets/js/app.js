// ===== PHARMA MEMORY HUB — Main App =====

let allLectures = [];
let activeFilters = new Set(['mid1', 'mid2', 'final']);
let searchQuery = '';

// ===== INIT =====
async function init() {
  const res = await fetch('data/index.json');
  const data = await res.json();
  allLectures = data.lectures;
  renderAll();
  updateStats();
  updateSRS();
}

// Fetch all lecture cards once, compute due counts & maturity, update banner + cards
async function updateSRS() {
  if (typeof SRS === 'undefined') return;
  try {
    const sets = await Promise.all(allLectures.map(async l => {
      try {
        const r = await fetch(`data/${l.exam}/${l.slug}.json`);
        const d = await r.json();
        return { id: l.id, cards: d.flashcards || [] };
      } catch { return { id: l.id, cards: [] }; }
    }));
    let seenDue = 0, fresh = 0;
    sets.forEach(s => {
      const st = SRS.lectureStats(s.id, s.cards);
      (s.cards || []).forEach(c => {
        const cs = SRS.get(s.id, c.front);
        if (!cs) fresh++;
        else if (cs.due <= Date.now()) seenDue++;
      });
      // update card pct to reflect maturity when the user has started SRS
      const el = document.querySelector(`a.lecture-card[href="lecture.html?id=${s.id}"] .progress-fill`);
      const stat = document.querySelector(`a.lecture-card[href="lecture.html?id=${s.id}"] .card-status`);
      if (el && st.seen > 0 && st.total > 0) {
        const pct = Math.round((st.mature / st.total) * 100);
        el.style.width = pct + '%';
        if (stat && !stat.classList.contains('done')) stat.textContent = pct + '%';
      }
    });
    const banner = document.getElementById('dueBanner');
    if (banner && (seenDue + fresh) > 0) {
      const txt = seenDue > 0
        ? `🔁 ${seenDue} بطاقة مستحقة للمراجعة اليوم`
        : `🔁 ابدأ المراجعة — ${fresh} بطاقة جديدة جاهزة`;
      document.getElementById('dueBannerText').textContent = txt;
      banner.style.display = 'flex';
    }
  } catch {}
}

// ===== RENDER =====
function renderAll() {
  const q = searchQuery.toLowerCase();

  const filtered = allLectures.filter(l => {
    const examMatch = activeFilters.has(l.exam);
    const textMatch = !q ||
      l.title.toLowerCase().includes(q) ||
      l.topics.some(t => t.toLowerCase().includes(q));
    return examMatch && textMatch;
  });

  const byExam = { mid1: [], mid2: [], final: [] };
  filtered.forEach(l => byExam[l.exam]?.push(l));

  ['mid1', 'mid2', 'final'].forEach(exam => {
    const grid = document.getElementById(`grid-${exam}`);
    const countEl = document.getElementById(`count-${exam}`);
    const section = document.getElementById(exam);

    grid.innerHTML = '';
    const lectures = byExam[exam];

    if (lectures.length === 0) {
      section.style.display = 'none';
    } else {
      section.style.display = '';
      countEl.textContent = `${lectures.length} محاضرة`;
      lectures.forEach(l => grid.appendChild(buildCard(l)));
    }
  });

  const totalVisible = Object.values(byExam).reduce((s,a) => s+a.length, 0);
  document.getElementById('emptyState').style.display = totalVisible === 0 ? 'block' : 'none';
}

function buildCard(l) {
  const progress = getProgress(l.id);
  const isDone = progress.done;

  const card = document.createElement('a');
  card.className = `lecture-card ${l.exam}`;
  card.href = `lecture.html?id=${l.id}`;

  const examNum = l.id.split('-')[1];
  const topicsHtml = (l.topics || []).slice(0, 3).map(t =>
    `<span class="topic-tag">${t}</span>`
  ).join('');

  const pct = progress.cards > 0
    ? Math.round((progress.cardsKnown / progress.cards) * 100)
    : 0;

  card.innerHTML = `
    <div class="lecture-num">محاضرة ${parseInt(examNum)}</div>
    <h3>${l.title}</h3>
    <div class="topics">${topicsHtml}</div>
    <div class="card-footer">
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <span class="card-status ${isDone ? 'done' : ''}">${isDone ? '✅' : `${pct}%`}</span>
    </div>
  `;
  return card;
}

// ===== PROGRESS (localStorage) =====
function getProgress(id) {
  try {
    const raw = localStorage.getItem(`ph_${id}`);
    return raw ? JSON.parse(raw) : { done: false, cards: 0, cardsKnown: 0, quizzesDone: 0 };
  } catch { return { done: false, cards: 0, cardsKnown: 0, quizzesDone: 0 }; }
}

function updateStats() {
  const all = allLectures;
  let done = 0, cards = 0, quizzes = 0;
  all.forEach(l => {
    const p = getProgress(l.id);
    if (p.done) done++;
    cards += p.cardsKnown || 0;
    quizzes += p.quizzesDone || 0;
  });
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-cards').textContent = cards;
  document.getElementById('stat-quizzes').textContent = quizzes;
}

// ===== SEARCH =====
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderAll();
});

// ===== FILTERS =====
document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    if (f === 'all') {
      activeFilters = new Set(['mid1', 'mid2', 'final']);
      document.querySelectorAll('.filter-chip').forEach(b => {
        b.classList.toggle('active', b.dataset.filter !== 'all');
      });
    } else {
      btn.classList.toggle('active');
      if (activeFilters.has(f)) activeFilters.delete(f);
      else activeFilters.add(f);
      if (activeFilters.size === 0) activeFilters = new Set(['mid1', 'mid2', 'final']);
    }
    renderAll();
  });
});

// ===== START =====
init();
